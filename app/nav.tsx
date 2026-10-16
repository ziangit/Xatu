"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AccountLink } from "./auth/AccountLink";
import { useT } from "./i18n/provider";
import { LangToggle } from "./i18n/toggle";
import { DISCORD_URL, GITHUB_URL } from "./site";

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

/**
 * The Discord server, as the brand mark.
 *
 * Fixed width, and it sits where the github icon does — to the **right** of
 * the language toggle, which is only safe because both are icons of a size
 * that does not change with the language. Nothing whose width varies may go
 * there; see docs/ARCHITECTURE.md → "Header order".
 *
 * Renders nothing at all when `DISCORD_URL` is unset, so the header does not
 * carry a dead link in a build that has no server.
 */
export function DiscordLink() {
  const t = useT();
  if (!DISCORD_URL) return null;
  return (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noreferrer"
      title={t("discord")}
      aria-label={t("discord")}
      className="shrink-0 text-stone-400 transition-colors hover:text-[#5865F2]"
    >
      <svg
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="currentColor"
        aria-hidden="true"
        className="block"
      >
        <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286ZM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189Zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
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
  // `shrink-0` so a long page title can never squeeze the nav; on a phone the
  // header wraps and the nav takes its own line — and when even that line is
  // too narrow (Japanese, with a back link, on a 375px screen) the nav itself
  // wraps rather than pushing the account slot off the edge.
  return (
    <nav className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 max-sm:w-full">
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
      {/* The two icons are the first thing to go on a phone: at 390px the
          nav is 379px wide with them and would push the account slot off the
          edge. `contents` keeps them flex items when they are shown. */}
      <span className="hidden sm:contents">
        <GitHubLink />
        <DiscordLink />
      </span>
      {/* AccountLink brings its own leading hairline — it renders nothing at
          all in local-only builds, and a stray divider would be left behind. */}
      <AccountLink />
    </nav>
  );
}

/**
 * The attribution notice, which has to appear in the UI. It was copy-pasted into
 * five pages; one copy means it can't drift and it's translated once. The
 * landing page hand-rolled its own row until 2026-10-15, to pair the notice
 * with a github link — that link is gone, the header carries the mark on
 * every page, and the landing page uses this like everywhere else.
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
