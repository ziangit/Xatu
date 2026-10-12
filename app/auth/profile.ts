"use client";

import { getSupabase } from "./client";

/**
 * Public identity. One field: a username.
 *
 * The rule this module exists to enforce is that **nothing but the username is
 * ever shown publicly** — no email, no avatar, no join date, no follower count
 * (see docs/PRODUCT.md). `public.profiles` holds only a username and
 * timestamps, so a byline has nothing else to leak even by accident.
 *
 * A username is never derived from the email. `megazchomp@gmail.com` becoming
 * `megazchomp` would publish the local part of an address the user never chose
 * to show, which is the exact thing the separate table is here to prevent.
 */

/** Mirrors `profiles_username_shape` in supabase/profiles.sql — keep both. */
const SHAPE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,19}$/;

/** Names that would let someone pose as the site. Short on purpose. */
const RESERVED = new Set([
  "xatu",
  "admin",
  "administrator",
  "moderator",
  "mod",
  "support",
  "official",
  "system",
  "root",
]);

export type UsernameProblem = "too-short" | "too-long" | "charset" | "reserved";

/** Null when the name is usable. Pure, so it is unit-tested. */
export function checkUsername(raw: string): UsernameProblem | null {
  const name = raw.trim();
  if (name.length < 3) return "too-short";
  if (name.length > 20) return "too-long";
  if (!SHAPE.test(name)) return "charset";
  if (RESERVED.has(name.toLowerCase())) return "reserved";
  return null;
}

export type SaveResult =
  | { ok: true; username: string }
  | { ok: false; reason: UsernameProblem | "taken" | "signed-out" | "error" };

/** This user's username, or null when they have not chosen one yet. */
export async function loadMyUsername(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) return null;
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", id)
    .maybeSingle();
  return data?.username ?? null;
}

/**
 * Claim or change a username. Upsert on the primary key, so the first call
 * creates the row and later ones rename — the caller never has to know which.
 *
 * Uniqueness is the database's job, not a pre-flight SELECT: two people typing
 * the same name at once would both pass that check. The unique index on
 * `lower(username)` decides, and `23505` comes back as "taken".
 */
export async function saveMyUsername(raw: string): Promise<SaveResult> {
  const problem = checkUsername(raw);
  if (problem) return { ok: false, reason: problem };
  const username = raw.trim();

  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: "signed-out" };
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) return { ok: false, reason: "signed-out" };

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: id, username, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (!error) return { ok: true, username };
  return { ok: false, reason: error.code === "23505" ? "taken" : "error" };
}
