// Vercel Edge Function: proxies an http(s) radio stream so it can be played
// from an https page (bypasses the browser's mixed-content block).
//
// Usage from the client:  /api/stream?url=<url-encoded stream URL>
//
// Deploy: import this repo into Vercel (zero config) — Vercel auto-detects the
// api/ directory and serves this at /api/stream. GitHub Pages ignores it.

export const config = { runtime: "edge" };

function cors() {
  const h = new Headers();
  h.set("access-control-allow-origin", "*");
  h.set("access-control-allow-methods", "GET,OPTIONS");
  return h;
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors() });

  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return new Response("missing ?url", { status: 400, headers: cors() });

  let target;
  try { target = new URL(raw); } catch { return new Response("bad url", { status: 400, headers: cors() }); }
  if (target.protocol !== "http:" && target.protocol !== "https:")
    return new Response("unsupported protocol", { status: 400, headers: cors() });

  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      redirect: "follow",
      // a browser-like UA + no ICY metadata coaxes Shoutcast/Icecast into plain HTTP
      headers: { "User-Agent": "Mozilla/5.0 (RetroFM stream proxy)", "Icy-MetaData": "0", "Accept": "*/*" },
    });
  } catch {
    return new Response("upstream fetch failed", { status: 502, headers: cors() });
  }

  const headers = cors();
  headers.set("content-type", upstream.headers.get("content-type") || "audio/mpeg");
  headers.set("cache-control", "no-store");
  // stream the body straight through (radio streams are open-ended)
  return new Response(upstream.body, { status: 200, headers });
}
