/**
 * Server-side proxy for Pokepaste links — pokepast.es sends no CORS headers,
 * so the browser can't fetch it directly. GET /api/pokepaste?url=<paste url>
 * returns the paste's raw Showdown export text.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return new Response("missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("invalid url", { status: 400 });
  }
  if (target.hostname !== "pokepast.es" || !/^\/\w+\/?$/.test(target.pathname)) {
    return new Response("only pokepast.es links are supported", { status: 400 });
  }

  const res = await fetch(
    `https://pokepast.es${target.pathname.replace(/\/$/, "")}/raw`,
  );
  if (!res.ok) {
    return new Response("paste not found", { status: 404 });
  }
  return new Response(await res.text(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
