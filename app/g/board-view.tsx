"use client";

import { useEffect, useState } from "react";
import { MonIcon, TYPE_COLORS } from "../demo/components";
import { switchedInSpecies } from "../demo/board";
import { parseTargetRef } from "../demo/workflow-io";
import { useT } from "../i18n/provider";
import type { SideState, TurnNode } from "../demo/storage";

/**
 * The board, read-only.
 *
 * Deliberately a separate renderer rather than a `readOnly` flag on the sim
 * page's `SideBoard`: that component takes eleven callbacks, and threading
 * "none of these" through every one would make the editor worse to serve the
 * reader. Nothing here has a handler, which is also what makes read-only
 * structural — there are no affordances to disable, so none can be missed.
 *
 * It does not draw the sim page's SVG edges. Those are measured from laid-out
 * cards at runtime, and a page that has to survive a phone is the wrong place
 * for that. Turns read left to right with a caret between them: the same
 * information, none of the machinery.
 */

function Slot({ species }: { species?: string }) {
  if (!species) {
    return (
      <span className="inline-block h-[34px] w-[46px] rounded border border-dashed border-stone-200" />
    );
  }
  return (
    <span className="inline-block h-[34px] w-[46px] rounded border border-stone-300 bg-white pl-0.5">
      <MonIcon species={species} scale={1} />
    </span>
  );
}

function Side({
  title,
  roster,
  state,
  parent,
  moveColor,
}: {
  title: string;
  roster: string[];
  state: SideState;
  parent: SideState | null;
  moveColor: (move: string) => string | undefined;
}) {
  const t = useT();
  const placed = new Set([...state.front, ...state.back]);
  const switchedIn = new Set(switchedInSpecies(state, parent));
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
        {title}
      </p>
      <span className="mt-1 flex flex-wrap">
        {roster.map((s, i) => (
          <span
            key={`${s}-${i}`}
            className={
              state.fainted.includes(s) || !placed.has(s)
                ? "opacity-25 grayscale"
                : ""
            }
          >
            <MonIcon species={s} scale={0.7} />
          </span>
        ))}
      </span>
      {(["front", "back"] as const).map((row) => (
        <div key={row} className="mt-1.5 flex items-start gap-2">
          <span className="w-10 shrink-0 pt-2 text-[10px] text-stone-400">
            {row === "front" ? t("slot|Front") : t("slot|Back")}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {[0, 1].map((i) => {
              const s = state[row][i];
              const move = s ? state.moves?.[s] : undefined;
              const target = s ? state.targets?.[s] : undefined;
              const targetSpecies = target
                ? parseTargetRef(target)?.species
                : undefined;
              const bg = move ? moveColor(move) : undefined;
              return (
                <span key={i} className="flex flex-col items-start gap-0.5">
                  <Slot species={s} />
                  {s && row === "front" && (move || switchedIn.has(s)) && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                        bg ? "text-white" : "bg-stone-100 text-stone-500"
                      }`}
                      style={bg ? { backgroundColor: bg } : undefined}
                    >
                      <MonIcon species={s} scale={0.5} />
                      {switchedIn.has(s) ? t("switched in") : move}
                      {move && targetSpecies && (
                        <>
                          <span className="opacity-80">→</span>
                          <MonIcon species={targetSpecies} scale={0.5} />
                        </>
                      )}
                    </span>
                  )}
                </span>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

/** One opponent's plan: its turn cards, left to right. */
export function BoardView({
  myRoster,
  oppRoster,
  nodes,
}: {
  myRoster: string[];
  oppRoster: string[];
  nodes: TurnNode[];
}) {
  const t = useT();
  // Type colours come from the dex, lazily. The reader is perfectly legible
  // without them, so a slow or failed load costs colour and nothing else.
  const [colors, setColors] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    void import("@pkmn/dex").then(({ Dex }) => {
      if (!alive) return;
      const out: Record<string, string> = {};
      for (const node of nodes) {
        for (const side of [node.my, node.opp]) {
          for (const move of Object.values(side.moves ?? {})) {
            const type = Dex.moves.get(move)?.type;
            if (type) out[move] = TYPE_COLORS[type] ?? "#777";
          }
        }
      }
      setColors(out);
    });
    return () => {
      alive = false;
    };
  }, [nodes]);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ordered = [...nodes].sort((a, b) => a.turn - b.turn);
  const parentOf = (n: TurnNode, side: "my" | "opp") =>
    n.parentId ? (byId.get(n.parentId)?.[side] ?? null) : null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {ordered.map((node, i) => (
        <div key={node.id} className="flex shrink-0 items-center gap-3">
          {i > 0 && (
            <span aria-hidden="true" className="text-stone-300">
              →
            </span>
          )}
          <div className="w-[520px] shrink-0 rounded-lg border border-stone-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              {/* Stored turns start at 1; the board displays them one lower, so
                  the first card reads "turn 0 · team preview". Matching that
                  here is the difference between the reader agreeing with the
                  editor and quietly disagreeing with it. */}
              {node.turn - 1 === 0
                ? t("Turn 0 · team preview")
                : t("Turn {n}", { n: node.turn - 1 })}
            </p>
            <div className="mt-2 flex gap-3">
              <Side
                title={t("My Team")}
                roster={myRoster}
                state={node.my}
                parent={parentOf(node, "my")}
                moveColor={(m) => colors[m]}
              />
              <span aria-hidden="true" className="w-px bg-stone-100" />
              <Side
                title={t("Opposing Team")}
                roster={oppRoster}
                state={node.opp}
                parent={parentOf(node, "opp")}
                moveColor={(m) => colors[m]}
              />
            </div>
            {node.note && (
              <p className="mt-2 border-t border-stone-100 pt-2 text-[11px] leading-relaxed text-stone-600">
                {node.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
