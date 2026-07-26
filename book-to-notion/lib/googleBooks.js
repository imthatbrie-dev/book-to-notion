// Google Books API is free and requires no API key for basic volume searches.
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
  // external images. Also bump zoom for a slightly larger cover.
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
    publishedDate: v.publishedDate || null, // can be "2009", "2009-10", or "2009-10-01"
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

export async function searchBooks(query, { max = 8 } = {}) {
  const url = `${ENDPOINT}?q=${encodeURIComponent(
    query
  )}&maxResults=${max}&printType=books&country=US`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Google Books API error (${res.status})`);
  }
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map(normalizeVolume);
}
