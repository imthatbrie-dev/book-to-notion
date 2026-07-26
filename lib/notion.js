import { Client } from "@notionhq/client";

const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";

export async function exchangeCodeForToken({ code, redirectUri }) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(NOTION_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Notion token exchange failed (${res.status}): ${data.error_description || data.error || "unknown error"}`);
  return data;
}

function client(token) { return new Client({ auth: token }); }
function plainTitle(richArray = []) { return richArray.map((t) => t.plain_text || "").join("") || "Untitled"; }

export async function listDatabases(token) {
  const notion = client(token);
  const out = [];
  let cursor;
  do {
    const resp = await notion.search({ filter: { property: "object", value: "database" }, page_size: 100, start_cursor: cursor });
    for (const r of resp.results) {
      if (r.object !== "database") continue;
      out.push({
        id: r.id,
        title: plainTitle(r.title),
        icon: r.icon?.type === "emoji" ? r.icon.emoji : r.icon?.external?.url || r.icon?.file?.url || null,
      });
    }
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  return out;
}

export async function getDatabase(token, databaseId) {
  return client(token).databases.retrieve({ database_id: databaseId });
}

// ---------- Status field ----------
const STATUS_ALIASES = ["status", "reading status", "read status", "state", "progress", "reading progress", "reading"];

export async function getStatusOptions(token, databaseId) {
  const notion = client(token);
  const db = await notion.databases.retrieve({ database_id: databaseId });
  for (const [name, def] of Object.entries(db.properties)) {
    if (!STATUS_ALIASES.includes(name.trim().toLowerCase())) continue;
    if (def.type === "select") return { propName: name, propType: "select", options: (def.select?.options || []).map((o) => o.name) };
    if (def.type === "status") return { propName: name, propType: "status", options: (def.status?.options || []).map((o) => o.name) };
  }
  return null;
}

// ---------- Completion detection ----------
const COMPLETION_TERMS = ["read", "finished", "completed", "done", "complete", "have read", "already read"];
const EXCLUSION_PREFIXES = ["to ", "want", "will ", "not ", "un"];
export function isCompletedStatus(val) {
  if (!val) return false;
  const v = val.trim().toLowerCase();
  if (EXCLUSION_PREFIXES.some((p) => v.startsWith(p))) return false;
  return COMPLETION_TERMS.some((term) => v === term || v.includes(term));
}

// ---------- Property aliases ----------
const ALIASES = {
  author:          ["author", "authors", "by", "writer", "writers", "poet", "artist"],
  isbn:            ["isbn", "isbn13", "isbn-13", "isbn 13", "isbn_13"],
  genre:           ["genre", "genres", "category", "categories", "tags", "tag", "subject", "subjects"],
  publishDate:     ["publish date", "published", "publication date", "date published", "release date", "published date", "date", "year"],
  description:     ["description", "summary", "synopsis", "notes", "about", "blurb"],
  pageCount:       ["page count", "pages", "page", "length", "# pages", "pagecount"],
  publisher:       ["publisher", "press", "imprint"],
  dateAdded:       ["date added", "added", "added on", "date created", "created", "entry date"],
  dateFinished:    ["date finished", "date completed", "date read", "read dates", "read date", "finished", "completed on", "read on", "finish date", "completion date", "finish dates"],
  pagesRead:       ["pages read", "pages completed", "pages finished"],
  percentComplete: ["% complete", "percent complete", "percent read", "% read", "progress %", "completion %"],
  format:          ["format", "type", "media type", "media", "content type"],
  excerpt:         ["excerpt", "quote", "lines", "text", "poem text", "passage"],
  sourceUrl:       ["source url", "source", "url", "link", "source link", "reference"],
};

function findProp(schema, aliases) {
  const entries = Object.entries(schema);
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

function richText(str) {
  if (!str) return [];
  const chunks = [];
  let s = String(str);
  while (s.length > 0) { chunks.push({ type: "text", text: { content: s.slice(0, 2000) } }); s = s.slice(2000); }
  return chunks;
}

function normalizeDate(raw) {
  if (!raw) return null;
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return null;
}

function parseUserDate(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`;
  const parts = trimmed.split(/[\/\-]/);
  if (parts.length === 3) {
    const [m, d, y] = parts;
    if (y.length === 4) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

function valueForType(def, { text, list, number, date }) {
  switch (def.type) {
    case "rich_text": return { rich_text: richText(text) };
    case "title":     return { title: richText(text) };
    case "multi_select": return { multi_select: (list || []).slice(0, 100).map((name) => ({ name: String(name).slice(0, 100).replace(/,/g, " ") })) };
    case "select":    return list?.length ? { select: { name: String(list[0]).slice(0, 100).replace(/,/g, " ") } } : null;
    case "number":    return typeof number === "number" && !Number.isNaN(number) ? { number } : null;
    case "date":      return date ? { date: { start: date } } : null;
    case "url":       return text ? { url: text } : null;
    default:          return null;
  }
}

function setProp(props, schema, aliases, payload) {
  const target = findProp(schema, aliases);
  if (!target) return;
  const value = valueForType(target.def, payload);
  if (value) props[target.name] = value;
}

// ---------- Build properties ----------
export function buildProperties(schema, entry, statusValue, dateCompleted) {
  const props = {};
  const isPoetry = entry.format && ["Poetry", "Article", "Other"].includes(entry.format);

  // Title — book title or poem title
  const titleProp = findTitleProp(schema);
  if (titleProp) props[titleProp.name] = { title: richText(entry.title || "Untitled") };

  // Author / Poet
  setProp(props, schema, ALIASES.author, { text: (entry.authors || []).join(", ") || entry.author || "", list: entry.authors || (entry.author ? [entry.author] : []) });

  if (!isPoetry) {
    // Book-only fields
    setProp(props, schema, ALIASES.isbn,        { text: entry.isbn || "", number: entry.isbn ? Number(entry.isbn) : undefined });
    setProp(props, schema, ALIASES.publishDate,  { text: entry.publishedDate || "", date: normalizeDate(entry.publishedDate), number: entry.publishedDate ? Number(entry.publishedDate.slice(0, 4)) : undefined });
    setProp(props, schema, ALIASES.description,  { text: entry.description || "" });
    setProp(props, schema, ALIASES.pageCount,    { text: entry.pageCount ? String(entry.pageCount) : "", number: typeof entry.pageCount === "number" ? entry.pageCount : undefined });
    setProp(props, schema, ALIASES.publisher,    { text: entry.publisher || "", list: entry.publisher ? [entry.publisher] : [] });
  }

  // Genre / Tags — books get categories, poetry gets user tags
  const tagList = entry.categories?.length ? entry.categories : entry.tags?.length ? entry.tags : [];
  if (tagList.length) setProp(props, schema, ALIASES.genre, { text: tagList.join(", "), list: tagList });

  // Shared fields
  setProp(props, schema, ALIASES.dateAdded,  { date: todayIso() });
  setProp(props, schema, ALIASES.format,     { text: entry.format || "", list: entry.format ? [entry.format] : [] });
  setProp(props, schema, ALIASES.excerpt,    { text: entry.excerpt || "" });
  setProp(props, schema, ALIASES.sourceUrl,  { text: entry.sourceUrl || "" });

  // Status
  if (statusValue) {
    for (const [name, def] of Object.entries(schema)) {
      if (!STATUS_ALIASES.includes(name.trim().toLowerCase())) continue;
      if (def.type === "select")  props[name] = { select: { name: statusValue } };
      if (def.type === "status")  props[name] = { status: { name: statusValue } };
      break;
    }
  }

  // Completion fields
  if (isCompletedStatus(statusValue)) {
    const parsedFinish = parseUserDate(dateCompleted);
    if (parsedFinish) setProp(props, schema, ALIASES.dateFinished, { date: parsedFinish });
    if (typeof entry.pageCount === "number") setProp(props, schema, ALIASES.pagesRead, { number: entry.pageCount });
    setProp(props, schema, ALIASES.percentComplete, { number: 100 });
  }

  return props;
}

export async function createBookPage(token, databaseId, entry, statusValue, dateCompleted) {
  const notion = client(token);
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const properties = buildProperties(db.properties, entry, statusValue, dateCompleted);

  const coverUrl = entry.cover || entry.image || null;
  const cover = coverUrl ? { type: "external", external: { url: coverUrl } } : undefined;

  // If no description property exists and we have one, write to page body
  const hasDescriptionProp = !!findProp(db.properties, ALIASES.description);
  const hasExcerptProp = !!findProp(db.properties, ALIASES.excerpt);
  const bodyText = (!hasDescriptionProp && entry.description) || (!hasExcerptProp && entry.excerpt) || null;
  const children = bodyText
    ? [{ object: "block", type: "paragraph", paragraph: { rich_text: richText(bodyText) } }]
    : undefined;

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    ...(cover ? { cover, icon: cover } : {}),
    properties,
    ...(children ? { children } : {}),
  });

  return { id: page.id, url: page.url };
}
