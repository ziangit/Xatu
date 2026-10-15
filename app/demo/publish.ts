"use client";

import { getSupabase } from "../auth/client";
import { currentUserId } from "../auth/session";
import { loadMyUsername } from "../auth/profile";
import { encodeGroup } from "./workflow-io";
import { pruneReport, reportKey, type Report } from "./report";
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
  /** The prose between matchups. Pruned to what can actually render. */
  report?: Report | null;
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
  report: Report | null;
  createdAt: string;
  updatedAt: string;
  author: string | null;
  /** The author's account id, so the reader can offer them a delete. */
  userId: string;
  /**
   * The set this was published from, so the author can be offered an edit.
   * Null on posts made before the column existed — see `adoptLegacyPost`.
   */
  teamId: string | null;
};

/** Where one of my sets is published, keyed by the set's team id. */
export type MyPublished = {
  slug: string;
  title: string;
  description: string;
  report: Report | null;
  updatedAt: string;
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
  const uid = await currentUserId();
  if (!uid) return { ok: false, reason: "signed-out" };

  // A byline needs a name. Gating here rather than at the button keeps the
  // rule in one place, and the caller turns this into "pick a username first".
  if (!(await loadMyUsername())) return { ok: false, reason: "no-username" };

  const title = input.title.trim();
  if (!title || input.boards.length === 0)
    return { ok: false, reason: "empty" };

  const row = {
    user_id: uid,
    // Which set this is, so a second publish updates rather than duplicates.
    team_id: input.my.id,
    title: title.slice(0, 120),
    description: input.description.trim().slice(0, 4000),
    // Published documents carry the **real sets**, not just rosters: a reader
    // who forks this should get a usable team, with moves in every picker and
    // numbers from the calculator. Without that a fork is six names — which is
    // how forking your own guide produced a worse copy of a team you had.
    document: encodeGroup(
      input.my,
      input.boards.map((b) => ({ opp: b.setup.opp, nodes: b.nodes })),
      { sets: true },
    ),
    team_name: input.my.name,
    regulation: input.my.format,
    species: input.my.parsed.map((m) => m.species),
    opponent_count: input.boards.length,
    // Null rather than `{}` when nothing was written, so the reader's "no
    // report" path is a plain null check.
    report: pruneReport(
      input.report,
      input.boards.map((b) => reportKey(b.setup.opp)),
    ),
    updated_at: new Date().toISOString(),
  };

  // Re-publishing this set updates the post it already has. Without this the
  // same set published twice became two public posts, which contradicted both
  // the panel's own "Publish again to update it" and docs/PRODUCT.md.
  const slug =
    existingSlug ??
    (await publishedSlugFor(supabase, uid, input.my.id)) ??
    (await adoptLegacyPost(supabase, uid, input.my.id, input.my.name));
  if (slug) {
    // An UPDATE, so re-publishing never costs daily quota either.
    const { error } = await supabase
      .from("published_groups")
      .update(row)
      .eq("slug", slug);
    return error
      ? { ok: false, reason: "error", detail: error.message }
      : { ok: true, slug };
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const fresh = newSlug();
    const { error } = await supabase
      .from("published_groups")
      .insert({ ...row, slug: fresh });
    if (!error) return { ok: true, slug: fresh };
    // P0001 is the daily cap in supabase/rate-limits.sql, raised by a trigger
    // the client cannot go around.
    if (error.code === "P0001") return { ok: false, reason: "rate-limited" };
    if (error.code !== "23505") {
      return { ok: false, reason: "error", detail: error.message };
    }
    // 23505 is either the slug (bad luck, retry) or `published_groups_one_per_set`
    // — another tab published this set a moment ago. Check before retrying, or
    // the loop burns five slugs and fails on something already done.
    const raced = await publishedSlugFor(supabase, uid, input.my.id);
    if (raced) {
      const { error: err } = await supabase
        .from("published_groups")
        .update(row)
        .eq("slug", raced);
      return err
        ? { ok: false, reason: "error", detail: err.message }
        : { ok: true, slug: raced };
    }
  }
  return { ok: false, reason: "error", detail: "could not allocate a slug" };
}

/**
 * A post of mine from before `team_id` existed, matched by the set's name.
 *
 * Without this, re-publishing a set that was published earlier would not find
 * its post and would mint a second one — leaving the first orphaned and public
 * with nothing in the app pointing at it. Deliberately narrow: it adopts only
 * when **exactly one** unstamped post of mine carries that team name, so two
 * sets that happen to share a name can never swap pages.
 *
 * One-way and self-erasing — once adopted the row has a `team_id` and this
 * never looks at it again.
 */
async function adoptLegacyPost(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
  teamId: string,
  teamName: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("published_groups")
    .select("slug")
    .eq("user_id", userId)
    .is("team_id", null)
    .eq("team_name", teamName);
  if (!data || data.length !== 1) return null;
  const slug = data[0].slug;
  const { error } = await supabase
    .from("published_groups")
    .update({ team_id: teamId })
    .eq("slug", slug);
  return error ? null : slug;
}

/** The slug this set is already published at, or null. */
async function publishedSlugFor(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
  teamId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("published_groups")
    .select("slug")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .maybeSingle();
  return data?.slug ?? null;
}

/**
 * Every set of mine that is published, keyed by the set's team id, so the
 * list can say which ones are public without a request per group.
 *
 * Posts made before `team_id` existed carry none and are simply absent here.
 * They are still removable from the post itself, which is the path that works
 * for every post regardless.
 */
export async function loadMyPublished(): Promise<Map<string, MyPublished>> {
  const out = new Map<string, MyPublished>();
  const supabase = getSupabase();
  if (!supabase) return out;
  const uid = await currentUserId();
  if (!uid) return out;
  const { data } = await supabase
    .from("published_groups")
    .select("slug,title,description,team_id,report,updated_at")
    .eq("user_id", uid);
  for (const row of data ?? []) {
    if (row.team_id)
      out.set(row.team_id, {
        slug: row.slug,
        title: row.title,
        description: row.description ?? "",
        report: (row.report as Report | null) ?? null,
        updatedAt: row.updated_at,
      });
  }
  return out;
}

/**
 * Take a post down. RLS refuses anyone but its author, so there is no owner
 * check here — and judge the result by rows, not by status: an anon DELETE
 * returns 204 having matched nothing, because the policy filters the rows out
 * before the delete sees them.
 */
export async function unpublishGroup(slug: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("published_groups")
    .delete()
    .eq("slug", slug)
    .select("slug");
  return !error && (data?.length ?? 0) > 0;
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
      "slug,title,description,document,team_name,regulation,species,opponent_count,report,created_at,updated_at,user_id,team_id",
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
    report: (data.report as Report | null) ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    author: profile?.username ?? null,
    userId: data.user_id,
    teamId: data.team_id ?? null,
  };
}
