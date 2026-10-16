"use client";

import { useEffect, useState } from "react";
import { MonIcon, TYPE_COLORS } from "../demo/components";
import { arrivals, isAlternate, layoutRows } from "../demo/board";
import { EdgeLayer, useTurnEdges } from "../demo/turn-edges";
import { SideFrame } from "../demo/side-frame";
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
 * It **does** draw the editor's arrows, through the shared `turn-edges` layer.
 * An earlier version left them out on the grounds that measuring laid-out
 * cards was too much machinery for a public page — but without them the cards
 * are just a row of boxes and which one follows which is guesswork. They are
 * decoration only in the sense that the page is still readable while they
 * load; they carry the structure.
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
  foeFront,
  calcs,
}: {
  title: string;
  roster: string[];
  state: SideState;
  parent: SideState | null;
  moveColor: (move: string) => string | undefined;
  /** The other side's front, so a target that has left the field is dropped
   *  here exactly as the editor drops it. */
  foeFront: string[];
  /** This side's stored calculations, keyed by the attacker that made them. */
  calcs: Record<string, { text: string }>;
}) {
  const t = useT();
  const placed = new Set([...state.front, ...state.back]);
  // A switch was the turn's action and could not also move; a replacement for
  // something that fainted could. Same rule as the editor, from the same
  // function — a second renderer that re-derives this will disagree.
  const { switched, arrived } = arrivals(state, parent);
  const switchedIn = new Set(switched);
  const cameIn = new Set(arrived);
  return (
    <SideFrame
      className="min-w-0 flex-1"
      title={title}
      front={state.front}
      back={state.back}
      roster={roster.map((s, i) => (
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
      slot={(s) => <Slot species={s} />}
      chip={(s) => {
        const move = state.moves?.[s];
        // Only while the target is still one of the on-field four — the
        // editor's rule, from the same shape of check. A stored node can
        // outlive its target: record Thunderbolt on Pelipper, then record the
        // switch that takes Pelipper off, and the reference stays behind.
        const ref = state.targets?.[s]
          ? parseTargetRef(state.targets[s])
          : null;
        const targetSpecies =
          ref &&
          (ref.kind === "ally" ? state.front : foeFront).includes(ref.species)
            ? ref.species
            : null;
        const bg = move ? moveColor(move) : undefined;
        const shown = switchedIn.has(s)
          ? t("switched in")
          : (move ?? (cameIn.has(s) ? t("came in") : null));
        if (!shown) return null;
        return (
          <span
            className={`flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold leading-none ${
              bg
                ? "text-white"
                : switchedIn.has(s) || cameIn.has(s)
                  ? "bg-sky-50 text-sky-700"
                  : state.mega === s
                    ? "bg-violet-600 text-white"
                    : "bg-stone-100 text-stone-500"
            }`}
            style={bg ? { backgroundColor: bg } : undefined}
          >
            <MonIcon species={s} scale={0.5} />
            {state.mega === s && <span>⟡</span>}
            {shown}
            {move && targetSpecies && (
              <>
                <span className="opacity-80">→</span>
                <MonIcon species={targetSpecies} scale={0.5} />
              </>
            )}
          </span>
        );
      }}
      under={(s) => {
        if (!calcs[s]) return null;
        const move = state.moves?.[s];
        const bg = move ? moveColor(move) : undefined;
        // The author's calculation, stored as text and never re-derived — a
        // published page is a snapshot, so a later change to the maths cannot
        // move its numbers. It always renders: it is content the author
        // saved, and a reader's own calculator preference must not erase it.
        return (
          <p
            className="mb-0.5 mt-0.5 whitespace-pre-wrap border-l-2 pl-1.5 text-[10px] leading-snug"
            style={{
              borderColor: bg ?? "#d6d3d1",
              color: bg ? `color-mix(in srgb, ${bg} 65%, #1c1917)` : undefined,
            }}
          >
            {calcs[s].text}
          </p>
        );
      }}
    />
  );
}

/** One side's stored calculations, keyed by the attacker that made them. */
function sideCalcs(node: TurnNode, side: "my" | "opp") {
  const out: Record<string, { text: string }> = {};
  for (const [key, note] of Object.entries(node.calcs ?? {})) {
    if (key.startsWith(`${side}:`)) out[key.slice(side.length + 1)] = note;
  }
  return out;
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

  const { wrapRef, setCardRef, edges } = useTurnEdges(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rows = layoutRows(nodes);
  const parentOf = (n: TurnNode, side: "my" | "opp") =>
    n.parentId ? (byId.get(n.parentId)?.[side] ?? null) : null;
  // Stored turns start at 1; the board shows them one lower, so the first card
  // reads "turn 0 · team preview". The reader must agree with the editor.
  const maxTurn = Math.max(...nodes.map((n) => n.turn), 1);

  return (
    <div className="scroll-x-hint overscroll-x-contain overflow-x-auto pb-2">
      <div ref={wrapRef} className="relative inline-block">
        <EdgeLayer edges={edges} />
        <div
          className="relative inline-grid items-start gap-x-10 gap-y-3"
          style={{ gridTemplateColumns: `repeat(${maxTurn}, max-content)` }}
        >
          {Array.from({ length: maxTurn }, (_, i) => (
            <p
              key={`h${i}`}
              className="text-[10px] font-semibold uppercase tracking-widest text-stone-400"
              style={{ gridColumn: i + 1, gridRow: 1 }}
            >
              {i === 0 ? t("Turn 0 · team preview") : t("Turn {n}", { n: i })}
            </p>
          ))}
          {nodes.map((node) => {
            const parent = node.parentId ? byId.get(node.parentId) : null;
            const alt = isAlternate(node, nodes);
            return (
              <div
                key={node.id}
                ref={setCardRef(node.id)}
                // Same grid placement as the editor: column by turn, row from
                // `layoutRows`. A branch steps down instead of reading as the
                // next turn, which is what a flat row got wrong.
                style={{
                  gridColumn: node.turn,
                  gridRow: (rows.get(node.id) ?? 0) + 2,
                }}
                className="w-[520px] self-start rounded-lg border border-stone-200 bg-white p-3"
              >
                {alt && (
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                    {parent
                      ? t("⑂ alternate turn {n} · after turn {p}", {
                          n: node.turn - 1,
                          p: parent.turn - 1,
                        })
                      : t("⑂ alternate turn {n}", { n: node.turn - 1 })}
                  </p>
                )}
                <div className="flex gap-3">
                  <Side
                    title={t("My Team")}
                    roster={myRoster}
                    calcs={sideCalcs(node, "my")}
                    state={node.my}
                    foeFront={node.opp.front}
                    parent={parentOf(node, "my")}
                    moveColor={(m) => colors[m]}
                  />
                  {/* The hairline and "vs" the editor draws between the sides —
                    without the label the divider reads as a layout accident. */}
                  <span className="flex shrink-0 items-center">
                    <span
                      aria-hidden="true"
                      className="h-full w-px bg-stone-100"
                    />
                    <span className="-mx-2 bg-white px-1 text-[9px] uppercase tracking-widest text-stone-300">
                      {t("vs")}
                    </span>
                  </span>
                  <Side
                    title={t("Opposing Team")}
                    roster={oppRoster}
                    calcs={sideCalcs(node, "opp")}
                    state={node.opp}
                    foeFront={node.my.front}
                    parent={parentOf(node, "opp")}
                    moveColor={(m) => colors[m]}
                  />
                </div>
                {node.note && (
                  // `whitespace-pre-wrap`: a note is written as lines — a
                  // sentence of plan, a blank line, a damage calc — and
                  // without it they all run together on the public page.
                  <p className="mt-2 whitespace-pre-wrap border-t border-stone-100 pt-2 text-[11px] leading-relaxed text-stone-600">
                    {node.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
