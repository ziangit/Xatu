"use client";

import { getSupabase } from "../auth/client";
import { loadMyUsername } from "../auth/profile";
import { encodeGroup } from "./workflow-io";
import { newSlug, SLUG_RE } from "./slug";
import type { SavedMatchup, StoredTeam } from "./storage";

/**
 * Publishing a group — one of your teams against many opponents — under a short
 * slug anyone can open.
 *
 * What is stored is a **snapshot**: the exact `encodeGroup` string at the
 * moment you publish. Your local board keeps changing; the published page does
 * not, until you publish again. A link posted on X that silently rewrote itself
 * would be worse than no link.
 *
 * Sign-in is required (docs/PRODUCT.md, amended 2026-10-12), so ownership is
 * just `user_id` under RLS — no edit tokens, and no anonymous write endpoint.
 */

// The slug helpers live in `./slug`, which is server-safe; re-exported
// here so existing importers are unaffected.
export { newSlug, SLUG_RE } from "./slug";

export type PublishInput = {
  my: StoredTeam;
  boards: SavedMatchup[];
  title: string;
  description: string;
};

export type PublishResult =
  | { ok: true; slug: string }
  | {
      ok: false;
      reason: "signed-out" | "no-username" | "empty" | "rate-limited" | "error";
      detail?: string;
    };

export type PublishedGroup = {
  slug: string;
  title: string;
  description: string;
  document: string;
  teamName: string;
  regulation: string;
  species: string[];
  opponentCount: number;
  createdAt: string;
  updatedAt: string;
  author: string | null;
};

/**
 * Publish, or re-publish to the same slug when one is supplied.
 *
 * The slug is generated here and retried on collision rather than defaulted in
 * Postgres: the primary key is the only arbiter, and at eight characters from a
 * 28-letter alphabet a clash is vanishingly rare but not impossible.
 */
export async function publishGroup(
  input: PublishInput,
  existingSlug?: string,
): Promise<PublishResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: "signed-out" };
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, reason: "signed-out" };

  // A byline needs a name. Gating here rather than at the button keeps the
  // rule in one place, and the caller turns this into "pick a username first".
  if (!(await loadMyUsername())) return { ok: false, reason: "no-username" };

  const title = input.title.trim();
  if (!title || input.boards.length === 0)
    return { ok: false, reason: "empty" };

  const row = {
    user_id: uid,
    title: title.slice(0, 120),
    description: input.description.trim().slice(0, 4000),
    document: encodeGroup(
      input.my,
      input.boards.map((b) => ({ opp: b.setup.opp, nodes: b.nodes })),
    ),
    team_name: input.my.name,
    regulation: input.my.format,
    species: input.my.parsed.map((m) => m.species),
    opponent_count: input.boards.length,
    updated_at: new Date().toISOString(),
  };

  if (existingSlug) {
    // An UPDATE, so re-publishing an existing post never costs daily quota.
    const { error } = await supabase
      .from("published_groups")
      .update(row)
      .eq("slug", existingSlug);
    return error
      ? { ok: false, reason: "error", detail: error.message }
      : { ok: true, slug: existingSlug };
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug();
    const { error } = await supabase
      .from("published_groups")
      .insert({ ...row, slug });
    if (!error) return { ok: true, slug };
    // P0001 is the daily cap in supabase/rate-limits.sql, raised by a trigger
    // the client cannot go around. Distinct from 23505 (slug collision), which
    // is just bad luck and worth retrying.
    if (error.code === "P0001") return { ok: false, reason: "rate-limited" };
    if (error.code !== "23505") {
      return { ok: false, reason: "error", detail: error.message };
    }
    // 23505 on the primary key: that slug exists. Try another.
  }
  return { ok: false, reason: "error", detail: "could not allocate a slug" };
}

/** One published group by slug, for the reader page. Works signed out. */
export async function loadPublished(
  slug: string,
): Promise<PublishedGroup | null> {
  const supabase = getSupabase();
  if (!supabase || !SLUG_RE.test(slug)) return null;
  const { data } = await supabase
    .from("published_groups")
    .select(
      "slug,title,description,document,team_name,regulation,species,opponent_count,created_at,updated_at,user_id",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;

  // The byline is a second read on purpose: `profiles` is the only table that
  // may be joined to a public page, and it holds nothing but a username.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", data.user_id)
    .maybeSingle();

  return {
    slug: data.slug,
    title: data.title,
    description: data.description,
    document: data.document,
    teamName: data.team_name,
    regulation: data.regulation,
    species: data.species,
    opponentCount: data.opponent_count,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    author: profile?.username ?? null,
  };
}
