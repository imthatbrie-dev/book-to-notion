"use client";

import { useEffect, useState, useCallback, useRef } from "react";

function NotionGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4.5l13-1 .8 14.3-11 .7L4 4.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 8.5l5 6.4V8M8 8.5L7 8.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const DB_KEYWORDS = ["book", "books", "reading", "library", "shelf", "bookshelf", "read"];
const FORMATS = ["Book", "Textbook", "Poetry", "Article", "Other"];
const COMPLETION_TERMS = ["read", "finished", "completed", "done", "complete", "have read", "already read"];
const EXCLUSION_PREFIXES = ["to ", "want", "will ", "not ", "un"];

function pickDefaultDb(databases, preselectedId) {
  if (preselectedId && databases.some((d) => d.id === preselectedId)) return preselectedId;
  const match = databases.find((d) => DB_KEYWORDS.some((kw) => d.title.toLowerCase().includes(kw)));
  return match?.id || databases[0]?.id || "";
}

function isCompletedStatus(val) {
  if (!val) return false;
  const v = val.trim().toLowerCase();
  if (EXCLUSION_PREFIXES.some((p) => v.startsWith(p))) return false;
  return COMPLETION_TERMS.some((term) => v === term || v.includes(term));
}

/**
 * Parse OCR text from poetry images.
 *
 * Handles these common layouts:
 * 1. Title (centered/styled) → blank gap → poem body → —AUTHOR at bottom  (Lang Leav style)
 * 2. TITLE ALL CAPS → Author name directly below → poem body              (Robert Frost style)
 * 3. Title + "by Author" on consecutive lines → blank gap → poem body     (Mark Twain style)
 * 4. No title → poem body → -Author at bottom                             (Tyler Kent White style)
 */
function parsePoetryOcr(raw) {
  const paragraphs = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (!paragraphs.length) return { title: "", author: "", excerpt: raw.trim() };

  let title = "";
  let author = "";
  let excerptBlocks = [];

  const firstParaLines = paragraphs[0].split("\n").map((l) => l.trim()).filter(Boolean);
  const restParas = paragraphs.slice(1);

  // Helper: does a line look like an explicit author attribution?
  function isAttributionLine(line) {
    return /^(—|–|--|-)[ ]?[A-Z]/i.test(line) || /^by /i.test(line) || /^@/.test(line);
  }

  // Helper: does a line look like a title?
  // Title signals: ALL CAPS with letters, or SmallCaps-style (first letter caps, rest small),
  // or surrounded by quotes, or much shorter than body average
  function looksLikeTitle(line, bodyAvgLen) {
    const clean = line.replace(/^["'""]|["'""]$/g, "").trim();
    if (!clean) return false;
    const isAllCaps = clean === clean.toUpperCase() && /[A-Z]{2,}/.test(clean);
    const isShort = bodyAvgLen > 0 && clean.length < bodyAvgLen * 0.55 && clean.length < 50;
    return isAllCaps || isShort;
  }

  // Helper: strip attribution prefix and return clean author name
  function cleanAuthor(line) {
    return line.replace(/^(—|–|--|-)[ ]?/i, "").replace(/^by /i, "").replace(/^@/, "").trim();
  }

  // --- CASE 1: Single paragraph (no blank lines at all) ---
  if (paragraphs.length === 1) {
    const lines = firstParaLines;
    // Look for attribution at the bottom
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
      if (isAttributionLine(lines[i])) {
        author = cleanAuthor(lines[i]);
        const remaining = lines.slice(0, i);
        // Check if very first line looks like a title
        const bodyAvg = remaining.slice(1).reduce((s, l) => s + l.length, 0) / Math.max(remaining.slice(1).length, 1);
        if (remaining.length > 1 && looksLikeTitle(remaining[0], bodyAvg)) {
          title = remaining[0].replace(/^["'""]|["'""]$/g, "").trim();
          excerptBlocks = [remaining.slice(1).join("\n")];
        } else {
          excerptBlocks = [remaining.join("\n")];
        }
        return { title, author, excerpt: excerptBlocks.join("\n\n") };
      }
    }
    // No attribution found — just use everything as excerpt
    return { title: "", author: "", excerpt: lines.join("\n") };
  }

  // --- CASE 2: Multiple paragraphs ---

  // Check last paragraph for a trailing attribution (Lang Leav / Tyler Kent White style)
  const lastPara = paragraphs[paragraphs.length - 1];
  const lastParaLines = lastPara.split("\n").map((l) => l.trim()).filter(Boolean);
  const isLastParaAttribution =
    lastParaLines.length <= 2 &&
    lastParaLines.some((l) => isAttributionLine(l) || /^[A-Z][a-z]+ [A-Z]/.test(l));

  if (isLastParaAttribution) {
    const attrLine = lastParaLines.find((l) => isAttributionLine(l)) || lastParaLines[0];
    author = cleanAuthor(attrLine);
    const contentParas = paragraphs.slice(0, -1);

    // Now check if the first of the remaining paragraphs is a title block
    const firstContent = contentParas[0]?.split("\n").map((l) => l.trim()).filter(Boolean) || [];
    const bodyParas = contentParas.slice(1);
    const bodyAvg = bodyParas.join(" ").length / Math.max(bodyParas.length, 1);

    if (firstContent.length === 1 && looksLikeTitle(firstContent[0], bodyAvg)) {
      // Single-line first paragraph that looks like a title
      title = firstContent[0].replace(/^["'""]|["'""]$/g, "").trim();
      excerptBlocks = bodyParas;
    } else if (firstContent.length <= 2 && firstContent.some((l) => isAttributionLine(l))) {
      // First para has title + "by Author" (Mark Twain style)
      const byIdx = firstContent.findIndex((l) => isAttributionLine(l));
      if (!author) author = cleanAuthor(firstContent[byIdx]);
      title = firstContent.slice(0, byIdx).join(" ").replace(/^["'""]|["'""]$/g, "").trim();
      excerptBlocks = bodyParas;
    } else {
      excerptBlocks = contentParas;
    }

    return { title, author, excerpt: excerptBlocks.join("\n\n") };
  }

  // --- CASE 3: First paragraph is a header block (title + author, no trailing attribution) ---
  // Robert Frost style: TITLE on line 1, Author name on line 2 (no prefix), then body
  if (firstParaLines.length <= 3 && restParas.length > 0) {
    const bodyAvg = restParas.join(" ").length / Math.max(restParas.length, 1);

    // Line 0 looks like a title?
    if (looksLikeTitle(firstParaLines[0], bodyAvg)) {
      title = firstParaLines[0].replace(/^["'""]|["'""]$/g, "").trim();

      if (firstParaLines.length >= 2) {
        // Line 1: explicit attribution prefix?
        if (isAttributionLine(firstParaLines[1])) {
          author = cleanAuthor(firstParaLines[1]);
        } else {
          // Line 1 with no prefix — treat as author if it looks like a name
          // (title case, 2-4 words, no punctuation at end)
          const candidate = firstParaLines[1];
          const wordCount = candidate.split(" ").length;
          const looksLikeName = wordCount >= 1 && wordCount <= 5 && !/[,;:]$/.test(candidate) && /^[A-Z]/.test(candidate);
          if (looksLikeName) author = candidate;
        }
      }
      excerptBlocks = restParas;
      return { title, author, excerpt: excerptBlocks.join("\n\n") };
    }

    // First para has "by Author" line (Mark Twain style)
    const byIdx = firstParaLines.findIndex((l) => isAttributionLine(l));
    if (byIdx >= 0) {
      author = cleanAuthor(firstParaLines[byIdx]);
      title = firstParaLines.slice(0, byIdx).join(" ").replace(/^["'""]|["'""]$/g, "").trim();
      excerptBlocks = restParas;
      return { title, author, excerpt: excerptBlocks.join("\n\n") };
    }
  }

  // --- FALLBACK: No clear header, use everything as excerpt ---
  return { title: "", author: "", excerpt: paragraphs.join("\n\n") };
}

export default function Page() {
  const [me, setMe] = useState(null);
  const [selectedDb, setSelectedDb] = useState("");
  const [format, setFormat] = useState("");
  const [banner, setBanner] = useState(null);
  const [statusField, setStatusField] = useState(null);
  const [statusValue, setStatusValue] = useState("");
  const [dateCompleted, setDateCompleted] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedPage, setSavedPage] = useState(null);

  // Book mode
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // Poetry / Article fields
  const [poetryTitle, setPoetryTitle] = useState("");
  const [poetryAuthor, setPoetryAuthor] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [ogLoading, setOgLoading] = useState(false);
  const [ogImage, setOgImage] = useState(null);

  // OCR
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const fileRef = useRef(null);

  const loadMe = useCallback(async () => {
    const r = await fetch("/api/me");
    const data = await r.json();
    setMe(data);
    if (data.connected) setSelectedDb(pickDefaultDb(data.databases, data.preselectedDatabaseId));
  }, []);

  useEffect(() => {
    if (!selectedDb) return;
    setStatusField(null);
    setStatusValue("");
    fetch(`/api/notion/schema?databaseId=${selectedDb}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.statusField) {
          setStatusField(data.statusField);
          setStatusValue("");
        }
      })
      .catch(() => {});
  }, [selectedDb]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) setBanner({ type: "ok", text: "Notion workspace connected." });
    else if (params.get("error")) {
      const e = params.get("error");
      setBanner({ type: "err", text: e === "state_mismatch" ? "Security check failed — please try connecting again." : e === "access_denied" ? "Connection cancelled." : `Couldn't connect: ${e}` });
    }
    if (params.toString()) window.history.replaceState({}, "", window.location.pathname);
    loadMe();
  }, [loadMe]);

  function resetPoetryFields() {
    setPoetryTitle(""); setPoetryAuthor(""); setSourceUrl(""); setExcerpt("");
    setTags(""); setOgImage(null); setOcrDone(false);
  }

  function resetAll() {
    setFormat(""); setQuery(""); setResults([]); setSearched(false); setSelectedBook(null);
    resetPoetryFields(); setDateCompleted(""); setSavedPage(null); setBanner(null);
    setStatusValue("");
  }

  async function handleUrlBlur() {
    if (!sourceUrl || (format !== "Article" && format !== "Other")) return;
    setOgLoading(true);
    try {
      const r = await fetch(`/api/og?url=${encodeURIComponent(sourceUrl)}`);
      const data = await r.json();
      if (data.title && !poetryTitle) setPoetryTitle(data.title);
      if (data.author && !poetryAuthor) setPoetryAuthor(data.author);
      if (data.description && !excerpt) setExcerpt(data.description);
      if (data.image) setOgImage(data.image);
    } catch {}
    finally { setOgLoading(false); }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrDone(false);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const url = URL.createObjectURL(file);
      const { data: { text } } = await worker.recognize(url);
      await worker.terminate();
      URL.revokeObjectURL(url);
      const cleaned = text.trim();
      if (cleaned) {
        const parsed = parsePoetryOcr(cleaned);
        if (parsed.title && !poetryTitle) setPoetryTitle(parsed.title);
        if (parsed.author && !poetryAuthor) setPoetryAuthor(parsed.author);
        if (parsed.excerpt && !excerpt) setExcerpt(parsed.excerpt);
        setOcrDone(true);
      }
    } catch { setBanner({ type: "err", text: "Could not read text from image." }); }
    finally { setOcrLoading(false); }
  }

  async function runSearch(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true); setSearched(true); setSelectedBook(null); setSavedPage(null); setBanner(null);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Search failed.");
      setResults(data.results || []);
    } catch (err) { setBanner({ type: "err", text: err.message }); setResults([]); }
    finally { setSearching(false); }
  }

  async function confirmAdd() {
    if (saving) return;
    setSaving(true); setBanner(null);

    let entry;
    if (format === "Book" || format === "Textbook") {
      if (!selectedBook) { setSaving(false); return; }
      entry = { ...selectedBook, format };
    } else {
      if (!poetryTitle && !excerpt && !sourceUrl) {
        setBanner({ type: "err", text: "Please enter at least a title, excerpt, or source URL." });
        setSaving(false); return;
      }
      entry = {
        title: poetryTitle || "Untitled",
        author: poetryAuthor,
        authors: poetryAuthor ? [poetryAuthor] : [],
        sourceUrl,
        excerpt,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        categories: tags.split(",").map((t) => t.trim()).filter(Boolean),
        image: ogImage,
        format,
      };
    }

    try {
      const r = await fetch("/api/notion/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: selectedDb,
          entry,
          statusValue: statusField && statusValue ? statusValue : undefined,
          dateCompleted: isCompletedStatus(statusValue) ? dateCompleted : undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to write to Notion.");
      setSavedPage(data.page);
      setSelectedBook(null);
      setDateCompleted("");
    } catch (err) { setBanner({ type: "err", text: err.message }); }
    finally { setSaving(false); }
  }

  async function disconnect() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ connected: false }); resetAll();
  }

  const dbName = me?.databases?.find((d) => d.id === selectedDb)?.title || "Notion";
  const showCompletionFields = isCompletedStatus(statusValue);
  const isBookMode = format === "Book" || format === "Textbook";
  const isPoetryMode = format === "Poetry";
  const isArticleMode = format === "Article" || format === "Other";
  const isNonBookMode = isPoetryMode || isArticleMode;

  function StatusPicker() {
    if (!statusField) return null;
    return (
      <div className="full">
        <dt>{statusField.propName}</dt>
        <dd>
          <select className="field" value={statusValue} onChange={(e) => { setStatusValue(e.target.value); setDateCompleted(""); }}>
            <option value="">— No status —</option>
            {statusField.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </dd>
      </div>
    );
  }

  function DateCompletedPicker() {
    if (!statusField || !showCompletionFields) return null;
    return (
      <div className="full">
        <dt>Date Completed</dt>
        <dd>
          <input className="field" placeholder="M/D/YYYY or YYYY" value={dateCompleted} onChange={(e) => setDateCompleted(e.target.value)} />
          <p className="muted" style={{ marginTop: 4, fontSize: "0.8em" }}><em>Optional — leave blank if you don't remember</em></p>
        </dd>
      </div>
    );
  }

  function ConfirmButton() {
    return (
      <div className="confirm-row">
        <button className="btn big" onClick={confirmAdd} disabled={saving || !selectedDb}>
          {saving ? <span className="spinner" /> : null}
          {saving ? "Filing…" : `Add to "${dbName}"`}
        </button>
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className="masthead">
        <div className="eyebrow">Google Books → Notion</div>
        <h1 className="wordmark">SmartLibrary <em>Connector</em></h1>
        <p className="subhead">Look up a book. File it in your library.</p>
        <div className="rule" />
      </header>

      {banner && <div className={`note ${banner.type}`}>{banner.text}</div>}
      {me === null && <div className="panel center"><span className="muted">Loading…</span></div>}

      {me && !me.connected && (
        <div className="panel connect">
          <span className="label">Step one</span>
          <p>Connect your Notion workspace once. SmartLibrary Connector writes new entries straight into your own database — nothing is stored on our side, and it stays free.</p>
          <a className="btn notion-btn" href="/api/auth/login"><NotionGlyph /> Connect Notion</a>
          {me.error && <p className="muted" style={{ marginTop: 16 }}>{me.error}</p>}
        </div>
      )}

      {me && me.connected && (
        <>
          <div className="workspace">
            <span className="who"><span className="dot" />{me.workspaceName || "Connected"}</span>
            <button className="linkbtn" onClick={disconnect}>Disconnect</button>
          </div>

          {me.databases.length === 0 ? (
            <div className="panel">
              <span className="label">No database found</span>
              <p className="muted">SmartLibrary Connector can't see any databases yet. Reconnect and select the page that contains your library database.</p>
              <a className="btn ghost notion-btn" href="/api/auth/login" style={{ marginTop: 6 }}><NotionGlyph /> Reconnect &amp; pick a database</a>
            </div>
          ) : (
            <div className="panel">
              {/* Database picker */}
              <label className="label" htmlFor="db">Save to database</label>
              <select id="db" className="field" value={selectedDb} onChange={(e) => { setSelectedDb(e.target.value); resetAll(); }}>
                {me.databases.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.icon && !d.icon.startsWith("http") ? `${d.icon} ` : ""}{d.title}
                  </option>
                ))}
              </select>

              {/* Format picker */}
              <div style={{ marginTop: 14 }}>
                <label className="label">Format</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {FORMATS.map((f) => (
                    <button
                      key={f}
                      className={`btn${format === f ? "" : " ghost"}`}
                      style={{ padding: "6px 14px", fontSize: "0.85em" }}
                      onClick={() => { resetAll(); setFormat(f); }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* ---- Book / Textbook ---- */}
              {isBookMode && (
                <>
                  <form className="search-row" onSubmit={runSearch} style={{ marginTop: 18 }}>
                    <input
                      className="field"
                      placeholder='Search a title, e.g. "Pachinko" or "Dune Herbert"'
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoFocus
                    />
                    <button className="btn" disabled={searching || !query.trim()}>
                      {searching ? <span className="spinner" /> : null}
                      {searching ? "Searching" : "Search"}
                    </button>
                  </form>
                  {searched && !searching && results.length === 0 && (
                    <p className="muted" style={{ marginTop: 16 }}>No matches. Try adding the author's name.</p>
                  )}
                  {results.length > 0 && (
                    <div className="results">
                      {results.map((b) => (
                        <button
                          key={b.googleId}
                          className={`result ${selectedBook?.googleId === b.googleId ? "active" : ""}`}
                          onClick={() => { setSelectedBook(b); setSavedPage(null); setDateCompleted(""); }}
                        >
                          {b.cover ? <img className="thumb" src={b.cover} alt="" /> : <span className="thumb" />}
                          <span className="meta">
                            <h4>{b.title}</h4>
                            <div className="sub">{b.authors.length ? b.authors.join(", ") : "Unknown author"}</div>
                            <div className="tiny">{[b.publishedDate?.slice(0, 4), b.publisher].filter(Boolean).join(" · ")}</div>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ---- Poetry ---- */}
              {isPoetryMode && (
                <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label className="label">Upload Image <span className="muted" style={{ fontWeight: 400 }}>— we'll try to read the text automatically</span></label>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                    <button className="btn ghost" style={{ marginTop: 6 }} onClick={() => fileRef.current?.click()} disabled={ocrLoading}>
                      {ocrLoading ? <><span className="spinner" /> Reading image…</> : "Choose image"}
                    </button>
                    {ocrDone && <p className="muted" style={{ marginTop: 6, fontSize: "0.8em" }}>✓ Text detected — review and edit the fields below as needed.</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="pexcerpt">Excerpt</label>
                    <textarea id="pexcerpt" className="field" rows={6} placeholder="Poem text will appear here after image upload, or paste manually…" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} style={{ resize: "vertical" }} />
                  </div>
                  <div>
                    <label className="label" htmlFor="ptitle">Poem Title <span className="muted" style={{ fontWeight: 400 }}>optional</span></label>
                    <input id="ptitle" className="field" placeholder="e.g. milk and honey" value={poetryTitle} onChange={(e) => setPoetryTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="pauthor">Poet <span className="muted" style={{ fontWeight: 400 }}>optional</span></label>
                    <input id="pauthor" className="field" placeholder="e.g. Rupi Kaur" value={poetryAuthor} onChange={(e) => setPoetryAuthor(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="psource">Source URL <span className="muted" style={{ fontWeight: 400 }}>optional</span></label>
                    <input id="psource" className="field" placeholder="Pinterest, Instagram, YouTube link…" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="ptags">Tags <span className="muted" style={{ fontWeight: 400 }}>comma separated</span></label>
                    <input id="ptags" className="field" placeholder="e.g. love, grief, healing" value={tags} onChange={(e) => setTags(e.target.value)} />
                  </div>
                </div>
              )}

              {/* ---- Article / Other ---- */}
              {isArticleMode && (
                <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label className="label" htmlFor="aurl">URL</label>
                    <input id="aurl" className="field" placeholder="Paste a link…" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} onBlur={handleUrlBlur} />
                    {ogLoading && <p className="muted" style={{ marginTop: 4, fontSize: "0.8em" }}>Fetching page details…</p>}
                  </div>
                  {ogImage && <img src={ogImage} alt="" style={{ maxWidth: "100%", borderRadius: 6 }} />}
                  <div>
                    <label className="label" htmlFor="atitle">Title</label>
                    <input id="atitle" className="field" placeholder="Article title" value={poetryTitle} onChange={(e) => setPoetryTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="aauthor">Author</label>
                    <input id="aauthor" className="field" placeholder="Author name" value={poetryAuthor} onChange={(e) => setPoetryAuthor(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="aexcerpt">Excerpt / Notes</label>
                    <textarea id="aexcerpt" className="field" rows={4} placeholder="Key quote or notes…" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} style={{ resize: "vertical" }} />
                  </div>
                  <div>
                    <label className="label" htmlFor="atags">Tags <span className="muted" style={{ fontWeight: 400 }}>comma separated</span></label>
                    <input id="atags" className="field" placeholder="e.g. productivity, finance" value={tags} onChange={(e) => setTags(e.target.value)} />
                  </div>
                </div>
              )}

              {/* ---- Non-book confirm panel (always visible once format is selected) ---- */}
              {isNonBookMode && (
                <div style={{ marginTop: 18 }}>
                  {statusField && (
                    <div style={{ marginBottom: 12 }}>
                      <label className="label" htmlFor="nonstatus">{statusField.propName}</label>
                      <select id="nonstatus" className="field" value={statusValue} onChange={(e) => { setStatusValue(e.target.value); setDateCompleted(""); }}>
                        <option value="">— No status —</option>
                        {statusField.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  )}
                  {showCompletionFields && (
                    <div style={{ marginBottom: 12 }}>
                      <label className="label">Date Completed</label>
                      <input className="field" placeholder="M/D/YYYY or YYYY" value={dateCompleted} onChange={(e) => setDateCompleted(e.target.value)} />
                      <p className="muted" style={{ marginTop: 4, fontSize: "0.8em" }}><em>Optional — leave blank if you don't remember</em></p>
                    </div>
                  )}
                  <button className="btn big" onClick={confirmAdd} disabled={saving || !selectedDb} style={{ width: "100%", marginTop: 4 }}>
                    {saving ? <span className="spinner" /> : null}
                    {saving ? "Filing…" : `Add to "${dbName}"`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---- Preview: Book / Textbook ---- */}
          {isBookMode && selectedBook && (
            <div className="panel">
              <span className="label">Preview — confirm before filing</span>
              <div className="preview" style={{ marginTop: 14 }}>
                {selectedBook.cover ? <img className="thumb" src={selectedBook.cover} alt="" /> : <div className="no-cover">No cover</div>}
                <div>
                  <h3>{selectedBook.title}</h3>
                  {selectedBook.subtitle && <div className="byline">{selectedBook.subtitle}</div>}
                  <div className="byline">{selectedBook.authors.length ? selectedBook.authors.join(", ") : "Unknown author"}</div>
                  <dl className="cardgrid">
                    <div><dt>ISBN</dt><dd>{selectedBook.isbn || "—"}</dd></div>
                    <div><dt>Published</dt><dd>{selectedBook.publishedDate || "—"}</dd></div>
                    <div><dt>Pages</dt><dd>{selectedBook.pageCount ?? "—"}</dd></div>
                    <div><dt>Publisher</dt><dd>{selectedBook.publisher || "—"}</dd></div>
                    <div className="full">
                      <dt>Genre</dt>
                      <dd>{selectedBook.categories.length ? <span className="chips">{selectedBook.categories.map((c) => <span className="chip" key={c}>{c}</span>)}</span> : "—"}</dd>
                    </div>
                    {selectedBook.description && <div className="full"><dt>Description</dt><dd className="desc">{selectedBook.description}</dd></div>}
                    <StatusPicker />
                    <DateCompletedPicker />
                    <ConfirmButton />
                  </dl>
                </div>
              </div>
            </div>
          )}

          {savedPage && (
            <div className="panel success">
              <div className="stamp">Filed</div>
              <h3>Added to your library</h3>
              <p className="muted"><a href={savedPage.url} target="_blank" rel="noreferrer">Open the entry in Notion ↗</a></p>
            </div>
          )}
        </>
      )}

      <div className="foot">Book data from Google Books · Open source · Bring your own Notion</div>
    </div>
  );
}
