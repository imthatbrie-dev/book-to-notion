import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

// The shape of what we persist in the encrypted session cookie.
// Notion OAuth access tokens for public integrations are long-lived and
// are not refreshed, so we can safely keep everything we need in the cookie
// and avoid running any database. The cookie is encrypted + signed with
// SESSION_SECRET, so the user can read it exists but cannot tamper with it.
export const sessionOptions = {
  password: process.env.SESSION_SECRET || "",
  cookieName: "book_notion_session",
  cookieOptions: {
    // `secure` must be true in production (https). Vercel is always https.
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // 30 days
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short. It must be at least 32 characters."
    );
  }
  return getIronSession(cookies(), sessionOptions);
}
