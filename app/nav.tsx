"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AccountLink } from "./auth/AccountLink";

/**
 * Shared page chrome. Every page gets the same three guarantees from here: the
 * wordmark is a visible link home, the header carries an explicit "home" link,
 * and it carries a "back" link to wherever the reader came from. New pages use
 * these instead of hand-rolling a header, so no page can ship as a dead end.
 */

const LINK =
  "shrink-0 whitespace-nowrap text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline";

/**
 * The wordmark — always a link home, and styled so it looks like one. Pages
 * whose `h1` is their own content (the board's matchup title) pass
 * `heading={false}` so there's exactly one `h1` per page.
 */
export function Wordmark({
  tag,
  heading = true,
}: {
  tag?: string;
  heading?: boolean;
}) {
  const Tag = heading ? "h1" : "div";
  return (
    <Tag
      className={
        heading
          ? "text-lg font-semibold tracking-tight"
          : "text-sm font-semibold tracking-tight"
      }
    >
      <Link
        href="/"
        title="back to the home page"
        className="font-display font-bold underline-offset-4 hover:underline"
      >
        xatu
      </Link>
      {tag && <span className="font-normal text-stone-400"> — {tag}</span>}
    </Tag>
  );
}

/** A drawn house — `⌂` renders as a lopsided box in most UI fonts. */
function HouseIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.25 6.75 8 2.25l5.75 4.5v6a1 1 0 0 1-1 1h-9.5a1 1 0 0 1-1-1v-6Z" />
      <path d="M6.25 13.75V9.25h3.5v4.5" />
    </svg>
  );
}

/** The explicit way home, for headers that can't use `HeaderNav` wholesale. */
export function HomeLink() {
  return (
    <Link
      href="/"
      title="back to the home page"
      className={`${LINK} inline-flex items-center gap-1`}
    >
      <HouseIcon />
      home
    </Link>
  );
}

/**
 * Back to wherever the reader actually came from — real history, so a board
 * opened from /matchups goes back to /matchups and the same board opened from
 * the builder goes back to the builder.
 *
 * `fallback` covers the two cases where history can't be trusted: the page was
 * opened directly (a typed URL or a new tab, so there is nothing to go back to)
 * and the previous entry is another site (following back would leave xatu, which
 * is not what a back link inside the app should do). Soft navigations don't
 * update `document.referrer`, so an empty referrer with history behind it is an
 * in-app hop and counts as safe.
 */
export function BackLink({
  fallback,
  className = LINK,
}: {
  fallback: string;
  /** Override when back sits among buttons rather than nav links (the board
   * puts it left of Reset, so it has to look like Reset). */
  className?: string;
}) {
  const router = useRouter();

  // Decided at click time, not in an effect: no state to hydrate, and the
  // answer is only ever needed once the reader has actually clicked.
  const canGoBack = () => {
    const sameSite =
      !document.referrer ||
      new URL(document.referrer).origin === window.location.origin;
    return window.history.length > 1 && sameSite;
  };

  return (
    <button
      type="button"
      onClick={() => (canGoBack() ? router.back() : router.push(fallback))}
      title="back to the previous page"
      className={`${className} cursor-pointer`}
    >
      ← back
    </button>
  );
}

/**
 * Header links: back and home first, then page-specific ones, then the account
 * behind a hairline. Labels are plain nouns — arrows and possessives ("my
 * matchups →") made the bar read as a wall of text on the wider pages.
 *
 * `onBeforeLeave` runs before any of the navigation links act (not the account
 * menu, which doesn't navigate) — the board uses it to save work in flight, the
 * same way switching opponents does.
 */
export function HeaderNav({
  back,
  onBeforeLeave,
  children,
}: {
  back?: string;
  onBeforeLeave?: () => void;
  children?: ReactNode;
}) {
  return (
    <nav className="flex shrink-0 items-center gap-4">
      <span
        className="flex shrink-0 items-center gap-4"
        onClickCapture={onBeforeLeave}
      >
        {back && <BackLink fallback={back} />}
        <HomeLink />
        {children}
      </span>
      {/* AccountLink brings its own leading hairline — it renders nothing at
          all in local-only builds, and a stray divider would be left behind. */}
      <AccountLink />
    </nav>
  );
}

/** A page-specific header link, matching the nav's weight. */
export function NavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={LINK}>
      {children}
    </Link>
  );
}
