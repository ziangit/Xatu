"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { getSupabase, supabaseConfigured } from "./client";

/**
 * Header account control: "sign in" when signed out, an initial-avatar menu
 * when signed in, nothing at all when Supabase isn't configured (local-only
 * builds keep working with zero chrome).
 *
 * The email and sign-out live inside the menu on purpose — spelled out in the
 * bar they were the widest thing in it, and every page carries this widget.
 */
export function AccountLink() {
  // Known before the first paint, so the slot never appears out of nowhere.
  const configured = supabaseConfigured();
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setChecked(true);
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
        sign in
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
        aria-label={`account menu for ${email}`}
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
            aria-label="close account menu"
          />
          <div
            role="menu"
            className="pop-in absolute right-0 z-50 mt-1.5 w-52 rounded-md border border-stone-200 bg-white p-1 shadow-lg"
          >
            <p
              className="truncate px-2 py-1.5 text-[11px] text-stone-400"
              title={email}
            >
              {email}
            </p>
            <Link
              href="/matchups"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded px-2 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              My matchups
            </Link>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void getSupabase()?.auth.signOut();
              }}
              className="block w-full rounded px-2 py-1.5 text-left text-xs text-stone-700 hover:bg-stone-50"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>,
  );
}
