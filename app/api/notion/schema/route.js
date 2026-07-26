import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";
import { getStatusOptions } from "../../../../lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ error: "Not connected." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const databaseId = searchParams.get("databaseId");
  if (!databaseId) {
    return NextResponse.json({ error: "databaseId is required." }, { status: 400 });
  }

  try {
    const statusField = await getStatusOptions(session.accessToken, databaseId);
    return NextResponse.json({ statusField });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed to read schema." }, { status: 502 });
  }
}
