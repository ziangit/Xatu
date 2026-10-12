"use client";

import { getSupabase } from "../auth/client";

/**
 * The forum: a feed of published groups, likes, and flat comments.
 *
 * Everything here reads fine signed out — that is the point of a public post.
 * Writing needs a session, and the database is the authority: RLS decides, not
 * a disabled button. The UI hides what you cannot do as a courtesy, never as
 * the protection.
 */

export type FeedPost = {
  slug: string;
  title: string;
  description: string;
  teamName: string;
  regulation: string;
  species: string[];
  opponentCount: number;
  createdAt: string;
  author: string | null;
  likeCount: number;
  commentCount: number;
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: string | null;
  mine: boolean;
};

export type FeedSort = "new" | "liked";

const FEED_COLUMNS =
  "slug,title,description,team_name,regulation,species,opponent_count,created_at,author,like_count,comment_count";

type FeedRow = {
  slug: string;
  title: string;
  description: string;
  team_name: string;
  regulation: string;
  species: string[];
  opponent_count: number;
  created_at: string;
  author: string | null;
  like_count: number | string;
  comment_count: number | string;
};

/** Postgres `count(*)` arrives as a string over PostgREST; make it a number. */
const toPost = (r: FeedRow): FeedPost => ({
  slug: r.slug,
  title: r.title,
  description: r.description,
  teamName: r.team_name,
  regulation: r.regulation,
  species: r.species ?? [],
  opponentCount: r.opponent_count,
  createdAt: r.created_at,
  author: r.author,
  likeCount: Number(r.like_count ?? 0),
  commentCount: Number(r.comment_count ?? 0),
});

export async function loadFeed(
  sort: FeedSort = "new",
  limit = 50,
): Promise<FeedPost[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  // "Most liked" ties broken by recency, so a feed of all-zero likes still
  // reads newest-first rather than in whatever order the planner picked.
  const query = supabase.from("feed_posts").select(FEED_COLUMNS).limit(limit);
  const { data } = await (sort === "liked"
    ? query
        .order("like_count", { ascending: false })
        .order("created_at", { ascending: false })
    : query.order("created_at", { ascending: false }));
  return ((data ?? []) as unknown as FeedRow[]).map(toPost);
}

/** Like count for one post, and whether the current viewer is one of them. */
export async function loadLikes(
  slug: string,
): Promise<{ count: number; mine: boolean }> {
  const supabase = getSupabase();
  if (!supabase) return { count: 0, mine: false };
  const { count } = await supabase
    .from("post_likes")
    .select("slug", { count: "exact", head: true })
    .eq("slug", slug);
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { count: count ?? 0, mine: false };
  const { data } = await supabase
    .from("post_likes")
    .select("slug")
    .eq("slug", slug)
    .eq("user_id", uid)
    .maybeSingle();
  return { count: count ?? 0, mine: Boolean(data) };
}

/** Toggle. Returns the new state, or null when not signed in. */
export async function toggleLike(
  slug: string,
  liked: boolean,
): Promise<boolean | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  if (liked) {
    await supabase
      .from("post_likes")
      .delete()
      .eq("slug", slug)
      .eq("user_id", uid);
    return false;
  }
  // A duplicate is the primary key doing its job, not an error worth showing.
  const { error } = await supabase
    .from("post_likes")
    .insert({ slug, user_id: uid });
  return error && error.code !== "23505" ? null : true;
}

export async function loadComments(slug: string): Promise<Comment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("post_comments")
    .select("id,body,created_at,user_id")
    .eq("slug", slug)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as {
    id: string;
    body: string;
    created_at: string;
    user_id: string;
  }[];
  if (rows.length === 0) return [];

  // One lookup for every commenter, not one per comment. `profiles` is the
  // only table a public page may join to, and it holds nothing but a username.
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id,username")
    .in("user_id", ids);
  const names = new Map(
    ((profiles ?? []) as { user_id: string; username: string }[]).map((p) => [
      p.user_id,
      p.username,
    ]),
  );
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id ?? null;
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    author: names.get(r.user_id) ?? null,
    mine: r.user_id === me,
  }));
}

export type CommentResult =
  { ok: true } | { ok: false; reason: "signed-out" | "empty" | "error" };

export async function addComment(
  slug: string,
  body: string,
): Promise<CommentResult> {
  const text = body.trim();
  if (!text) return { ok: false, reason: "empty" };
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: "signed-out" };
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, reason: "signed-out" };
  const { error } = await supabase
    .from("post_comments")
    .insert({ slug, user_id: uid, body: text.slice(0, 2000) });
  return error ? { ok: false, reason: "error" } : { ok: true };
}

/** Delete your own. RLS refuses anyone else's, so this needs no owner check. */
export async function deleteComment(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("post_comments").delete().eq("id", id);
  return !error;
}
