"use client";

import { useState, type CSSProperties } from "react";
import { Icons } from "@pkmn/img";
import { selectPlan } from "@/lib/schema";
import type { ParsedMon, Plan, Rule, TurnCondition } from "@/lib/schema";
import { formeCandidates, matchOpponent } from "@/lib/match";
import { importTeamText } from "@/lib/team";
import { demoGuide, SAMPLE_TEAMS } from "../demo-data";

// Demo of the lookup flow: paste the opposing team (Showdown export or
// pokepast.es link) → matchOpponent finds the matchup → selectPlan picks the
// stored plan → turn toggles reveal the stored calls. Plain language and
// sprites only; the schema stays plumbing (docs/UI-SPEC.md §0).

const TURNS = [1, 2, 3];
const POKEPASTE_RE = /^https?:\/\/pokepast\.es\/\w+\/?$/;

/** Showdown team-preview pixel icon, from the hotlinked icon sheet. */
function MonIcon({ species, scale = 2 }: { species: string; scale?: number }) {
  const { css } = Icons.getPokemon(species);
  return (
    <span
      className="inline-block shrink-0 overflow-hidden"
      style={{ width: 40 * scale, height: 30 * scale }}
    >
      <span
        style={{
          ...(css as CSSProperties),
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </span>
  );
}

const WEATHER_LABEL: Record<string, string> = {
  sun: "Sun is up",
  rain: "Rain is up",
  sand: "Sandstorm is up",
  snow: "Snow is up",
  none: "No weather",
};

const TERRAIN_LABEL: Record<string, string> = {
  electric: "Electric Terrain is up",
  grassy: "Grassy Terrain is up",
  misty: "Misty Terrain is up",
  psychic: "Psychic Terrain is up",
  none: "No terrain",
};

/** Plain-language rendering of a condition — never its internal shape. */
function conditionLabel(c: TurnCondition): { text: string; sprite?: string } {
  switch (c.kind) {
    case "opponentLeads":
      return { text: `They lead ${c.species}`, sprite: c.species };
    case "opponentSwitchesIn":
      return { text: `${c.species} switches in`, sprite: c.species };
    case "opponentUsesMove":
      return c.species
        ? { text: `${c.species} uses ${c.move}`, sprite: c.species }
        : { text: `They use ${c.move}` };
    case "opponentMegaEvolves":
      return c.species
        ? { text: `${c.species} Mega Evolves`, sprite: c.species }
        : { text: "They Mega Evolve" };
    case "opponentTerastallizes":
      return c.species
        ? { text: `${c.species} Terastallizes`, sprite: c.species }
        : { text: "They Terastallize" };
    case "weatherIs":
      return { text: WEATHER_LABEL[c.weather] };
    case "terrainIs":
      return { text: TERRAIN_LABEL[c.terrain] };
    case "tailwindUp":
      return {
        text: c.side === "own" ? "Your Tailwind is up" : "Their Tailwind is up",
      };
    case "trickRoomUp":
      return { text: "Trick Room is up" };
    case "ownFainted":
      return { text: `Your ${c.species} is down`, sprite: c.species };
  }
}

/** Opponent species a condition refers to, if any. */
function opponentSpeciesOf(c: TurnCondition): string | undefined {
  if (
    c.kind === "opponentLeads" ||
    c.kind === "opponentSwitchesIn" ||
    c.kind === "opponentUsesMove" ||
    c.kind === "opponentMegaEvolves" ||
    c.kind === "opponentTerastallizes"
  ) {
    return c.species;
  }
  return undefined;
}

function conditionKey(c: TurnCondition): string {
  return JSON.stringify(c);
}

function actionText(a: Rule["actions"][number]): string {
  const act = a.action;
  if ("move" in act) return `${a.species}: ${act.move}`;
  if ("switchTo" in act) return `${a.species} → ${act.switchTo}`;
  return `${a.species}: Protect`;
}

export default function DemoPage() {
  const [pasteInput, setPasteInput] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [opponent, setOpponent] = useState<ParsedMon[] | null>(null);
  // Active condition toggles, keyed `${planId}|${turn}|${conditionKey}`.
  const [active, setActive] = useState<ReadonlySet<string>>(new Set());

  const loadTeam = (text: string) => {
    const team = importTeamText(text);
    if (!team) {
      setPasteError("That doesn't parse as a Showdown team export.");
      return;
    }
    setOpponent(team.parsed);
    setActive(new Set());
    setPasteError(null);
  };

  const handleImport = async () => {
    const input = pasteInput.trim();
    if (!input) return;
    if (POKEPASTE_RE.test(input)) {
      setFetching(true);
      setPasteError(null);
      try {
        const res = await fetch(`/api/pokepaste?url=${encodeURIComponent(input)}`);
        if (!res.ok) throw new Error(await res.text());
        loadTeam(await res.text());
      } catch {
        setPasteError("Couldn't fetch that paste — check the link.");
      } finally {
        setFetching(false);
      }
    } else {
      loadTeam(input);
    }
  };

  const reset = () => {
    setOpponent(null);
    setPasteInput("");
    setPasteError(null);
    setActive(new Set());
  };

  // ── Derived: matchup → plan, from the pasted six ─────────────────────────
  const observedSpecies = opponent?.map((m) => m.species) ?? [];
  // Include stripped forme names so "Charizard-Mega-Y" satisfies guards and
  // conditions the author wrote as "Charizard".
  const observedExpanded = observedSpecies.flatMap(formeCandidates);
  const observedSet = new Set(observedExpanded);

  const matches = opponent ? matchOpponent(observedSpecies, demoGuide.matchups) : [];
  const matched = matches[0];
  const plan: Plan | undefined = matched
    ? selectPlan(observedExpanded, matched.matchup.plans)
    : undefined;

  const conditionAvailable = (c: TurnCondition): boolean => {
    const sp = opponentSpeciesOf(c);
    return sp === undefined || formeCandidates(sp).some((k) => observedSet.has(k));
  };

  const ruleFires = (planId: string, rule: Rule): boolean =>
    rule.conditions.length > 0 &&
    rule.conditions.every(
      (c) =>
        conditionAvailable(c) &&
        active.has(`${planId}|${rule.turn}|${conditionKey(c)}`),
    );

  const toggle = (key: string) => {
    const next = new Set(active);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setActive(next);
  };

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <header className="flex items-baseline justify-between border-b border-stone-200 pb-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {demoGuide.title}
            </h1>
            <p className="text-xs text-stone-400">
              by {demoGuide.authorName} · {demoGuide.regulation}
            </p>
          </div>
          {opponent && (
            <button
              onClick={reset}
              className="text-xs font-medium text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
            >
              change team
            </button>
          )}
        </header>

        {/* ── Paste in the opposing team ── */}
        {!opponent && (
          <section className="mt-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
              Opposing team
            </h2>
            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder={"Paste a Showdown team export or a pokepast.es link…"}
              rows={8}
              spellCheck={false}
              className="mt-2 w-full resize-y rounded-md border border-stone-200 bg-white p-3 font-mono text-xs text-stone-800 placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleImport}
                disabled={fetching || !pasteInput.trim()}
                className="rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-30"
              >
                {fetching ? "Fetching…" : "Look up"}
              </button>
              <span className="text-xs text-stone-400">or try</span>
              {SAMPLE_TEAMS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => loadTeam(s.text)}
                  className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 hover:border-stone-400"
                >
                  {s.label}
                </button>
              ))}
            </div>
            {pasteError && (
              <p className="mt-2 text-xs text-red-600">{pasteError}</p>
            )}
          </section>
        )}

        {opponent && (
          <>
            {/* ── Their six ── */}
            <section className="mt-8">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                  Their six
                </h2>
                {matched ? (
                  <p className="text-xs text-stone-500">
                    matchup:{" "}
                    <span className="font-medium text-emerald-700">
                      {matched.matchup.name}
                    </span>{" "}
                    · {Math.round(matched.score * 100)}% fit
                  </p>
                ) : (
                  <p className="text-xs text-stone-400">
                    no matchup in this guide fits
                  </p>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-1 gap-y-2">
                {opponent.map((m, i) => (
                  <div key={`${m.species}-${i}`} className="w-[84px] text-center">
                    <MonIcon species={m.species} scale={2} />
                    <p className="-mt-1 truncate text-[11px] text-stone-500">
                      {m.species}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── The stored line ── */}
            {plan ? (
              <>
                <section className="mt-8">
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                    Your line
                  </h2>
                  <div className="mt-2 flex items-end gap-8">
                    <div>
                      <div className="flex gap-1">
                        {plan.lead.map((s) => (
                          <div key={s} className="w-[84px] text-center">
                            <MonIcon species={s} scale={2} />
                            <p className="-mt-1 text-[11px] font-medium">{s}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-1 text-center text-[10px] uppercase tracking-widest text-stone-400">
                        lead
                      </p>
                    </div>
                    <div>
                      <div className="flex gap-1 opacity-60">
                        {plan.back.map((s) => (
                          <div key={s} className="w-[64px] text-center">
                            <MonIcon species={s} scale={1.5} />
                            <p className="-mt-1 text-[11px]">{s}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-1 text-center text-[10px] uppercase tracking-widest text-stone-400">
                        back
                      </p>
                    </div>
                  </div>
                  {plan.when && (
                    <p className="mt-2 text-xs text-stone-500">
                      picked because they have{" "}
                      <span className="font-medium text-stone-700">
                        {plan.when.map((g) => g.species).join(" + ")}
                      </span>
                    </p>
                  )}
                  <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-stone-500">
                    {plan.gameplan}
                  </p>
                </section>

                {/* ── Turn procedure ── */}
                <section className="mt-8">
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                    Toggle what you see
                  </h2>
                  <div className="mt-3 space-y-0">
                    {TURNS.map((turn) => {
                      const rules = plan.rules.filter((r) => r.turn === turn);
                      const conditions = new Map<string, TurnCondition>();
                      for (const r of rules) {
                        for (const c of r.conditions) {
                          if (conditionAvailable(c))
                            conditions.set(conditionKey(c), c);
                        }
                      }
                      const fired = rules.filter((r) => ruleFires(plan.id, r));

                      return (
                        <div
                          key={turn}
                          className="flex gap-4 border-b border-stone-200 py-4 last:border-b-0"
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 font-mono text-xs text-white">
                            {turn}
                          </span>
                          <div className="min-w-0 flex-1">
                            {rules.length === 0 ? (
                              <p className="py-0.5 text-xs text-stone-400">
                                nothing stored for this turn — play the plan
                                above
                              </p>
                            ) : (
                              <>
                                <div className="flex flex-wrap gap-1.5">
                                  {[...conditions.values()].map((c) => {
                                    const label = conditionLabel(c);
                                    const key = `${plan.id}|${turn}|${conditionKey(c)}`;
                                    const on = active.has(key);
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => toggle(key)}
                                        className={`flex items-center gap-1 rounded-md border py-0.5 pl-1 pr-2.5 text-xs transition-colors ${
                                          on
                                            ? "border-emerald-700 bg-emerald-700 text-white"
                                            : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                                        }`}
                                      >
                                        {label.sprite ? (
                                          <MonIcon
                                            species={label.sprite}
                                            scale={1}
                                          />
                                        ) : (
                                          <span className="w-1" />
                                        )}
                                        {label.text}
                                      </button>
                                    );
                                  })}
                                </div>
                                {fired.map((r) => (
                                  <div
                                    key={r.id}
                                    className="mt-2.5 border-l-2 border-emerald-600 pl-3"
                                  >
                                    <div className="flex flex-wrap gap-x-5 gap-y-1">
                                      {r.actions.map((a) => (
                                        <span
                                          key={a.species}
                                          className="flex items-center gap-1 text-sm font-medium"
                                        >
                                          <MonIcon
                                            species={a.species}
                                            scale={1.2}
                                          />
                                          {actionText(a)}
                                        </span>
                                      ))}
                                      {r.actions.length === 0 && (
                                        <span className="text-sm text-stone-500">
                                          no specific call stored
                                        </span>
                                      )}
                                    </div>
                                    {r.reason && (
                                      <p className="mt-1 max-w-prose text-xs leading-relaxed text-stone-400">
                                        {r.reason}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            ) : (
              matched && (
                <p className="mt-8 text-sm text-stone-400">
                  The author didn&apos;t store a plan for this exact team.
                </p>
              )
            )}
          </>
        )}

        <footer className="mt-16 border-t border-stone-200 pt-4 text-[11px] leading-relaxed text-stone-400">
          xatu is an unaffiliated, non-commercial fan project. Pokémon is owned
          by Nintendo, The Pokémon Company, Game Freak, and Creatures.
        </footer>
      </main>
    </div>
  );
}
