import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";
import { exchangeCodeForToken } from "../../../../lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRedirectUri(req) {
  if (process.env.NOTION_REDIRECT_URI) return process.env.NOTION_REDIRECT_URI;
  const url = new URL(req.url);
  return `${url.origin}/api/auth/callback`;
}

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const home = url.origin;

  if (error) {
    return NextResponse.redirect(`${home}/?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${home}/?error=missing_code`);
  }

  // CSRF check against the state cookie set during login.
  const cookieState = req.cookies.get("notion_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(`${home}/?error=state_mismatch`);
  }

  try {
    const token = await exchangeCodeForToken({
      code,
      redirectUri: getRedirectUri(req),
    });

    const session = await getSession();
    session.accessToken = token.access_token;
    session.workspaceName = token.workspace_name || null;
    session.workspaceIcon = token.workspace_icon || null;
    // When a user connects via "Duplicate template", Notion returns the id of
    // the database/page they just duplicated. We use it to preselect the DB.
    session.duplicatedTemplateId = token.duplicated_template_id || null;
    await session.save();

    const res = NextResponse.redirect(`${home}/?connected=1`);
    res.cookies.delete("notion_oauth_state");
    return res;
  } catch (e) {
    return NextResponse.redirect(
      `${home}/?error=${encodeURIComponent(e.message || "auth_failed")}`
    );
  }
}
