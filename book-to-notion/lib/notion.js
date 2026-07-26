import { Client } from "@notionhq/client";

const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";

/**
 * Exchange an OAuth authorization code for an access token.
 * Uses plain fetch (well-documented + stable) rather than the SDK's oauth
 * helper so the behavior is predictable across SDK versions.
 */
export async function exchangeCodeForToken({ code, redirectUri }) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(NOTION_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Notion token exchange failed (${res.status}): ${
        data.error_description || data.error || "unknown error"
      }`
    );
  }
  return data; // { access_token, workspace_name, workspace_icon, duplicated_template_id, ... }
}

function client(token) {
  return new Client({ auth: token });
}

function plainTitle(richArray = []) {
  return richArray.map((t) => t.plain_text || "").join("") || "Untitled";
}

/** List every database the integration has been granted access to. */
export async function listDatabases(token) {
  const notion = client(token);
  const out = [];
  let cursor;
  do {
    const resp = await notion.search({
      filter: { property: "object", value: "database" },
      page_size: 100,
      start_cursor: cursor,
    });
    for (const r of resp.results) {
      if (r.object !== "database") continue;
      out.push({
        id: r.id,
        title: plainTitle(r.title),
        icon:
          r.icon?.type === "emoji"
            ? r.icon.emoji
            : r.icon?.external?.url || r.icon?.file?.url || null,
      });
    }
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  return out;
}

export async function getDatabase(token, databaseId) {
  return client(token).databases.retrieve({ database_id: databaseId });
}

// ---------- Property mapping ----------

const ALIASES = {
  author: ["author", "authors", "by", "writer", "writers"],
  isbn: ["isbn", "isbn13", "isbn-13", "isbn 13", "isbn_13"],
  genre: [
    "genre",
    "genres",
    "category",
    "categories",
    "tags",
    "tag",
    "subject",
    "subjects",
  ],
  publishDate: [
    "publish date",
    "published",
    "publication date",
    "date published",
    "release date",
    "published date",
    "date",
    "year",
  ],
  description: [
    "description",
    "summary",
    "synopsis",
    "notes",
    "about",
    "blurb",
  ],
  pageCount: ["page count", "pages", "page", "length", "# pages", "pagecount"],
  publisher: ["publisher", "press", "imprint"],
};

function findProp(schema, aliases) {
  const entries = Object.entries(schema); // [name, def]
  for (const alias of aliases) {
    const hit = entries.find(([name]) => name.trim().toLowerCase() === alias);
    if (hit) return { name: hit[0], def: hit[1] };
  }
  return null;
}

function findTitleProp(schema) {
  const hit = Object.entries(schema).find(([, def]) => def.type === "title");
  return hit ? { name: hit[0], def: hit[1] } : null;
}

// Notion limits a single rich_text content string to 2000 chars.
function richText(str) {
  if (!str) return [];
  const chunks = [];
  let s = String(str);
  while (s.length > 0) {
    chunks.push({ type: "text", text: { content: s.slice(0, 2000) } });
    s = s.slice(2000);
  }
  return chunks;
}

function normalizeDate(raw) {
  if (!raw) return null;
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return null;
}

function valueForType(def, { text, list, number, date }) {
  switch (def.type) {
    case "rich_text":
      return { rich_text: richText(text) };
    case "title":
      return { title: richText(text) };
    case "multi_select":
      return {
        multi_select: (list || []).slice(0, 100).map((name) => ({
          name: String(name).slice(0, 100).replace(/,/g, " "),
        })),
      };
    case "select":
      return list && list.length
        ? { select: { name: String(list[0]).slice(0, 100).replace(/,/g, " ") } }
        : null;
    case "number":
      return typeof number === "number" && !Number.isNaN(number)
        ? { number }
        : null;
    case "date":
      return date ? { date: { start: date } } : null;
    case "url":
      return text ? { url: text } : null;
    default:
      return null;
  }
}

function setProp(props, schema, aliases, payload) {
  const target = findProp(schema, aliases);
  if (!target) return;
  const value = valueForType(target.def, payload);
  if (value) props[target.name] = value;
}

/**
 * Build the Notion `properties` object by inspecting the database schema and
 * mapping each book field onto whatever matching property exists, respecting
 * the property's actual type. Properties that don't exist are simply skipped,
 * so this works even if a template differs slightly from the recommended one.
 */
export function buildProperties(schema, book) {
  const props = {};

  const titleProp = findTitleProp(schema);
  if (titleProp) {
    props[titleProp.name] = { title: richText(book.title) };
  }

  setProp(props, schema, ALIASES.author, {
    text: book.authors.join(", "),
    list: book.authors,
  });
  setProp(props, schema, ALIASES.isbn, {
    text: book.isbn || "",
    number: book.isbn ? Number(book.isbn) : undefined,
  });
  setProp(props, schema, ALIASES.genre, {
    text: book.categories.join(", "),
    list: book.categories,
  });
  setProp(props, schema, ALIASES.publishDate, {
    text: book.publishedDate || "",
    date: normalizeDate(book.publishedDate),
    number: book.publishedDate ? Number(book.publishedDate.slice(0, 4)) : undefined,
  });
  setProp(props, schema, ALIASES.description, { text: book.description || "" });
  setProp(props, schema, ALIASES.pageCount, {
    text: book.pageCount ? String(book.pageCount) : "",
    number: typeof book.pageCount === "number" ? book.pageCount : undefined,
  });
  setProp(props, schema, ALIASES.publisher, {
    text: book.publisher || "",
    list: book.publisher ? [book.publisher] : [],
  });

  return props;
}

/** Create the book page in the chosen database. */
export async function createBookPage(token, databaseId, book) {
  const notion = client(token);
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const properties = buildProperties(db.properties, book);

  const cover = book.cover
    ? { type: "external", external: { url: book.cover } }
    : undefined;

  // If the database has no "Description" property, drop the description into
  // the page body so it isn't lost.
  const hasDescriptionProp = !!findProp(db.properties, ALIASES.description);
  const children =
    !hasDescriptionProp && book.description
      ? [
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: richText(book.description) },
          },
        ]
      : undefined;

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    cover,
    icon: cover,
    properties,
    ...(children ? { children } : {}),
  });

  return { id: page.id, url: page.url };
}
