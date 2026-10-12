"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { getSupabase, supabaseConfigured } from "./client";
import { checkUsername, loadMyUsername, saveMyUsername } from "./profile";
import { InlineRename } from "../ui";
import { useT } from "../i18n/provider";

/**
 * Header account control: "sign in" when signed out, an initial-avatar menu
 * when signed in, nothing at all when Supabase isn't configured (local-only
 * builds keep working with zero chrome).
 *
 * The email and sign-out live inside the menu on purpose — spelled out in the
 * bar they were the widest thing in it, and every page carries this widget.
 *
 * The username lives here too, and this is the only place to set it. That is
 * the whole discoverability plan: it sits in the menu you already open to find
 * your matchups or sign out, it is the first line, and until you pick one it
 * says so in amber rather than hiding. A username is required before you can
 * publish or comment, so it must not be somewhere people have to hunt for.
 *
 * The email shown here is your own, in your own menu — it is how you tell which
 * account you are in. It is never rendered anywhere public; see `profile.ts`.
 */
export function AccountLink() {
  const t = useT();
  // Known before the first paint, so the slot never appears out of nowhere.
  const configured = supabaseConfigured();
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setChecked(true);
      setEmail(data.user?.email ?? null);
    });
    void loadMyUsername().then((u) => {
      if (alive) setUsername(u);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setEmail(session?.user?.email ?? null);
      void loadMyUsername().then((u) => {
        if (alive) setUsername(u);
      });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!configured) return null;

  // Hairline lives here so local-only builds render no divider at all.
  const divider = (
    <span aria-hidden="true" className="h-4 w-px shrink-0 bg-stone-200" />
  );

  // The session check is async and its two outcomes ("sign in" text vs. a 24px
  // avatar) aren't the same width, so the slot is a fixed size: nothing in the
  // bar moves when the check lands, and the widget never appears from nowhere.
  const slot = (children: ReactNode) => (
    <>
      {divider}
      <span className="flex w-14 shrink-0 justify-end">{children}</span>
    </>
  );

  if (!checked) {
    return slot(
      <span aria-hidden="true" className="h-6 w-6 rounded-full bg-stone-100" />,
    );
  }

  if (!email) {
    return slot(
      <Link
        href="/login"
        className="fade-in whitespace-nowrap text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
      >
        {t("sign in")}
      </Link>,
    );
  }

  return slot(
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={email}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("account menu for {email}", { email })}
        className="rise-in flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-[11px] font-semibold uppercase text-stone-600 transition-colors hover:bg-stone-300"
      >
        {email[0]}
      </button>
      {open && (
        <>
          {/* Click-anywhere-else to dismiss. */}
          <button
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label={t("close account menu")}
          />
          <div
            role="menu"
            className="pop-in absolute right-0 z-50 mt-1.5 w-52 rounded-md border border-stone-200 bg-white p-1 shadow-lg"
          >
            {/* Username first: it is the public one, and the only identity
                anyone else ever sees. */}
            <div className="px-2 py-1.5">
              {editing ? (
                <InlineRename
                  value={username ?? ""}
                  label={t("Username")}
                  onRename={(next) => {
                    const bad = checkUsername(next);
                    if (bad) {
                      setProblem(bad);
                      return;
                    }
                    setProblem(null);
                    setEditing(false);
                    void saveMyUsername(next).then((r) => {
                      if (r.ok) setUsername(r.username);
                      else {
                        setProblem(r.reason);
                        setEditing(true);
                      }
                    });
                  }}
                  onCancel={() => {
                    setProblem(null);
                    setEditing(false);
                  }}
                  className="w-full"
                />
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span
                    className={`min-w-0 flex-1 truncate text-xs font-semibold ${
                      username ? "text-stone-800" : "text-amber-700"
                    }`}
                  >
                    {username ?? t("Pick a username")}
                  </span>
                  <span className="shrink-0 text-[10px] text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline">
                    {username ? t("edit") : t("set")}
                  </span>
                </button>
              )}
              {problem && (
                <p className="mt-1 text-[10px] leading-relaxed text-amber-700">
                  {problem === "taken"
                    ? t("That username is taken.")
                    : problem === "reserved"
                      ? t("That username is reserved.")
                      : problem === "too-short" || problem === "too-long"
                        ? t("Usernames are 3–20 characters.")
                        : problem === "charset"
                          ? t("Letters, digits, - and _ only.")
                          : t("Couldn’t save that — try again.")}
                </p>
              )}
              {!username && !editing && !problem && (
                <p className="mt-1 text-[10px] leading-relaxed text-stone-400">
                  {t("Needed before you can publish or comment.")}
                </p>
              )}
              <p
                className="mt-1.5 truncate text-[10px] text-stone-400"
                title={email}
              >
                {email}
              </p>
            </div>
            <Link
              href="/matchups"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded px-2 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              {t("My matchups")}
            </Link>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void getSupabase()?.auth.signOut();
              }}
              className="block w-full rounded px-2 py-1.5 text-left text-xs text-stone-700 hover:bg-stone-50"
            >
              {t("Sign out")}
            </button>
          </div>
        </>
      )}
    </div>,
  );
}
