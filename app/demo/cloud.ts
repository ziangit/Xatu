"use client";

import { getSupabase } from "../auth/client";
import type { SavedMatchup } from "./storage";

/**
 * Cloud copies of saved matchups — one `matchups` row per SavedMatchup,
 * payload = the whole object (full setup incl. verbatim exportText, so a
 * cloud round-trip loses nothing; the compact codec stays a paste format).
 * RLS scopes every query to the signed-in user; signed out or unconfigured
 * builds get "off" and the local-first flow is untouched.
 */

export type CloudList =
  | { state: "off" } // no Supabase env, or not signed in
  | { state: "ok"; matchups: SavedMatchup[] }
  | { state: "error"; message: string };

function isMatchup(payload: unknown): payload is SavedMatchup {
  const p = payload as SavedMatchup;
  return Boolean(
    p &&
    typeof p === "object" &&
    p.setup?.my?.parsed &&
    p.setup?.opp?.parsed &&
    Array.isArray(p.nodes),
  );
}

/**
 * The client, or null when accounts are off / nobody is signed in.
 *
 * Deliberately `getSession()` (a local read) rather than `getUser()` (a network
 * round trip to /auth/v1/user): this only decides whether to *attempt* a query,
 * and RLS is what actually authorizes it — a stale session gets an error from
 * Postgres, never someone else's rows. Saves a round trip on every call, which
 * is why the matchup list can wait for one request instead of two.
 */
async function userClient() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ? supabase : null;
}

export async function listCloudMatchups(): Promise<CloudList> {
  const supabase = await userClient();
  if (!supabase) return { state: "off" };
  const { data, error } = await supabase
    .from("matchups")
    .select("id,name,payload,saved_at")
    .order("saved_at", { ascending: false });
  if (error) return { state: "error", message: error.message };
  const matchups = data
    .filter((row) => isMatchup(row.payload))
    .map((row) => ({
      ...(row.payload as SavedMatchup),
      id: row.id,
      name: row.name,
      savedAt: row.saved_at,
    }));
  return { state: "ok", matchups };
}

/** Returns "off" (signed out), "ok", or an error message. */
export async function upsertCloudMatchup(
  matchup: SavedMatchup,
): Promise<"off" | "ok" | string> {
  const supabase = await userClient();
  if (!supabase) return "off";
  // `onConflict` must name the real key. A matchup id is unique per *account*
  // (see supabase/per-account-matchups.sql), so conflicting on `id` alone
  // would try to update a row belonging to whoever used this browser last —
  // which the owner-only policy then refuses, as it should.
  const { error } = await supabase.from("matchups").upsert(
    {
      id: matchup.id,
      name: matchup.name,
      payload: matchup,
      saved_at: matchup.savedAt,
    },
    { onConflict: "user_id,id" },
  );
  return error ? error.message : "ok";
}

export async function deleteCloudMatchup(
  id: string,
): Promise<"off" | "ok" | string> {
  const supabase = await userClient();
  if (!supabase) return "off";
  const { error } = await supabase.from("matchups").delete().eq("id", id);
  return error ? error.message : "ok";
}
