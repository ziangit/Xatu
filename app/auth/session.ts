"use client";

import { getSupabase } from "./client";

/**
 * Who is signed in, read **locally**.
 *
 * `supabase.auth.getUser()` is a network round trip to `/auth/v1/user` that
 * validates the JWT with the server. `getSession()` reads the token the client
 * already holds. Measured on `/matchups`: six `getUser()` calls, one of them
 * 989ms, pushing first paint from ~450ms to 1,637ms.
 *
 * Using the local read is safe here because **RLS is the authority**, not this
 * function. Every query and mutation is scoped by `auth.uid()` in Postgres, so
 * the worst a stale or forged local session buys is a request the database
 * refuses. The same argument was already made for `userClient()` in
 * `app/demo/cloud.ts` (2026-08-12); this is that fix applied everywhere else.
 *
 * Do not use this to *authorise* anything in the browser. Nothing does.
 */
export async function currentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** The signed-in user's email, or null. Local read, same reasoning. */
export async function currentUserEmail(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email ?? null;
}
