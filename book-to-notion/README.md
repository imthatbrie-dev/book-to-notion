# Colophon — Book → Notion

A free, self-hostable web app: search any book, preview it, and file it into
**your own** Notion database with one click. Data comes from the free Google
Books API (no key required). Each user connects their own Notion workspace via
OAuth, so the app writes to their library and stores nothing server-side.

- **Free for end users** — no accounts, no subscriptions.
- **Free to host** — single Next.js app, deploys to Vercel's free tier.
- **No database** — the Notion token lives only in an encrypted, http-only
  session cookie. (Notion OAuth tokens are long-lived and aren't refreshed, so
  no backend store is needed.)
- **Template-friendly** — works with any book database; ships with a
  recommended schema and auto-maps fields to whatever properties exist.

---

## How it works

```
Browser ──/api/auth/login──▶ Notion OAuth ──callback──▶ encrypted cookie
Browser ──/api/search?q──▶ Google Books API ──▶ preview
Browser ──/api/notion/create──▶ Notion API ──▶ new page in your database
```

The token exchange and all Notion calls happen server-side in API routes; the
client never sees your Notion token.

---

## 1. The Notion template

Create a database (or duplicate a template) with these properties. **Property
names are matched case-insensitively with common aliases**, and any property
that doesn't exist is simply skipped — so the app still works if your schema
differs. Recommended setup:

| Property        | Type           | Filled with                          |
| --------------- | -------------- | ------------------------------------ |
| `Name`          | **Title**      | Book title (any title-type prop works) |
| `Author`        | Multi-select   | Author(s)                            |
| `ISBN`          | Text or Number | ISBN-13 (falls back to ISBN-10)      |
| `Genre`         | Multi-select   | Google Books categories             |
| `Publish Date`  | Date           | Publication date                     |
| `Page Count`    | Number         | Pages                                |
| `Description`   | Text           | Synopsis                             |
| `Publisher`     | Text or Select | Publisher (optional)                 |

The book's cover image is also set as the page **cover** and **icon**.

Accepted aliases include: Author/Authors, Genre/Genres/Category/Tags,
Publish Date/Published/Release Date/Year, Page Count/Pages/Length,
Description/Summary/Synopsis. If there's no Description property, the synopsis
is written into the page body instead.

> To share this as a copyable template, make the database a page, then use
> **Share → Publish → "Allow duplicate as template."** When a user connects
> through the duplicate flow, Notion hands the app the new database id and the
> app pre-selects it automatically.

---

## 2. Create a Notion public integration

1. Go to <https://www.notion.so/my-integrations> → **New integration**.
2. Set **Type** to **Public** (this enables OAuth).
3. Fill in name, logo, and the required company/privacy URLs (any valid URLs
   are fine for personal use).
4. Under **OAuth Domain & URIs**, add a **Redirect URI**:
   - Local: `http://localhost:3000/api/auth/callback`
   - Production: `https://YOUR-APP.vercel.app/api/auth/callback`
   - You can add both.
5. Copy the **OAuth client ID** and **OAuth client secret**.

Capabilities only need read/write content — no user email needed.

---

## 3. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # -> SESSION_SECRET
```

| Variable               | Required | Notes                                            |
| ---------------------- | -------- | ------------------------------------------------ |
| `NOTION_CLIENT_ID`     | yes      | From the integration                             |
| `NOTION_CLIENT_SECRET` | yes      | From the integration                             |
| `SESSION_SECRET`       | yes      | Random string, ≥ 32 chars (encrypts the cookie)  |
| `NOTION_REDIRECT_URI`  | optional | Defaults to the request origin + `/api/auth/callback` |

---

## 4. Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

---

## 5. Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. In Vercel: **New Project → import the repo** (framework auto-detected as
   Next.js, no settings to change).
3. Add the env vars from step 3 under **Settings → Environment Variables**.
   Set `NOTION_REDIRECT_URI` to `https://YOUR-APP.vercel.app/api/auth/callback`.
4. Deploy.
5. Back in the Notion integration, make sure that exact production URL is listed
   as a Redirect URI.

Or from the CLI:

```bash
npm i -g vercel
vercel            # follow prompts
vercel env add NOTION_CLIENT_ID
vercel env add NOTION_CLIENT_SECRET
vercel env add SESSION_SECRET
vercel --prod
```

> **Cloudflare note:** the prompt mentioned Cloudflare Workers as an option.
> This app uses the Node.js runtime for its API routes (Notion SDK + crypto),
> so Vercel is the path of least resistance. Running on Workers would mean
> adapting the routes to the Edge runtime; Vercel is recommended.

---

## Project structure

```
app/
  page.js                  UI: connect → search → preview → confirm
  layout.js, globals.css   fonts + library-catalog styling
  api/
    auth/login             redirect to Notion OAuth (+ CSRF state)
    auth/callback          exchange code, store token in cookie
    auth/logout            clear session
    me                     auth status + list of accessible databases
    search                 Google Books proxy
    notion/create          write the confirmed book into the chosen DB
lib/
  session.js               iron-session (encrypted cookie) config
  googleBooks.js           search + normalize a volume
  notion.js                OAuth exchange, list DBs, field mapping, create page
```

## Notes & limits

- Google Books has generous free quotas; no key is used. Some volumes lack a
  cover, ISBN, or categories — those fields just show as empty.
- Partial dates ("2009", "2009-10") are padded to a valid date ("2009-01-01")
  for Notion's Date property.
- The app only sees Notion content you grant it during OAuth. To add or change
  the target database later, click **Disconnect** and reconnect, selecting the
  right pages on Notion's permission screen.

MIT licensed — do whatever you like with it.
