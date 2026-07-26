import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SmartLibraryBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();

    // Flexible meta tag extractor — handles any attribute order
    function getMeta(key) {
      // Match <meta property="X" content="Y"> or <meta content="Y" property="X">
      // Also handles name="X" instead of property="X"
      const patterns = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return decodeHtmlEntities(m[1].trim());
      }
      return null;
    }

    function decodeHtmlEntities(str) {
      return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'");
    }

    function getTitleTag() {
      const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return m?.[1] ? decodeHtmlEntities(m[1].trim()) : null;
    }

    // Twitter cards often have author in label1/data1 pattern
    function getTwitterAuthor() {
      // Look for twitter:label1="Written by" + twitter:data1="Name"
      const label = getMeta("twitter:label1");
      const data = getMeta("twitter:data1");
      if (label && /written by|author/i.test(label) && data) return data;
      return getMeta("twitter:creator") || getMeta("twitter:site") || null;
    }

    const title = getMeta("og:title") || getMeta("twitter:title") || getTitleTag();
    const description = getMeta("og:description") || getMeta("twitter:description") || getMeta("description");
    const image = getMeta("og:image") || getMeta("og:image:secure_url") || getMeta("twitter:image");
    const siteName = getMeta("og:site_name");

    // Author: try article meta, then twitter pattern, then byline in HTML
    let author = getMeta("article:author") || getMeta("author") || getTwitterAuthor();

    // Fallback: look for byline patterns in the HTML body
    if (!author) {
      const bylinePatterns = [
        /by\s+<a[^>]*>([^<]+)<\/a>/i,
        /class=["'][^"']*author[^"']*["'][^>]*>([^<]{2,60})</i,
        /rel=["']author["'][^>]*>([^<]{2,60})</i,
      ];
      for (const p of bylinePatterns) {
        const m = html.match(p);
        if (m?.[1]) { author = decodeHtmlEntities(m[1].trim()); break; }
      }
    }

    return NextResponse.json({
      title,
      author,
      description,
      image,
      siteName,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Failed to fetch URL" }, { status: 502 });
  }
}
