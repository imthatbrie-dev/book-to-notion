import { NextResponse } from "next/server";
import { searchBooks } from "../../../lib/googleBooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ error: "Missing search query." }, { status: 400 });
  }
  try {
    const results = await searchBooks(q, { max: 8 });
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "Search failed." },
      { status: 502 }
    );
  }
}
