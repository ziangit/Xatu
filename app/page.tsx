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
import { GitHubLink } from "./nav";
import { GITHUB_URL } from "./site";

// Landing page. Visual language is the sim board's own — paper ground, stone
// ink, Simulate red, branch amber — so the page opens straight into the tool
// without a costume change. The hero is a miniature of the real artifact: a
// turn tree with Showdown minisprites that draws itself on load.

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
 * after first paint, and a card is a couple of pixels taller in Chinese and
 * Japanese than in English (measured 266 / 268 / 268), which would otherwise
 * move every section below it when the language changes.
 *
 * 17rem covers all three. It cannot cover everything — a card is mostly
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
          {t("Community matchups")}
        </h2>
        <span aria-hidden="true" className="h-px flex-1 bg-stone-200" />
        <Link
          href="/feed"
          className="shrink-0 text-xs text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
        >
          {t("see all →")}
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:min-h-[17rem] md:grid-cols-3">
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

/**
 * The hero artifact — and it is not invented. These are the first two
 * matchups of the Psyspam guide published at `/g/jcgkhgrr`, read out of its
 * stored document and transcribed here: the same rosters, the same leads, the
 * same declared moves.
 *
 * Transcribed rather than fetched, for two reasons that both matter. The
 * landing page has to render with Supabase unconfigured, and a hero that
 * arrives after first paint moves everything under it.
 *
 * And real beats invented here for a third reason: in October this hero
 * shipped Ground into a Rock/Flying target, a play that does literally
 * nothing, because made-up moves get no scrutiny from anyone. A plan that got
 * a team to #1 on ladder cannot have that problem.
 *
 * Notes and damage calculations are deliberately left out — at 9px they would
 * be unreadable, and what this is showing is the shape.
 */
type HeroMove = {
  by: string;
  move: string;
  color: string;
  at?: string;
};

type HeroBranch = {
  /** `top` places the card in the 412x300 frame; the arrow runs `fromY` on
   *  the preview card's right edge to `toY` on this card's left. */
  top: number;
  fromY: number;
  toY: number;
  lead: [string, string];
  against: [string, string];
  moves: HeroMove[];
  /** Set on an alternate line: amber label and a dashed arrow, as the board
   *  itself draws a sibling of the same turn. `kind` is what makes the two
   *  lines differ — the opponent's lead, or their switch. */
  alt?: { kind: "lead" | "switch"; species: string };
};

type HeroScene = {
  label: string;
  my: string[];
  opp: string[];
  branches: HeroBranch[];
};

const PSYSPAM = [
  "Arcanine-Hisui",
  "Indeedee-F",
  "Talonflame",
  "Kommo-o",
  "Gardevoir-Mega",
  "Sneasler",
];

const SCENES: HeroScene[] = [
  {
    // vs glitchy_potat's Baltimore Regional 2027 Team.
    label: "Golisopod",
    my: PSYSPAM,
    opp: [
      "Golisopod",
      "Basculegion",
      "Pelipper",
      "Archaludon",
      "Sneasler",
      "Salamence",
    ],
    branches: [
      {
        top: 0,
        fromY: 128,
        toY: 50,
        lead: ["Indeedee-F", "Gardevoir-Mega"],
        against: ["Golisopod", "Pelipper"],
        moves: [
          { by: "Indeedee-F", move: "Follow Me", color: TYPE_COLORS.Normal },
          {
            by: "Gardevoir-Mega",
            move: "Thunderbolt",
            color: TYPE_COLORS.Electric,
            at: "Pelipper",
          },
        ],
      },
      {
        // The same two moves as the line above, re-aimed: Pelipper leaves and
        // Thunderbolt goes to whatever came in instead. The author re-picked
        // that target by hand, which is the only way it can happen — xatu
        // does not guess who a move should hit.
        top: 160,
        fromY: 140,
        toY: 198,
        alt: { kind: "switch", species: "Archaludon" },
        lead: ["Indeedee-F", "Gardevoir-Mega"],
        against: ["Golisopod", "Archaludon"],
        moves: [
          { by: "Indeedee-F", move: "Follow Me", color: TYPE_COLORS.Normal },
          {
            by: "Gardevoir-Mega",
            move: "Thunderbolt",
            color: TYPE_COLORS.Electric,
            at: "Archaludon",
          },
        ],
      },
    ],
  },
  {
    // vs lovejapanfrombr's Salamence Sand Team — two leads planned, which is
    // the branch the product exists for.
    label: "Tyranitar",
    my: PSYSPAM,
    opp: [
      "Tyranitar",
      "Excadrill",
      "Milotic",
      "Gholdengo",
      "Rillaboom",
      "Salamence",
    ],
    branches: [
      {
        top: 0,
        fromY: 128,
        toY: 50,
        lead: ["Indeedee-F", "Sneasler"],
        against: ["Tyranitar", "Excadrill"],
        moves: [
          { by: "Indeedee-F", move: "Follow Me", color: TYPE_COLORS.Normal },
          {
            by: "Sneasler",
            move: "Close Combat",
            color: TYPE_COLORS.Fighting,
            at: "Excadrill",
          },
        ],
      },
      {
        top: 160,
        fromY: 140,
        toY: 198,
        alt: { kind: "lead", species: "Salamence" },
        lead: ["Talonflame", "Kommo-o"],
        against: ["Salamence", "Gholdengo"],
        moves: [
          { by: "Talonflame", move: "Tailwind", color: TYPE_COLORS.Flying },
          {
            by: "Kommo-o",
            move: "Clanging Scales",
            color: TYPE_COLORS.Dragon,
          },
        ],
      },
    ],
  },
];

/** One opponent's plan, drawn in the frame. Both scenes are mounted at once
 *  and crossfaded, so switching between them cannot move anything. */
function HeroPlan({ scene }: { scene: HeroScene }) {
  const t = useT();
  return (
    <>
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {scene.branches.map((b, i) => (
          <g
            key={i}
            className="land-fade"
            style={{ animationDelay: `${0.75 + i * 0.2}s` }}
          >
            <circle
              cx="170"
              cy={b.fromY}
              r="3"
              fill={b.alt ? "#d97706" : "#b3ada4"}
            />
            <path
              className={b.alt ? undefined : "land-draw"}
              style={b.alt ? undefined : { animationDelay: "0.75s" }}
              d={`M 170 ${b.fromY} C 206 ${b.fromY}, 206 ${b.toY}, 233 ${b.toY}`}
              fill="none"
              stroke={b.alt ? "#d97706" : "#b3ada4"}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeDasharray={b.alt ? "5 4" : undefined}
              markerEnd={`url(#land-arrow-${b.alt ? "branch" : "main"})`}
            />
          </g>
        ))}
      </svg>

      <TreeCard
        className="left-0 top-[100px] w-[170px]"
        style={{ animationDelay: "0.35s" }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">
          {t("Turn 0 · team preview")}
        </p>
        <div className="mt-1.5 space-y-0.5">
          <IconRow species={scene.my} scale={0.5} />
          <IconRow species={scene.opp} scale={0.5} />
        </div>
      </TreeCard>

      {scene.branches.map((b, i) => (
        <TreeCard
          key={i}
          className="left-[240px] w-[172px]"
          style={{ top: b.top, animationDelay: `${0.5 + i * 0.1}s` }}
        >
          <p
            className={`text-[9px] font-semibold uppercase tracking-widest ${
              b.alt ? "text-amber-600" : "text-stone-400"
            }`}
          >
            {/* The species leads, rather than "if they lead <species>".
                Both labels then read the same way — and the card is 152px of
                content, where "if they switch to Archaludon" needed 182 and
                wrapped to two lines. */}
            {!b.alt
              ? t("Turn {n}", { n: 1 })
              : b.alt.kind === "lead"
                ? t("⑂ if {species} leads", { species: b.alt.species })
                : t("⑂ if {species} comes in", { species: b.alt.species })}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <IconRow species={b.lead} scale={0.75} />
            <span className="px-0.5 text-[9px] text-stone-300">vs</span>
            <IconRow species={b.against} scale={0.75} />
          </div>
          <div className="mt-1.5 space-y-1">
            {b.moves.map((m) => (
              <div key={m.by}>
                <MoveChip
                  attacker={m.by}
                  move={m.move}
                  color={m.color}
                  target={m.at}
                />
              </div>
            ))}
          </div>
        </TreeCard>
      ))}
    </>
  );
}

/**
 * The hero: one opponent's plan at a time, crossfading to the next.
 *
 * Both scenes are mounted and stacked in the same fixed frame, so the swap is
 * opacity alone — nothing reflows, and the frame is sized for the taller of
 * the two whichever is showing. Under `prefers-reduced-motion` the interval
 * never starts and the first scene simply stays.
 */
function HeroTree() {
  const t = useT();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setShown((s) => (s + 1) % SCENES.length),
      5200,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative h-[300px] w-[412px] shrink-0"
      aria-label={t(
        "A miniature matchup tree: a team preview, and the turn-one lines planned from it",
      )}
    >
      <svg className="pointer-events-none absolute h-0 w-0">
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
      </svg>

      {SCENES.map((scene, i) => (
        <div
          key={scene.label}
          aria-hidden={i !== shown}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none"
          style={{ opacity: i === shown ? 1 : 0 }}
        >
          <HeroPlan scene={scene} />
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const t = useT();
  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-5xl px-6">
        <header className="land-rise flex items-center justify-between py-6">
          <span className="font-display text-lg font-bold tracking-tight">
            xatu
          </span>
          {/* Same order as `HeaderNav`: links, then the toggle, then the
              account slot. Both of those are fixed width, so the toggle sits a
              constant distance from the right edge and does not slide when the
              language changes. With the link *after* the toggle — as this was
              — "my matchups →" is 89px in English, 64 in Chinese and 112 in
              Japanese, and the toggle moved 48px under the cursor that had
              just clicked it. */}
          <span className="flex items-center gap-4">
            <Link
              href="/matchups"
              className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              {t("my matchups →")}
            </Link>
            <LangToggle />
            <GitHubLink />
            <AccountLink />
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

              If you edit this copy, re-measure. The number carries headroom
              over the tallest language on purpose — it sat flush once, and a
              one-line copy change would then have broken the section silently. */}
          <div className="w-full lg:min-h-[24rem] lg:w-[31.25rem]">
            <p
              className="land-rise text-[10px] font-semibold uppercase tracking-widest text-stone-400"
              style={{ animationDelay: "0.05s" }}
            >
              {t("Matchup planning for Pokémon doubles")}
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
              // No height reserved here on purpose. It used to hold three
              // lines; the copy grew to four in English, so the reserve was
              // inert. The column's `lg:min-h` below is what keeps the section
              // the same height in every language, and it puts the slack below
              // the buttons where it reads as padding.
              className="land-rise mt-5 max-w-md text-sm leading-relaxed text-stone-500"
              style={{ animationDelay: "0.2s" }}
            >
              {t(
                "xatu turns the “vs. common teams” part of a team report into a turn-by-turn map: what you lead, what your opponent reacts, what diverges next turn. Named after the bird that sees past and future at the same time.",
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
                {t("Community matchups")}
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
                "A different opposing lead is an alternate of the same turn, not a new paragraph. You are free to create a new branch or proceed to the next turn.",
              )}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {t("Team build & game preparation")}
            </h2>
            <p className="mt-2 min-h-[6.5em] text-[13px] leading-relaxed text-stone-500">
              {t(
                "Worrying about the trending meta or your tournament opponent? Practice here so you don’t need to play 50 games on ladder.",
              )}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {t("Team report & sharing")}
            </h2>
            <p className="mt-2 min-h-[6.5em] text-[13px] leading-relaxed text-stone-500">
              {t(
                "If you don’t want to write a 10,000-word team report, maybe one graph is enough.",
              )}
            </p>
          </div>
        </section>

        {/* The two promises CLAUDE.md treats as load-bearing and the October
            copy pass left off the page: paste-first import, and local-first.
            This space used to hold a sample of the copy/paste document — the
            feature is still there, on every set and every board, but a wire
            format is plumbing and does not belong on a landing page. */}
        <section className="border-t border-stone-200 py-14">
          <h2 className="text-sm font-semibold">
            {t("Start from a paste. Keep it in your browser.")}
          </h2>
          {/* No height reserve: the paragraph is three lines in all three
              languages at every width (measured 1512 and 1100), and only the
              footer sits below it. A 4.5em reserve here measured *inert* —
              three relaxed lines are already taller than it — which is the
              same trap the hero paragraph sprang on 2026-10-12. */}
          <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-stone-500">
            {t(
              "Import a team from a pokepast.es link or a Showdown export — xatu reads both, exactly as you wrote it. Your teams and boards live in this browser. No account at all until you want one, and then it syncs and publishes.",
            )}
          </p>
        </section>

        <footer className="flex flex-col gap-2 border-t border-stone-200 py-8 text-[11px] leading-relaxed text-stone-400 md:flex-row md:items-baseline md:justify-between">
          <p>
            {t(
              "xatu is an unaffiliated, non-commercial fan project. Pokémon is owned by Nintendo, The Pokémon Company, Game Freak, and Creatures.",
            )}
          </p>
          <a
            href={GITHUB_URL}
            className="shrink-0 underline-offset-2 hover:text-stone-700 hover:underline"
          >
            {t("github")}
          </a>
        </footer>
      </main>
    </div>
  );
}
