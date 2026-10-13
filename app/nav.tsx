"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AccountLink } from "./auth/AccountLink";
import { useT } from "./i18n/provider";
import { LangToggle } from "./i18n/toggle";
import { GITHUB_URL } from "./site";

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
  const t = useT();
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
        title={t("back to the home page")}
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
  const t = useT();
  return (
    <Link
      href="/"
      title={t("back to the home page")}
      className={`${LINK} inline-flex items-center gap-1`}
    >
      <HouseIcon />
      {t("home")}
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
  const t = useT();

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
      title={t("back to the previous page")}
      className={`${className} cursor-pointer`}
    >
      {t("nav|← back")}
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
/**
 * The project's source, as a mark rather than a word.
 *
 * It sits with the language toggle and the account widget because it is site
 * chrome, not an action on the page — and **its box is a fixed 16px in every
 * language**, which is what lets it sit on the toggle's right without
 * reintroducing the shift fixed on 2026-10-12. A word ("github") could not: it
 * is 6 characters in English and would be a different width the moment it were
 * translated.
 */
export function GitHubLink() {
  const t = useT();
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noreferrer"
      title={t("github")}
      aria-label={t("github")}
      className="shrink-0 text-stone-400 transition-colors hover:text-stone-900"
    >
      <svg
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill="currentColor"
        aria-hidden="true"
        className="block"
      >
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
    </a>
  );
}

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
      {/* Site chrome, not an action: the toggle doesn't navigate, so it sits
          outside the onBeforeLeave capture with the account widget. It brings
          its own leading hairline, as AccountLink does. */}
      <LangToggle />
      <GitHubLink />
      {/* AccountLink brings its own leading hairline — it renders nothing at
          all in local-only builds, and a stray divider would be left behind. */}
      <AccountLink />
    </nav>
  );
}

/**
 * The attribution notice, which has to appear in the UI. It was copy-pasted into
 * five pages; one copy means it can't drift and it's translated once. The
 * landing page keeps its own markup because it pairs the notice with a github
 * link on the same row — but it uses this same sentence.
 */
export function LegalFooter({ className = "mt-16" }: { className?: string }) {
  const t = useT();
  return (
    <footer
      className={`${className} border-t border-stone-200 pt-4 text-[11px] leading-relaxed text-stone-400`}
    >
      {t(
        "xatu is an unaffiliated, non-commercial fan project. Pokémon is owned by Nintendo, The Pokémon Company, Game Freak, and Creatures.",
      )}
    </footer>
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
