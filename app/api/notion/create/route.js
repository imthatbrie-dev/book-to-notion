import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";
import { createBookPage } from "../../../../lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = await getSession();
  if (!session.accessToken) return NextResponse.json({ error: "Not connected to Notion." }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const { databaseId, entry, statusValue, dateCompleted } = body || {};
  if (!databaseId || !entry || !entry.title) return NextResponse.json({ error: "A database and a title are required." }, { status: 400 });

  try {
    const page = await createBookPage(session.accessToken, databaseId, entry, statusValue, dateCompleted);
    return NextResponse.json({ ok: true, page });
  } catch (e) {
    return NextResponse.json({ error: e.body ? safeMessage(e) : e.message || "Failed to write to Notion." }, { status: 502 });
  }
}

function safeMessage(e) {
  try { const p = typeof e.body === "string" ? JSON.parse(e.body) : e.body; return p.message || e.message || "Notion API error."; }
  catch { return e.message || "Notion API error."; }
}
