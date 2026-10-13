"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../auth/client";
import { checkUsername, isHandleAddress, loginAddress } from "../auth/handle";
import { currentUserEmail } from "../auth/session";
import { loadMyUsername } from "../auth/profile";
// The account widget is deliberately absent here — this page IS the account
// page — so the nav is hand-rolled instead of using HeaderNav.
import { BackLink, HomeLink, LegalFooter, Wordmark } from "../nav";
import { T } from "../i18n/T";
import { useT } from "../i18n/provider";
import { LangToggle } from "../i18n/toggle";

// Sign in / create account. Both paths — Google OAuth and email/password —
// go through Supabase Auth; xatu never sees or stores a password. Accounts
// only add cloud sync on top of the local-first flow: everything on /demo
// works signed out.

type Mode = "signin" | "signup";

export default function LoginPage() {
  const t = useT();
  const [checked, setChecked] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  /** The display name, for the signed-in line — the stored address is
   * synthetic and lower-cased, so it is the wrong thing to show. */
  const [myName, setMyName] = useState<string | null>(null);
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
    void currentUserEmail().then((mail) => {
      if (!alive) return;
      setSessionEmail(mail);
      setChecked(true);
      if (mail) void loadMyUsername().then((n) => alive && setMyName(n));
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setSessionEmail(session?.user?.email ?? null);
      setMyName(null);
      if (session?.user)
        void loadMyUsername().then((n) => alive && setMyName(n));
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

  /**
   * Username and password — no email anywhere, Showdown style.
   *
   * Sign-in resolves the username to the address the account is stored under
   * through `login_address()`, rather than deriving it, because a username can
   * be renamed and a derived address would stop matching. Sign-up goes through
   * our own route handler, which is the only point in the flow that can see
   * the client's IP and therefore the only place the per-IP cap can live.
   */
  const submitHandle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const problem = checkUsername(username);
    if (problem && mode === "signup") {
      // "taken" cannot appear here — only the database knows that, and it
      // comes back from the route as a 409.
      setError(
        problem === "reserved"
          ? t("That username is reserved.")
          : problem === "charset"
            ? t("Letters, digits, - and _ only.")
            : t("Usernames are 3–20 characters."),
      );
      setBusy(false);
      return;
    }

    if (mode === "signin") {
      const { data: address } = await supabase.rpc("login_address", {
        p_username: username.trim(),
      });
      // No synthetic address means no username account by that name. Said
      // plainly rather than "wrong password", which would be a lie.
      const { error: err } = address
        ? await supabase.auth.signInWithPassword({
            email: address as string,
            password,
          })
        : { error: { message: "" } };
      if (!address) setError(t("No account with that username."));
      else if (err) setError(t("Wrong username or password."));
      setBusy(false);
      return;
    }

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.ok) {
      // Autoconfirmed, so there is nothing to check an inbox for — sign
      // straight in with the address we just created.
      const { error: err } = await supabase.auth.signInWithPassword({
        email: loginAddress(username),
        password,
      });
      if (err) setNotice(t("Account created — sign in with it."));
    } else if (body.error === "ip-limit") {
      setError(
        t("That’s 3 accounts from this connection today — try again tomorrow."),
      );
    } else if (body.error === "taken") {
      setError(t("That username is taken."));
    } else if (body.error === "weak-password") {
      setError(t("Passwords are 8 characters or more."));
    } else {
      setError(t("Couldn’t create that account — try again."));
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-sm px-6 py-16">
        <header className="flex items-baseline justify-between">
          <Wordmark />
          <nav className="flex items-center gap-4">
            <BackLink fallback="/" />
            <HomeLink />
            <Link
              href="/matchups"
              className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              {t("matchups")}
            </Link>
            {/* No AccountLink on this page — it *is* the account page — so the
                toggle simply ends the bar. */}
            <LangToggle />
          </nav>
        </header>

        {!checked ? null : !supabase ? (
          <div className="mt-10 rounded-lg border border-stone-200 bg-[#f6f5ef] p-5 text-sm leading-relaxed text-stone-600">
            <T
              k="Accounts aren’t set up in this build. Everything still works without one — teams and matchups save to your browser. {0}"
              parts={[
                <Link
                  key="builder"
                  href="/matchups"
                  className="underline underline-offset-2"
                >
                  {t("Open my matchups →")}
                </Link>,
              ]}
            />
          </div>
        ) : sessionEmail ? (
          <div className="mt-10 rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-700">
              <T
                k="Signed in as {0}"
                parts={[
                  <span key="email" className="font-medium">
                    {/* A username account's stored address is synthetic
                        (`name@xatu.invalid`); showing it would be noise at
                        best and confusing at worst. */}
                    {myName ??
                      (isHandleAddress(sessionEmail)
                        ? sessionEmail.split("@")[0]
                        : sessionEmail)}
                  </span>,
                ]}
              />
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="/matchups"
                className="rounded-md bg-[#e5484d] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:opacity-85"
              >
                {t("Open my matchups")}
              </Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
              >
                {t("sign out")}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-10">
            <h1 className="text-lg font-semibold tracking-tight">
              {mode === "signin" ? t("Sign in") : t("Create an account")}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-stone-400">
              {t(
                "An account syncs your teams and matchups across browsers. Only you can see them. Everything also works without one.",
              )}
            </p>

            <button
              onClick={signInWithGoogle}
              className="mt-6 w-full rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:border-stone-500"
            >
              {t("Continue with Google")}
            </button>

            <div className="mt-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-stone-300">
              <span className="h-px flex-1 bg-stone-200" />
              {t("or")}
              <span className="h-px flex-1 bg-stone-200" />
            </div>

            <form onSubmit={submitHandle} className="mt-5 space-y-3">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("username")}
                autoComplete="username"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
              />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "signup"
                    ? t("password (8+ characters)")
                    : t("password")
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
                {mode === "signin" ? t("Sign in") : t("Create account")}
              </button>
              {mode === "signup" && (
                /* Said once, up front. There is no mailbox behind a username
                   account, so there is nothing to send a reset to — the same
                   bargain Showdown makes. */
                <p className="text-[11px] leading-relaxed text-stone-400">
                  {t(
                    "No email, so no password reset — keep it somewhere safe, or use Google instead.",
                  )}
                </p>
              )}
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
                  <T
                    k="New here? {0}"
                    parts={[
                      <button
                        key="signup"
                        onClick={() => {
                          setMode("signup");
                          setError(null);
                          setNotice(null);
                        }}
                        className="underline underline-offset-2 hover:text-stone-800"
                      >
                        {t("Create an account")}
                      </button>,
                    ]}
                  />
                </>
              ) : (
                <>
                  <T
                    k="Already have an account? {0}"
                    parts={[
                      <button
                        key="signin"
                        onClick={() => {
                          setMode("signin");
                          setError(null);
                          setNotice(null);
                        }}
                        className="underline underline-offset-2 hover:text-stone-800"
                      >
                        {t("Sign in")}
                      </button>,
                    ]}
                  />
                </>
              )}
            </p>
          </div>
        )}

        <LegalFooter />
      </main>
    </div>
  );
}
