import { ImageResponse } from "next/og";
import { Sprites } from "@pkmn/img";
import { cardSubtitle, fetchPublishedMeta } from "../published-meta";

/**
 * The Open Graph card for a published page.
 *
 * Sprites are the **individual** gen-5-style PNGs, not the icon sheet the app
 * draws with: the sheet is one image positioned by `background-position`, and
 * the renderer behind `ImageResponse` has no reliable sprite-sheet support.
 * Both are hotlinked from Showdown either way, so nothing is committed here.
 *
 * They are fetched here and inlined as data URLs rather than passed as remote
 * `src`es. `ImageResponse` renders into a stream, so an image that 404s or
 * times out fails *after* the response has begun — too late to fall back, and
 * the result is no card at all. Fetching first makes each sprite independently
 * droppable: the title and byline are the content, the sprites are decoration.
 *
 * Plain flexbox and no webfont on purpose. A crawler renders this once on a
 * cold function and then X and Discord cache it for a long time.
 */

export const alt = "A xatu matchup guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function spriteData(species: string): Promise<string | null> {
  const { url } = Sprites.getPokemon(species, { gen: 5 });
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = await fetchPublishedMeta(slug);

  const title = meta?.title ?? "xatu";
  const subtitle = meta
    ? cardSubtitle(meta)
    : "Matchup guides for Pokémon doubles";
  const sprites = (
    await Promise.all((meta?.species ?? []).slice(0, 6).map(spriteData))
  ).filter((d): d is string => d !== null);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#fafaf8",
        padding: "72px 80px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 6,
            color: "#a8a29e",
          }}
        >
          XATU · MATCHUP GUIDE
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: title.length > 40 ? 66 : 84,
            fontWeight: 700,
            color: "#1c1917",
            lineHeight: 1.1,
          }}
        >
          {title.slice(0, 80)}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 32,
            color: "#57534e",
          }}
        >
          {subtitle}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        {sprites.map((src, i) => (
          <img key={i} src={src} width={150} height={150} alt="" />
        ))}
      </div>
    </div>,
    size,
  );
}
