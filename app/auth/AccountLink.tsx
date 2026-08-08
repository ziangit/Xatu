"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "./client";

/**
 * Tiny header widget: "sign in" when signed out, email + sign out when
 * signed in, nothing at all when Supabase isn't configured (local-only
 * builds keep working with zero chrome).
 */
export function AccountLink() {
  const [email, setEmail] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setConfigured(true);
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setEmail(session?.user?.email ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!configured) return null;

  if (!email) {
    return (
      <Link
        href="/login"
        className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
      >
        sign in
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-2 text-xs text-stone-400">
      <span className="max-w-40 truncate" title={email}>
        {email}
      </span>
      <button
        onClick={() => getSupabase()?.auth.signOut()}
        className="underline-offset-2 hover:text-stone-800 hover:underline"
      >
        sign out
      </button>
    </span>
  );
}
