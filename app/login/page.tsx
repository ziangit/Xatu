"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../auth/client";

// Sign in / create account. Both paths — Google OAuth and email/password —
// go through Supabase Auth; xatu never sees or stores a password. Accounts
// only add cloud sync on top of the local-first flow: everything on /demo
// works signed out.

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [checked, setChecked] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      // Deferred so the effect body has no synchronous setState.
      queueMicrotask(() => setChecked(true));
      return;
    }
    let alive = true;
    client.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setSessionEmail(data.user?.email ?? null);
      setChecked(true);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (alive) setSessionEmail(session?.user?.email ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (err) setError(err.message);
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) setError(err.message);
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (err) setError(err.message);
      else if (!data.session) {
        setNotice(
          "Almost there — check your email for a confirmation link, then sign in.",
        );
      }
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-sm px-6 py-16">
        <header className="flex items-baseline justify-between">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            xatu
          </Link>
          <Link
            href="/demo"
            className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
          >
            builder →
          </Link>
        </header>

        {!checked ? null : !supabase ? (
          <div className="mt-10 rounded-lg border border-stone-200 bg-[#f6f5ef] p-5 text-sm leading-relaxed text-stone-600">
            Accounts aren&rsquo;t set up in this build. Everything still works
            without one — teams and matchups save to your browser.{" "}
            <Link href="/demo" className="underline underline-offset-2">
              Open the builder →
            </Link>
          </div>
        ) : sessionEmail ? (
          <div className="mt-10 rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-700">
              Signed in as <span className="font-medium">{sessionEmail}</span>
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="/demo"
                className="rounded-md bg-[#e5484d] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:opacity-85"
              >
                Open the builder
              </Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
              >
                sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-10">
            <h1 className="text-lg font-semibold tracking-tight">
              {mode === "signin" ? "Sign in" : "Create an account"}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-stone-400">
              An account syncs your teams and matchups across browsers. Only
              you can see them. Everything also works without one.
            </p>

            <button
              onClick={signInWithGoogle}
              className="mt-6 w-full rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:border-stone-500"
            >
              Continue with Google
            </button>

            <div className="mt-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-stone-300">
              <span className="h-px flex-1 bg-stone-200" />
              or
              <span className="h-px flex-1 bg-stone-200" />
            </div>

            <form onSubmit={submitEmail} className="mt-5 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                autoComplete="email"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
              />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "signup" ? "password (8+ characters)" : "password"
                }
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-[#e5484d] px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:opacity-85 disabled:opacity-40"
              >
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            {error && (
              <p className="mt-3 text-xs leading-relaxed text-red-600">
                {error}
              </p>
            )}
            {notice && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-800">
                {notice}
              </p>
            )}

            <p className="mt-6 text-xs text-stone-400">
              {mode === "signin" ? (
                <>
                  New here?{" "}
                  <button
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                      setNotice(null);
                    }}
                    className="underline underline-offset-2 hover:text-stone-800"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                      setNotice(null);
                    }}
                    className="underline underline-offset-2 hover:text-stone-800"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        )}

        <footer className="mt-16 border-t border-stone-200 pt-4 text-[11px] leading-relaxed text-stone-400">
          xatu is an unaffiliated, non-commercial fan project. Pokémon is owned
          by Nintendo, The Pokémon Company, Game Freak, and Creatures.
        </footer>
      </main>
    </div>
  );
}
