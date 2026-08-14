"use client";

import { useState } from "react";
import type { CatalogueMatch } from "@/lib/match";
import { findCatalogueTeams } from "./catalogue";
import { MonIcon } from "./mon-icon";

/**
 * "Looks like one of these" — published teams from the catalogue that share four
 * or more of the species typed so far.
 *
 * **Read-only, and only on click** (user, 2026-08-13). It never edits the team
 * being typed: you look, you recognise the archetype, you close it. That keeps
 * one request per deliberate act rather than one per keystroke, and means a
 * wrong guess by the catalogue can't quietly rewrite what the author wrote.
 *
 * Rows are one per *roster*, not per paste — 712 catalogue teams are 567
 * distinct rosters and the most-copied one appears 30 times, so an ungrouped
 * list lets a popular archetype crowd out everything else. The overlap count is
 * always shown ("4/6"): candidates with scores, never one asserted answer, the
 * same rule `matchOpponent` follows.
 */

type State =
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "open"; matches: CatalogueMatch[] }
  | { kind: "off" }
  | { kind: "error"; message: string };

export function CatalogueLookup({
  species,
  regulation,
  min = 4,
}: {
  /** The slots filled so far; blanks already removed. */
  species: string[];
  regulation: string;
  min?: number;
}) {
  const [state, setState] = useState<State>({ kind: "closed" });

  if (species.length < min) return null;

  const look = async () => {
    setState({ kind: "loading" });
    const result = await findCatalogueTeams(species, regulation, { min });
    if (result.state === "off") setState({ kind: "off" });
    else if (result.state === "error")
      setState({ kind: "error", message: result.message });
    else setState({ kind: "open", matches: result.matches });
  };

  return (
    <div className="mt-2">
      {state.kind === "closed" || state.kind === "loading" ? (
        <button
          type="button"
          onClick={look}
          disabled={state.kind === "loading"}
          className="cursor-pointer rounded border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-600 transition-colors hover:border-stone-500 disabled:opacity-50"
        >
          {state.kind === "loading"
            ? "looking…"
            : `does this look like a known team? (${species.length} named)`}
        </button>
      ) : (
        <div className="fade-in rounded-md border border-stone-200 bg-white">
          <div className="flex items-baseline justify-between border-b border-stone-100 px-2 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              Published teams sharing {min}+
              {state.kind === "open" && state.matches.length > 0 && (
                <span className="ml-1 font-normal normal-case tracking-normal text-stone-300">
                  · {state.matches.length}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setState({ kind: "closed" })}
              className="cursor-pointer text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              close
            </button>
          </div>

          {state.kind === "off" && (
            <p className="px-2 py-1.5 text-[11px] text-stone-400">
              The team catalogue needs an account backend configured — this
              build is running browser-only.
            </p>
          )}
          {state.kind === "error" && (
            <p className="px-2 py-1.5 text-[11px] text-amber-700">
              Couldn&apos;t reach the catalogue — {state.message}
            </p>
          )}
          {state.kind === "open" && state.matches.length === 0 && (
            <p className="px-2 py-1.5 text-[11px] text-stone-400">
              No published team shares {min} of these. Nothing is wrong — the
              catalogue is Champions teams from VGCPastes, not every team.
            </p>
          )}
          {/* A six-species probe can rank nineteen rosters; the panel is not the
              place to grow that tall, so the list scrolls inside itself and the
              Add button stays where the eye left it. */}
          <div className="max-h-64 overflow-y-auto">
            {state.kind === "open" &&
              state.matches.map((m) => (
                <div
                  key={m.rosterCode}
                  className="flex items-center gap-2 border-t border-stone-50 px-2 py-1.5 first:border-t-0"
                >
                  <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                    {m.shared}/{m.observed}
                  </span>
                  <span className="flex shrink-0">
                    {m.species.map((s, i) => (
                      <span
                        key={`${s}-${i}`}
                        // The ones already named are the reason this row is here.
                        className={
                          m.matched.includes(s) ? "" : "opacity-40 grayscale"
                        }
                        title={s}
                      >
                        <MonIcon species={s} scale={0.6} />
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-stone-600">
                    {m.team.name || m.team.author || "untitled"}
                    {m.team.category && (
                      <span className="text-stone-400">
                        {" "}
                        · {m.team.category}
                      </span>
                    )}
                  </span>
                  {m.pastes > 1 && (
                    <span
                      className="shrink-0 text-[10px] text-stone-400"
                      title={`${m.pastes} published pastes of this same six`}
                    >
                      ×{m.pastes}
                    </span>
                  )}
                  {m.team.paste_url && (
                    <a
                      href={m.team.paste_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
                    >
                      paste ↗
                    </a>
                  )}
                </div>
              ))}
          </div>

          <p className="border-t border-stone-100 px-2 py-1 text-[10px] text-stone-400">
            Reference only — nothing here changes the team you&apos;re building.
          </p>
        </div>
      )}
    </div>
  );
}
