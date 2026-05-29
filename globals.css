"use client";

import { useEffect, useState, useCallback } from "react";

function NotionGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4.5l13-1 .8 14.3-11 .7L4 4.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 8.5l5 6.4V8M8 8.5L7 8.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Page() {
  const [me, setMe] = useState(null); // null=loading
  const [selectedDb, setSelectedDb] = useState("");
  const [banner, setBanner] = useState(null); // {type, text}

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const [selectedBook, setSelectedBook] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedPage, setSavedPage] = useState(null);

  const loadMe = useCallback(async () => {
    const r = await fetch("/api/me");
    const data = await r.json();
    setMe(data);
    if (data.connected) {
      const pre = data.preselectedDatabaseId;
      const exists =
        pre && data.databases.some((d) => d.id === pre);
      setSelectedDb(exists ? pre : data.databases[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    // Surface OAuth redirect messages, then clean the URL.
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) {
      setBanner({ type: "ok", text: "Notion workspace connected." });
    } else if (params.get("error")) {
      const e = params.get("error");
      const friendly =
        e === "state_mismatch"
          ? "Security check failed — please try connecting again."
          : e === "access_denied"
          ? "Connection cancelled."
          : `Couldn't connect: ${e}`;
      setBanner({ type: "err", text: friendly });
    }
    if (params.toString()) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    loadMe();
  }, [loadMe]);

  async function runSearch(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setSearched(true);
    setSelectedBook(null);
    setSavedPage(null);
    setBanner(null);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Search failed.");
      setResults(data.results || []);
    } catch (err) {
      setBanner({ type: "err", text: err.message });
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function confirmAdd() {
    if (!selectedBook || !selectedDb || saving) return;
    setSaving(true);
    setBanner(null);
    try {
      const r = await fetch("/api/notion/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: selectedDb, book: selectedBook }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to write to Notion.");
      setSavedPage(data.page);
      setSelectedBook(null);
    } catch (err) {
      setBanner({ type: "err", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ connected: false });
    setResults([]);
    setSelectedBook(null);
    setSearched(false);
    setQuery("");
  }

  const dbName = me?.databases?.find((d) => d.id === selectedDb)?.title || "Notion";

  return (
    <div className="wrap">
      <header className="masthead">
        <div className="eyebrow">Google Books → Notion</div>
        <h1 className="wordmark">
          Colo<em>phon</em>
        </h1>
        <p className="subhead">Look up a book. File it in your library.</p>
        <div className="rule" />
      </header>

      {banner && (
        <div className={`note ${banner.type}`}>{banner.text}</div>
      )}

      {/* ---- Loading ---- */}
      {me === null && (
        <div className="panel center">
          <span className="muted">Loading…</span>
        </div>
      )}

      {/* ---- Not connected ---- */}
      {me && !me.connected && (
        <div className="panel connect">
          <span className="label">Step one</span>
          <p>
            Connect your Notion workspace once. Colophon writes new books
            straight into your own book database — nothing is stored on our
            side, and it stays free.
          </p>
          <a className="btn notion-btn" href="/api/auth/login">
            <NotionGlyph /> Connect Notion
          </a>
          {me.error && <p className="muted" style={{ marginTop: 16 }}>{me.error}</p>}
        </div>
      )}

      {/* ---- Connected ---- */}
      {me && me.connected && (
        <>
          <div className="workspace">
            <span className="who">
              <span className="dot" />
              {me.workspaceName || "Connected"}
            </span>
            <button className="linkbtn" onClick={disconnect}>
              Disconnect
            </button>
          </div>

          {me.databases.length === 0 ? (
            <div className="panel">
              <span className="label">No database found</span>
              <p className="muted">
                This app can't see any databases yet. Reconnect and, on the
                Notion permission screen, select the page that contains your
                book database (or duplicate the template first).
              </p>
              <a className="btn ghost notion-btn" href="/api/auth/login" style={{ marginTop: 6 }}>
                <NotionGlyph /> Reconnect &amp; pick a database
              </a>
            </div>
          ) : (
            <div className="panel">
              <label className="label" htmlFor="db">
                Save to database
              </label>
              <select
                id="db"
                className="field"
                value={selectedDb}
                onChange={(e) => setSelectedDb(e.target.value)}
              >
                {me.databases.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.icon && !d.icon.startsWith("http") ? `${d.icon} ` : ""}
                    {d.title}
                  </option>
                ))}
              </select>

              <form className="search-row" onSubmit={runSearch} style={{ marginTop: 18 }}>
                <input
                  className="field"
                  placeholder="Search a title, e.g. “Pachinko” or “Dune Herbert”"
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
                <p className="muted" style={{ marginTop: 16 }}>
                  No matches. Try adding the author's name.
                </p>
              )}

              {results.length > 0 && (
                <div className="results">
                  {results.map((b) => (
                    <button
                      key={b.googleId}
                      className={`result ${
                        selectedBook?.googleId === b.googleId ? "active" : ""
                      }`}
                      onClick={() => {
                        setSelectedBook(b);
                        setSavedPage(null);
                      }}
                    >
                      {b.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={b.cover} alt="" />
                      ) : (
                        <span className="thumb" />
                      )}
                      <span className="meta">
                        <h4>{b.title}</h4>
                        <div className="sub">
                          {b.authors.length ? b.authors.join(", ") : "Unknown author"}
                        </div>
                        <div className="tiny">
                          {[b.publishedDate?.slice(0, 4), b.publisher]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- Preview ---- */}
          {selectedBook && (
            <div className="panel">
              <span className="label">Preview — confirm before filing</span>
              <div className="preview" style={{ marginTop: 14 }}>
                {selectedBook.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="thumb" src={selectedBook.cover} alt="" />
                ) : (
                  <div className="no-cover">No cover</div>
                )}
                <div>
                  <h3>{selectedBook.title}</h3>
                  {selectedBook.subtitle && (
                    <div className="byline">{selectedBook.subtitle}</div>
                  )}
                  <div className="byline">
                    {selectedBook.authors.length
                      ? selectedBook.authors.join(", ")
                      : "Unknown author"}
                  </div>

                  <dl className="cardgrid">
                    <div>
                      <dt>ISBN</dt>
                      <dd>{selectedBook.isbn || "—"}</dd>
                    </div>
                    <div>
                      <dt>Published</dt>
                      <dd>{selectedBook.publishedDate || "—"}</dd>
                    </div>
                    <div>
                      <dt>Pages</dt>
                      <dd>{selectedBook.pageCount ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Publisher</dt>
                      <dd>{selectedBook.publisher || "—"}</dd>
                    </div>
                    <div className="full">
                      <dt>Genre</dt>
                      <dd>
                        {selectedBook.categories.length ? (
                          <span className="chips">
                            {selectedBook.categories.map((c) => (
                              <span className="chip" key={c}>
                                {c}
                              </span>
                            ))}
                          </span>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    {selectedBook.description && (
                      <div className="full">
                        <dt>Description</dt>
                        <dd className="desc">{selectedBook.description}</dd>
                      </div>
                    )}
                    <div className="confirm-row">
                      <button
                        className="btn big"
                        onClick={confirmAdd}
                        disabled={saving || !selectedDb}
                      >
                        {saving ? <span className="spinner" /> : null}
                        {saving ? "Filing…" : `Add to “${dbName}”`}
                      </button>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* ---- Success ---- */}
          {savedPage && (
            <div className="panel success">
              <div className="stamp">Filed</div>
              <h3>Added to your library</h3>
              <p className="muted">
                <a href={savedPage.url} target="_blank" rel="noreferrer">
                  Open the entry in Notion ↗
                </a>
              </p>
            </div>
          )}
        </>
      )}

      <div className="foot">
        Book data from Google Books · Open source · Bring your own Notion
      </div>
    </div>
  );
}
