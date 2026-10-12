import { SLUG_RE } from "../demo/slug";

/**
 * The handful of fields a share card needs, read on the **server**.
 *
 * `app/demo/publish.ts` is a client module (it holds the browser Supabase
 * client), and `generateMetadata` runs on the server, so this is a plain
 * PostgREST fetch with the anon key rather than a second Supabase client.
 * Everything it reads is world-readable by RLS; a crawler sends no session.
 *
 * It deliberately selects no `document` — the card never needs the plan, and
 * a 100KB column on every crawler hit would be pure waste.
 */
export type PublishedMeta = {
  slug: string;
  title: string;
  description: string;
  teamName: string;
  regulation: string;
  species: string[];
  opponentCount: number;
  author: string | null;
};

type Row = {
  slug: string;
  title: string;
  description: string | null;
  team_name: string;
  regulation: string;
  species: string[];
  opponent_count: number;
  author: string | null;
};

export async function fetchPublishedMeta(
  slug: string,
): Promise<PublishedMeta | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !SLUG_RE.test(slug)) return null;

  // `feed_posts` already joins the username, and it is `security_invoker`, so
  // this reads exactly what an anonymous visitor may read.
  const query =
    `${url}/rest/v1/feed_posts` +
    `?select=slug,title,description,team_name,regulation,species,opponent_count,author` +
    `&slug=eq.${encodeURIComponent(slug)}&limit=1`;

  let rows: Row[];
  try {
    const res = await fetch(query, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      // A published page is a snapshot that changes only when its author
      // re-publishes, so a short shared cache is free; crawlers hit this.
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    rows = (await res.json()) as Row[];
  } catch {
    // A card is a nicety. If Supabase is unreachable the page must still
    // render, so a failure here degrades to the site's default metadata.
    return null;
  }

  const row = rows[0];
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    teamName: row.team_name,
    regulation: row.regulation,
    species: row.species ?? [],
    opponentCount: row.opponent_count,
    author: row.author,
  };
}

/** "by alice · 2 opposing teams · VGC 2026 Reg M-B" — the card's subtitle. */
export function cardSubtitle(meta: PublishedMeta): string {
  const regulation = meta.regulation.replace(/^\[.*?\]\s*/, "");
  const opponents =
    meta.opponentCount === 1
      ? "1 opposing team"
      : `${meta.opponentCount} opposing teams`;
  return [meta.author ? `by ${meta.author}` : null, opponents, regulation]
    .filter(Boolean)
    .join(" · ");
}
