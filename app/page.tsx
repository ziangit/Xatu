import Link from "next/link";
import { AccountLink } from "./auth/AccountLink";
import { MonIcon } from "./demo/components";

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
  return (
    <div
      className="relative h-[300px] w-[412px] shrink-0"
      aria-label="A miniature matchup tree: team preview branching into two turn-one lines"
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
          Turn 0 · team preview
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
          Turn 1
        </p>
        <div className="mt-1 flex items-center gap-1">
          <IconRow species={["Tyranitar", "Excadrill"]} scale={0.75} />
          <span className="px-0.5 text-[9px] text-stone-300">vs</span>
          <IconRow species={["Aerodactyl", "Kingambit"]} scale={0.75} />
        </div>
        <div className="mt-1.5 space-y-1">
          <div>
            <MoveChip attacker="Tyranitar" move="Rock Slide" color="#B6A136" />
          </div>
          <div>
            <MoveChip
              attacker="Excadrill"
              move="High Horsepower"
              color="#E2BF65"
              target="Aerodactyl"
            />
          </div>
        </div>
      </TreeCard>

      <TreeCard
        className="left-[240px] top-[172px] w-[172px]"
        style={{ animationDelay: "0.6s" }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-widest text-amber-600">
          ⑂ if they lead Charizard
        </p>
        <div className="mt-1 flex items-center gap-1">
          <IconRow species={["Gholdengo", "Milotic"]} scale={0.75} />
          <span className="px-0.5 text-[9px] text-stone-300">vs</span>
          <IconRow species={["Charizard", "Sylveon"]} scale={0.75} />
        </div>
        <div className="mt-1.5">
          <MoveChip
            attacker="Gholdengo"
            move="Make It Rain"
            color="#B7B7CE"
            target="Charizard"
          />
        </div>
      </TreeCard>
    </div>
  );
}

const SAMPLE_JSON = `{"v":2,"my":{"n":"Sand","f":"","s":["Tyranitar","Excadrill","Milotic","Gholdengo","Sinistcha","Staraptor"]},"op":{"n":"Rain","f":"","s":["Aerodactyl","Charizard","Garchomp","Sylveon","Kingambit","Dragonite"]},"t":[[0,"01|23","01|23"],[1,"01|23||0:Rock Slide,1:High Horsepower>f0","04|23"],[1,"32|05","14|30"]]}`;

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-5xl px-6">
        <header className="land-rise flex items-center justify-between py-6">
          <span className="font-display text-lg font-bold tracking-tight">
            xatu
          </span>
          <span className="flex items-center gap-4">
            <AccountLink />
            <Link
              href="/demo"
              className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              open the builder →
            </Link>
          </span>
        </header>

        <section className="flex flex-col items-start gap-12 pb-20 pt-12 lg:flex-row lg:items-center lg:gap-16 lg:pt-16">
          <div className="max-w-xl">
            <p
              className="land-rise text-[10px] font-semibold uppercase tracking-widest text-stone-400"
              style={{ animationDelay: "0.05s" }}
            >
              Matchup planning for Pokémon doubles · bring 6 · pick 4
            </p>
            <h1
              className="land-rise mt-4 font-display text-5xl font-bold leading-[1.04] tracking-tight md:text-6xl"
              style={{ animationDelay: "0.1s" }}
            >
              See turn one coming.
            </h1>
            <p
              className="land-rise mt-5 max-w-md text-sm leading-relaxed text-stone-500"
              style={{ animationDelay: "0.2s" }}
            >
              xatu turns the &ldquo;vs. common archetypes&rdquo; section of a
              team report into a turn-by-turn map — which four you bring, who
              leads, and what the first two turns look like. Named after the
              bird that sees the future.
            </p>
            <div
              className="land-rise mt-7 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.3s" }}
            >
              <Link
                href="/demo"
                className="rounded-md bg-[#e5484d] px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-85"
              >
                Open the matchup builder
              </Link>
              <Link
                href="/matchups"
                className="rounded-md border border-stone-300 bg-white px-4 py-2.5 text-xs text-stone-600 hover:border-stone-500"
              >
                My matchups
              </Link>
              <Link
                href="/demo/lookup"
                className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
              >
                guide lookup →
              </Link>
            </div>
          </div>

          <div className="max-w-full overflow-x-auto pb-2 lg:overflow-visible">
            <HeroTree />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-10 border-t border-stone-200 py-14 md:grid-cols-3">
          <div>
            <h2 className="text-sm font-semibold">
              <span className="mr-1 text-amber-600">⑂</span> Branch the turn,
              not the essay
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-500">
              A different opposing lead is an alternate of the same turn, not a
              new paragraph. Map the two or three lines you actually play —
              unwritten branches simply don&rsquo;t exist.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Paste in, paste out</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-500">
              Import a pokepast.es link, a Showdown export, or a bare list of
              species. Moves come with their real type colors, and spread moves
              already know they aim themselves.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Yours, in your browser</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-500">
              Teams and matchup boards save to a local library — no account, no
              upload. Reopen any pairing right where you left it.
            </p>
          </div>
        </section>

        <section className="border-t border-stone-200 py-14">
          <h2 className="text-sm font-semibold">
            The whole gameplan, portable
          </h2>
          <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-stone-500">
            A finished matchup tree is a few hundred bytes of JSON. Copy it out
            of the builder, post it under your team report, paste it back in —
            same board.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-[#f6f5ef] p-4">
            <code className="whitespace-nowrap font-mono text-[11px] text-stone-500">
              {SAMPLE_JSON}
            </code>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-stone-200 py-8 text-[11px] leading-relaxed text-stone-400 md:flex-row md:items-baseline md:justify-between">
          <p>
            xatu is an unaffiliated, non-commercial fan project. Pokémon is
            owned by Nintendo, The Pokémon Company, Game Freak, and Creatures.
          </p>
          <a
            href="https://github.com/ziangit/Xatu"
            className="shrink-0 underline-offset-2 hover:text-stone-700 hover:underline"
          >
            github
          </a>
        </footer>
      </main>
    </div>
  );
}
