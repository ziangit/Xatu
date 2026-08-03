"use client";

/* eslint-disable @next/next/no-img-element */

// Dev playground for Phase 1: exercises the schema module (import/export,
// validation, warnings, plan selection) with no persistence. Not product UI.

import { useMemo, useState } from "react";
import {
  exportGuideText,
  guideWarnings,
  importGuideText,
  selectPlan,
  type ActionAssignment,
  type Guide,
  type Matchup,
  type Plan,
  type TurnCondition,
} from "@/lib/schema";
import { yoshimapGuide } from "@/lib/schema/fixtures/yoshimap-sand-staraptor";

const spriteUrl = (species: string) =>
  `https://play.pokemonshowdown.com/sprites/gen5/${species
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")}.png`;

function conditionLabel(c: TurnCondition): string {
  switch (c.kind) {
    case "opponentLeads":
      return `they lead ${c.species}`;
    case "opponentSwitchesIn":
      return `${c.species} switches in`;
    case "opponentUsesMove":
      return c.species ? `${c.species} uses ${c.move}` : `they use ${c.move}`;
    case "opponentMegaEvolves":
      return c.species ? `${c.species} Mega Evolves` : "they Mega Evolve";
    case "opponentTerastallizes":
      return c.species ? `${c.species} Terastallizes` : "they Terastallize";
    case "weatherIs":
      return `weather is ${c.weather}`;
    case "terrainIs":
      return `terrain is ${c.terrain}`;
    case "tailwindUp":
      return `Tailwind up (${c.side})`;
    case "trickRoomUp":
      return "Trick Room up";
    case "ownFainted":
      return `own ${c.species} has fainted`;
  }
}

function actionLabel(a: ActionAssignment): string {
  if ("move" in a.action) return `${a.species}: ${a.action.move}`;
  if ("switchTo" in a.action) return `${a.species} → ${a.action.switchTo}`;
  return `${a.species}: Protect`;
}

function Sprite({ species, size = 40 }: { species: string; size?: number }) {
  return (
    <img
      src={spriteUrl(species)}
      alt={species}
      title={species}
      width={size}
      height={size}
      className="inline-block [image-rendering:pixelated]"
      onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
    />
  );
}

function PlanCard({ plan, active }: { plan: Plan; active: boolean }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        active
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
          : "border-neutral-200 dark:border-neutral-800 opacity-70"
      }`}
    >
      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-neutral-500">
        {plan.when ? (
          <span>
            if they have{" "}
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {plan.when.map((g) => g.species).join(" + ")}
            </span>
          </span>
        ) : (
          <span>default plan</span>
        )}
        {active && (
          <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            SELECTED
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-neutral-400">Lead</div>
          {plan.lead.map((s) => (
            <Sprite key={s} species={s} />
          ))}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-neutral-400">Back</div>
          {plan.back.map((s) => (
            <Sprite key={s} species={s} />
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{plan.gameplan}</p>
      <ul className="mt-2 space-y-2">
        {plan.rules.map((r) => (
          <li key={r.id} className="rounded border border-neutral-200 p-2 text-sm dark:border-neutral-800">
            <div>
              <span className="mr-2 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold dark:bg-neutral-800">
                T{r.turn}
              </span>
              <span className="text-neutral-500">
                {r.conditions.map(conditionLabel).join(" AND ") || "always"}
              </span>
            </div>
            <div className="mt-1 font-medium">
              {r.actions.length > 0 ? r.actions.map(actionLabel).join(" · ") : "(unspecified)"}
            </div>
            {r.reason && (
              <details className="mt-1 text-neutral-500">
                <summary className="cursor-pointer text-xs">reason</summary>
                <p className="mt-1 text-sm">{r.reason}</p>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatchupCard({ matchup }: { matchup: Matchup }) {
  const [observed, setObserved] = useState<string[]>([]);
  const [extra, setExtra] = useState("");

  const toggle = (s: string) =>
    setObserved((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const selected = selectPlan(observed, matchup.plans);

  return (
    <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="text-lg font-semibold">{matchup.name}</h3>

      <div className="mt-2">
        <div className="text-[10px] uppercase tracking-wide text-neutral-400">
          Opponent archetype — toggle what you &ldquo;see at preview&rdquo; to drive selectPlan
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {matchup.opponentSpecies.map((o) => (
            <button
              key={o.species}
              onClick={() => toggle(o.species)}
              title={o.note}
              className={`flex items-center gap-1 rounded-full border px-2 py-1 text-sm ${
                observed.includes(o.species)
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              <Sprite species={o.species} size={28} />
              {o.species}
              <span className="text-[10px] text-neutral-400">{o.tag}</span>
            </button>
          ))}
          {observed
            .filter((s) => !matchup.opponentSpecies.some((o) => o.species === s))
            .map((s) => (
              <button
                key={s}
                onClick={() => toggle(s)}
                className="flex items-center gap-1 rounded-full border border-sky-500 bg-sky-50 px-2 py-1 text-sm dark:bg-sky-950/40"
              >
                <Sprite species={s} size={28} />
                {s}
              </button>
            ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const s = extra.trim();
              if (s) toggle(s);
              setExtra("");
            }}
          >
            <input
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="+ other species"
              className="w-32 rounded-full border border-dashed border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
            />
          </form>
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          {observed.length === 0
            ? "nothing observed yet → the unguarded plan (if any) applies"
            : selected
              ? `selectPlan(${observed.join(", ")}) → "${selected.id}"`
              : "no plan applies (only guarded plans exist and none match)"}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {matchup.plans.map((p) => (
          <PlanCard key={p.id} plan={p} active={selected?.id === p.id} />
        ))}
      </div>
    </section>
  );
}

export default function Playground() {
  const [text, setText] = useState(() => exportGuideText(yoshimapGuide));
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => importGuideText(text), [text]);
  const guide: Guide | null = result.ok ? result.guide : null;
  const warnings = useMemo(() => (guide ? guideWarnings(guide) : []), [guide]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">xatu schema playground</h1>
        <p className="text-sm text-neutral-500">
          Phase 1 test bench: paste a guide JSON below (or edit the preloaded yoshimap
          fixture), watch it validate live, and drive plan selection per matchup. Break the
          JSON on purpose to see the import errors; edit a species name to see the advisory
          warnings.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={() => setText(exportGuideText(yoshimapGuide))}
              className="rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700"
            >
              Reset to example
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700"
            >
              {copied ? "Copied!" : "Copy JSON"}
            </button>
            <span
              className={`ml-auto rounded px-2 py-1 text-xs font-bold ${
                result.ok
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
              }`}
            >
              {result.ok ? "valid guide" : "invalid"}
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="h-[28rem] w-full rounded-lg border border-neutral-300 bg-neutral-50 p-3 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div className="space-y-3">
          {!result.ok && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
              <div className="font-semibold text-red-700 dark:text-red-400">{result.error}</div>
              {result.issues && (
                <ul className="mt-1 list-inside list-disc text-red-600 dark:text-red-400">
                  {result.issues.map((i, n) => (
                    <li key={n}>
                      <code>{i.path || "(root)"}</code>: {i.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {guide && warnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
              <div className="font-semibold text-amber-700 dark:text-amber-400">
                Advisory warnings (never blocking)
              </div>
              <ul className="mt-1 list-inside list-disc text-amber-700 dark:text-amber-400">
                {warnings.map((w, n) => (
                  <li key={n}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {guide && (
            <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="text-sm text-neutral-500">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {guide.title}
                </span>{" "}
                by {guide.authorName} · {guide.regulation} · schema v{guide.schemaVersion}
              </div>
              <div className="mt-2">
                {guide.ownTeam.parsed.map((m) => (
                  <Sprite key={m.species} species={m.species} size={48} />
                ))}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-neutral-500">
                  Showdown export (verbatim, lossless)
                </summary>
                <pre className="mt-1 overflow-x-auto rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-900">
                  {guide.ownTeam.exportText}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      {guide?.matchups.map((mu) => <MatchupCard key={mu.id} matchup={mu} />)}

      <footer className="pt-4 text-xs text-neutral-400">
        xatu is an unaffiliated, non-commercial fan project. Pokémon is © Nintendo, The
        Pokémon Company, Game Freak, and Creatures. Sprites are hotlinked from Pokémon
        Showdown.
      </footer>
    </main>
  );
}
