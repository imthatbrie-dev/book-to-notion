require('dotenv').config();

// Google Books API helper.
// Uses GOOGLE_BOOKS_API_KEY when present so requests count against YOUR own
// project quota instead of the shared keyless pool (which gets exhausted
// globally and returns 429/503). No key still works for local testing.
// Docs: https://developers.google.com/books/docs/v1/using

const ENDPOINT = "https://www.googleapis.com/books/v1/volumes";

function pickIsbn(identifiers = []) {
  const byType = (type) =>
    identifiers.find((i) => i.type === type)?.identifier || null;
  // Prefer ISBN-13, fall back to ISBN-10.
  return byType("ISBN_13") || byType("ISBN_10") || null;
}

function httpsImage(url) {
  if (!url) return null;
  // Google sometimes returns http:// thumbnails; Notion requires https for
  // external images. Also drop the page-curl overlay.
  return url.replace(/^http:\/\//i, "https://").replace("&edge=curl", "");
}

function normalizeVolume(item) {
  const v = item.volumeInfo || {};
  const images = v.imageLinks || {};
  return {
    googleId: item.id,
    title: v.title || "Untitled",
    subtitle: v.subtitle || null,
    authors: Array.isArray(v.authors) ? v.authors : [],
    isbn: pickIsbn(v.industryIdentifiers),
    categories: Array.isArray(v.categories) ? v.categories : [],
    publishedDate: v.publishedDate || null, // "2009", "2009-10", or "2009-10-01"
    description: v.description || null,
    pageCount: typeof v.pageCount === "number" ? v.pageCount : null,
    publisher: v.publisher || null,
    language: v.language || null,
    cover: httpsImage(
      images.extraLarge ||
        images.large ||
        images.medium ||
        images.thumbnail ||
        images.smallThumbnail
    ),
    infoLink: v.infoLink || null,
  };
}

// Retry only transient server errors (5xx). A 4xx like 429 (quota) won't fix
// itself on retry, so we fail fast and surface Google's own message.
async function fetchWithRetry(url, { retries = 2 } = {}) {
  let lastStatus;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) return res;

    lastStatus = res.status;
    if (res.status >= 500 && attempt < retries) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }

    let detail = "";
    try {
      const body = await res.json();
      if (body?.error?.message) detail = ` — ${body.error.message}`;
    } catch {
      /* non-JSON error body; ignore */
    }
    throw new Error(`Google Books API error (${res.status})${detail}`);
  }
  throw new Error(`Google Books API error (${lastStatus})`);
}

export async function searchBooks(query, { max = 8 } = {}) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const url =
    `${ENDPOINT}?q=${encodeURIComponent(query)}` +
    `&maxResults=${max}&printType=books&country=US` +
    (key ? `&key=${encodeURIComponent(key)}` : "");

  const res = await fetchWithRetry(url);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map(normalizeVolume);
}
