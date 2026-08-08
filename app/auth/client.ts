"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client, or null when the env isn't configured — every
 * caller must treat null as "accounts are off" and keep the local-first flow
 * working. Cookie-based (@supabase/ssr) so server-side auth can plug in at
 * hosting time without re-authing anyone.
 */
let client: SupabaseClient | null | undefined;

/**
 * Whether accounts exist in this build — answerable synchronously (the vars are
 * inlined at build time) and without constructing a client, so the header can
 * reserve the account widget's space on the very first paint instead of popping
 * it in when the session check resolves.
 */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createBrowserClient(url, key) : null;
  return client;
}
