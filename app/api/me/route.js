import { NextResponse } from "next/server";
import { getSession } from "../../../lib/session";
import { listDatabases } from "../../../lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ connected: false });
  }

  try {
    const databases = await listDatabases(session.accessToken);
    return NextResponse.json({
      connected: true,
      workspaceName: session.workspaceName,
      workspaceIcon: session.workspaceIcon,
      preselectedDatabaseId: session.duplicatedTemplateId || null,
      databases,
    });
  } catch (e) {
    // Token may have been revoked in Notion. Treat as disconnected.
    session.destroy();
    return NextResponse.json({
      connected: false,
      error: "Could not load your Notion databases. Please reconnect.",
    });
  }
}
