"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountLink } from "./auth/AccountLink";
import { supabaseConfigured } from "./auth/client";
import { loadFeed, type FeedPost } from "./demo/forum";
import { PostCard } from "./feed/post-card";
import { MonIcon, TYPE_COLORS } from "./demo/components";
import { useT } from "./i18n/provider";
import { LangToggle } from "./i18n/toggle";

// Landing page. Visual language is the sim board's own — paper ground, stone
// ink, Simulate red, branch amber — so the page opens straight into the tool
// without a costume change. The hero is a miniature of the real artifact: a
// turn tree with Showdown minisprites that draws itself on load.

const MY = [
  "Tyranitar",
  "Excadrill",
  "Milotic",
  "Gholdengo",
  "Sinistcha",
  "Staraptor",
];
const OPP = [
  "Aerodactyl",
  "Charizard",
  "Garchomp",
  "Sylveon",
  "Kingambit",
  "Dragonite",
];

function IconRow({ species, scale }: { species: string[]; scale: number }) {
  return (
    <span className="flex">
      {species.map((s) => (
        <MonIcon key={s} species={s} scale={scale} />
      ))}
    </span>
  );
}

/**
 * The three newest published matchups, on the landing page.
 *
 * The feed is the thing the site is for, and a button labelled "Published
 * matchups" asks someone to imagine what is behind it. Real cards do not.
 *
 * Exactly three — one row — and `see all` for the rest. That is a shortcut
 * into the feed, not the feed; a landing page that keeps scrolling buries
 * everything under it.
 *
 * Two rules it has to keep. It renders **nothing at all** when Supabase is
 * unconfigured, which `supabaseConfigured()` answers synchronously, so the
 * local-first build has no hole where this would be. And the row has a
 * reserved height above `md`, which earns its keep twice: the fetch lands
 * after first paint, and the card's byline wraps to two lines in English and
 * Japanese but one in Chinese (measured 195 / 180 / 197px), which would
 * otherwise move the section below it.
 *
 * 12.5rem covers all three. It cannot cover everything — a card is mostly
 * somebody's title and description, so a long post makes a tall row in any
 * language. That much is author content, and pinning it is neither possible
 * nor desirable.
 */
function PublishedStrip() {
  const t = useT();
  const [posts, setPosts] = useState<FeedPost[] | null>(null);

  useEffect(() => {
    let alive = true;
    void loadFeed("new", 3).then((p) => alive && setPosts(p));
    return () => {
      alive = false;
    };
  }, []);

  if (!supabaseConfigured()) return null;

  return (
    <section className="border-t border-stone-200 py-14">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight">
          {t("Published matchups")}
        </h2>
        <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-stone-400 sm:inline">
          {t("from the community")}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-stone-200" />
        <Link
          href="/feed"
          className="shrink-0 text-xs text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
        >
          {t("see all →")}
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:min-h-[12.5rem] md:grid-cols-3">
        {posts === null ? (
          // Invisible for 300ms, so a quick response replaces it before it was
          // ever seen — the `.late-fade-in` rule from /matchups.
          <p className="late-fade-in text-xs text-stone-400">{t("Loading…")}</p>
        ) : posts.length === 0 ? (
          <p className="text-xs text-stone-400">
            {t("Nothing published yet.")}
          </p>
        ) : (
          <>
            {posts.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
            {/* Until three posts exist, the row is mostly empty space. One
                dashed tile in the gap makes that read as an invitation rather
                than as something that failed to load — and it is the only
                place the landing page says you can publish at all. */}
            {posts.length < 3 && (
              <Link
                href="/matchups"
                className="hidden items-center justify-center rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs text-stone-400 transition-colors hover:border-stone-400 hover:text-stone-600 md:flex"
              >
                {t("Publish yours →")}
              </Link>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** A declared-move chip, exactly as the board renders them: attacker icon +
 * move on its type color; spread moves carry no target arrow. */
function MoveChip({
  attacker,
  move,
  color,
  target,
}: {
  attacker: string;
  move: string;
  color: string;
  target?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      <MonIcon species={attacker} scale={0.5} />
      {move}
      {target && (
        <>
          <span className="opacity-80">→</span>
          <MonIcon species={target} scale={0.5} />
        </>
      )}
    </span>
  );
}

function TreeCard({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`land-rise absolute rounded-lg border border-stone-200 bg-white p-2.5 ${className ?? ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

/** The hero artifact: Turn 0 team preview branching into a main and an
 * alternate Turn 1 — the product in miniature, drawn with its real parts. */
function HeroTree() {
  const t = useT();
  return (
    <div
      className="relative h-[300px] w-[412px] shrink-0"
      aria-label={t(
        "A miniature matchup tree: team preview branching into two turn-one lines",
      )}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <marker
            id="land-arrow-main"
            markerWidth="8"
            markerHeight="8"
            refX="6.5"
            refY="4"
            orient="auto"
          >
            <path d="M1 1 L7 4 L1 7 Z" fill="#b3ada4" />
          </marker>
          <marker
            id="land-arrow-branch"
            markerWidth="8"
            markerHeight="8"
            refX="6.5"
            refY="4"
            orient="auto"
          >
            <path d="M1 1 L7 4 L1 7 Z" fill="#d97706" />
          </marker>
        </defs>
        <g className="land-fade" style={{ animationDelay: "0.75s" }}>
          <circle cx="170" cy="128" r="3" fill="#b3ada4" />
          <path
            className="land-draw"
            style={{ animationDelay: "0.75s" }}
            d="M 170 128 C 206 128, 206 50, 233 50"
            fill="none"
            stroke="#b3ada4"
            strokeWidth="1.75"
            strokeLinecap="round"
            markerEnd="url(#land-arrow-main)"
          />
        </g>
        <g className="land-fade" style={{ animationDelay: "0.95s" }}>
          <circle cx="170" cy="140" r="3" fill="#d97706" />
          <path
            d="M 170 140 C 206 140, 206 210, 233 210"
            fill="none"
            stroke="#d97706"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeDasharray="5 4"
            markerEnd="url(#land-arrow-branch)"
          />
        </g>
      </svg>

      <TreeCard
        className="left-0 top-[100px] w-[170px]"
        style={{ animationDelay: "0.35s" }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">
          {t("Turn 0 · team preview")}
        </p>
        <div className="mt-1.5 space-y-0.5">
          <IconRow species={MY} scale={0.5} />
          <IconRow species={OPP} scale={0.5} />
        </div>
      </TreeCard>

      <TreeCard
        className="left-[240px] top-0 w-[172px]"
        style={{ animationDelay: "0.5s" }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">
          {t("Turn {n}", { n: 1 })}
        </p>
        <div className="mt-1 flex items-center gap-1">
          <IconRow species={["Tyranitar", "Excadrill"]} scale={0.75} />
          <span className="px-0.5 text-[9px] text-stone-300">vs</span>
          <IconRow species={["Aerodactyl", "Kingambit"]} scale={0.75} />
        </div>
        <div className="mt-1.5 space-y-1">
          <div>
            {/* Rock Slide is allAdjacentFoes, so it carries no target arrow —
                the board skips the target step for spread moves and the hero
                has to agree with it. */}
            <MoveChip
              attacker="Tyranitar"
              move="Rock Slide"
              color={TYPE_COLORS.Rock}
            />
          </div>
          <div>
            {/* Kingambit, not Aerodactyl. Ground vs Rock/Flying is 0x — the
                hero shipped a play that does literally nothing, which is the
                one kind of mistake this audience spots instantly. Dark/Steel
                takes it at 2x. */}
            <MoveChip
              attacker="Excadrill"
              move="High Horsepower"
              color={TYPE_COLORS.Ground}
              target="Kingambit"
            />
          </div>
        </div>
      </TreeCard>

      <TreeCard
        className="left-[240px] top-[172px] w-[172px]"
        style={{ animationDelay: "0.6s" }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-widest text-amber-600">
          {t("⑂ if they lead {species}", { species: "Charizard" })}
        </p>
        <div className="mt-1 flex items-center gap-1">
          <IconRow species={["Gholdengo", "Milotic"]} scale={0.75} />
          <span className="px-0.5 text-[9px] text-stone-300">vs</span>
          <IconRow species={["Charizard", "Sylveon"]} scale={0.75} />
        </div>
        <div className="mt-1.5 space-y-1">
          <div>
            {/* Make It Rain is allAdjacentFoes too, so the target arrow it
                used to carry was wrong twice over — the board would never
                offer one, and Steel into Fire/Flying is 0.5x anyway. As a
                spread it reads correctly: resisted by Charizard, 2x on
                Sylveon. */}
            <MoveChip
              attacker="Gholdengo"
              move="Make It Rain"
              color={TYPE_COLORS.Steel}
            />
          </div>
          <div>
            {/* Milotic used to stand there doing nothing while its partner
                moved. Icy Wind is the speed control it is actually brought
                for, and turn-one speed control is the thing this product is
                for planning. */}
            <MoveChip
              attacker="Milotic"
              move="Icy Wind"
              color={TYPE_COLORS.Ice}
            />
          </div>
        </div>
      </TreeCard>
    </div>
  );
}

const SAMPLE_JSON = `{"v":2,"my":{"n":"Sand","f":"","s":["Tyranitar","Excadrill","Milotic","Gholdengo","Sinistcha","Staraptor"]},"op":{"n":"Rain","f":"","s":["Aerodactyl","Charizard","Garchomp","Sylveon","Kingambit","Dragonite"]},"t":[[0,"01|23","01|23"],[1,"01|23||0:Rock Slide,1:High Horsepower>f0","04|23"],[1,"32|05","14|30"]]}`;

export default function LandingPage() {
  const t = useT();
  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-5xl px-6">
        <header className="land-rise flex items-center justify-between py-6">
          <span className="font-display text-lg font-bold tracking-tight">
            xatu
          </span>
          <span className="flex items-center gap-4">
            <LangToggle />
            <AccountLink />
            <Link
              href="/matchups"
              className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              {t("my matchups →")}
            </Link>
          </span>
        </header>

        <section className="flex flex-col items-start gap-12 pb-20 pt-12 lg:flex-row lg:items-center lg:gap-16 lg:pt-16">
          {/* The hero is sized for its *tallest* language, not for English.
              Chinese sets ~40% narrower and the headline fits on one line, so
              left to itself this column is 228px tall in 中 and 364px in 日 —
              a 136px jump, which moves the tree, the CTA and every section
              below it the moment someone touches the language toggle.

              The width is pinned for the same reason: a content-sized flex
              child is 500px in en/ja and 448px in zh, which slid the tree
              sideways by 50px. 500px is what English already measured, so
              English is unchanged and the other two come to it.

              If you edit this copy, re-measure: the number is the natural
              height of the tallest language, and today that is Japanese. */}
          <div className="w-full lg:min-h-[22.75rem] lg:w-[31.25rem]">
            <p
              className="land-rise text-[10px] font-semibold uppercase tracking-widest text-stone-400"
              style={{ animationDelay: "0.05s" }}
            >
              {t("Matchup planning for Pokémon doubles · bring 6 · pick 4")}
            </p>
            <h1
              // Deliberately NOT height-reserved, unlike the paragraph below.
              // Two lines were reserved here first and it looked broken: 中
              // fits on one line, and a 63px hole under a 60px headline reads
              // as a bug. The column's min-height absorbs it instead, where
              // the slack lands below the buttons and is just whitespace.
              className="land-rise mt-4 font-display text-5xl font-bold leading-[1.04] tracking-tight md:text-6xl"
              style={{ animationDelay: "0.1s" }}
            >
              {t("See turn one coming.")}
            </h1>
            <p
              // Three lines reserved (3 x leading-relaxed = 4.875em), same
              // reason as the headline: 中 uses two.
              className="land-rise mt-5 min-h-[4.875em] max-w-md text-sm leading-relaxed text-stone-500"
              style={{ animationDelay: "0.2s" }}
            >
              {t(
                "xatu turns the “vs. common archetypes” section of a team report into a turn-by-turn map — which four you bring, who leads, and what the first two turns look like. Named after the bird that sees the future.",
              )}
            </p>
            <div
              className="land-rise mt-7 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.3s" }}
            >
              {/* One button, where there were two. "Try new match ups" and
                  "My matchups" were the new-vs-existing split of one page, and
                  once the builder merged into /matchups they pointed at the
                  same URL — which is the confusion they were meant to solve. */}
              <Link
                href="/matchups"
                className="rounded-md bg-[#e5484d] px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-85"
              >
                {t("Try New Match Ups!")}
              </Link>
              <Link
                href="/feed"
                className="rounded-md border border-stone-300 bg-white px-4 py-2.5 text-xs text-stone-600 hover:border-stone-500"
              >
                {t("Published matchups")}
              </Link>
              <Link
                href="/lookup"
                className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
              >
                {t("guide lookup →")}
              </Link>
            </div>
          </div>

          <div className="max-w-full overflow-x-auto pb-2 lg:overflow-visible">
            <HeroTree />
          </div>
        </section>

        <PublishedStrip />

        {/* Each blurb reserves four lines (4 x leading-relaxed), so this row
            is the same height in every language — 中 uses three. Same rule as
            the hero above; see docs/ARCHITECTURE.md -> "Interface language". */}
        <section className="grid grid-cols-1 gap-10 border-t border-stone-200 py-14 md:grid-cols-3">
          <div>
            <h2 className="text-sm font-semibold">
              <span className="mr-1 text-amber-600">⑂</span>{" "}
              {t("Branch the turn, not the essay")}
            </h2>
            <p className="mt-2 min-h-[6.5em] text-[13px] leading-relaxed text-stone-500">
              {t(
                "A different opposing lead is an alternate of the same turn, not a new paragraph. Map the two or three lines you actually play — unwritten branches simply don’t exist.",
              )}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {t("Paste in, paste out")}
            </h2>
            <p className="mt-2 min-h-[6.5em] text-[13px] leading-relaxed text-stone-500">
              {t(
                "Import a pokepast.es link, a Showdown export, or a bare list of species. Moves come with their real type colors, and spread moves already know they aim themselves.",
              )}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {t("Yours, in your browser")}
            </h2>
            <p className="mt-2 min-h-[6.5em] text-[13px] leading-relaxed text-stone-500">
              {t(
                "Teams and matchup boards save to a local library — no account, no upload. Reopen any pairing right where you left it.",
              )}
            </p>
          </div>
        </section>

        <section className="border-t border-stone-200 py-14">
          <h2 className="text-sm font-semibold">
            {t("The whole gameplan, portable")}
          </h2>
          <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-stone-500">
            {t(
              "A finished matchup tree is a few hundred bytes of JSON. Copy it out of the builder, post it under your team report, paste it back in — same board.",
            )}
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-[#f6f5ef] p-4">
            <code className="whitespace-nowrap font-mono text-[11px] text-stone-500">
              {SAMPLE_JSON}
            </code>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-stone-200 py-8 text-[11px] leading-relaxed text-stone-400 md:flex-row md:items-baseline md:justify-between">
          <p>
            {t(
              "xatu is an unaffiliated, non-commercial fan project. Pokémon is owned by Nintendo, The Pokémon Company, Game Freak, and Creatures.",
            )}
          </p>
          <a
            href="https://github.com/ziangit/Xatu"
            className="shrink-0 underline-offset-2 hover:text-stone-700 hover:underline"
          >
            {t("github")}
          </a>
        </footer>
      </main>
    </div>
  );
}
