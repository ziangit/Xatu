"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AccountLink } from "../../auth/AccountLink";
import { MonIcon, TYPE_COLORS } from "../components";
import { upsertCloudMatchup } from "../cloud";
import { decodeWorkflow, encodeWorkflow, parseTargetRef } from "../workflow-io";
import {
  loadActiveMatchupId,
  loadMatchups,
  loadSetup,
  saveSetup,
  setActiveMatchupId,
  upsertMatchup,
  type SavedMatchup,
  type SideState,
  type SimSetup,
  type TurnNode,
} from "../storage";

// Simulation page (per the xatu.png reference sketch): turn columns left to
// right, one state card per node with both sides shown as roster row +
// Front(2) + Back(2). "⑂ branch" duplicates a node as an ALTERNATE of the
// same turn (a different opposing lead is an alternate turn 1), so the tree
// may have several turn-1 roots. Switching + faints only — no moves, no
// damage, per the sketch's "start with simply switching" (and the project's
// no-battle-computation rule).

/** Three chained turns by default (per the reference sketch); everyone alive. */
function freshNodes(setup: SimSetup): TurnNode[] {
  const side = (parsed: { species: string }[]): SideState => ({
    front: parsed.slice(0, 2).map((m) => m.species),
    back: parsed.slice(2, 4).map((m) => m.species),
    fainted: [],
  });
  const state = () => ({
    my: side(setup.my.parsed),
    opp: side(setup.opp.parsed),
  });
  const t1 = { id: crypto.randomUUID(), turn: 1, parentId: null, ...state() };
  const t2 = { id: crypto.randomUUID(), turn: 2, parentId: t1.id, ...state() };
  const t3 = { id: crypto.randomUUID(), turn: 3, parentId: t2.id, ...state() };
  return [t1, t2, t3];
}

/** A declared move belongs to a front Pokémon — leaving the front clears it
 * (and its target). */
function stripMove(side: SideState, species: string): SideState {
  if (!side.moves?.[species] && !side.targets?.[species]) return side;
  const moves = { ...side.moves };
  delete moves[species];
  const targets = { ...side.targets };
  delete targets[species];
  return {
    ...side,
    moves: Object.keys(moves).length > 0 ? moves : undefined,
    targets: Object.keys(targets).length > 0 ? targets : undefined,
  };
}

/**
 * Click a roster Pokémon to place or unplace it: unplaced → Front (if free)
 * → else Back (if free); already placed → back to the bench. Fainting is a
 * separate gesture (right-click), never part of placement.
 */
function togglePlace(side: SideState, species: string): SideState {
  if (side.fainted.includes(species)) return side; // revive via right-click
  if (side.front.includes(species)) {
    return stripMove(
      { ...side, front: side.front.filter((s) => s !== species) },
      species,
    );
  }
  if (side.back.includes(species)) {
    return { ...side, back: side.back.filter((s) => s !== species) };
  }
  if (side.front.length < 2) return { ...side, front: [...side.front, species] };
  if (side.back.length < 2) return { ...side, back: [...side.back, species] };
  return side; // both groups full
}

/** Right-click: toggle fainted. Fainting pulls the Pokémon off the field. */
function toggleFaint(side: SideState, species: string): SideState {
  if (side.fainted.includes(species)) {
    return { ...side, fainted: side.fainted.filter((s) => s !== species) };
  }
  return stripMove(
    {
      ...side,
      front: side.front.filter((s) => s !== species),
      back: side.back.filter((s) => s !== species),
      fainted: [...side.fainted, species],
    },
    species,
  );
}

/** Row per node: leaves get sequential rows in DFS order; a parent sits on
 * its first child's row — alternates and forks fall to the rows below. */
function layoutRows(nodes: TurnNode[]): Map<string, number> {
  const children = new Map<string | null, TurnNode[]>();
  for (const n of nodes) {
    const list = children.get(n.parentId) ?? [];
    list.push(n);
    children.set(n.parentId, list);
  }
  const rows = new Map<string, number>();
  let next = 0;
  const visit = (n: TurnNode): number => {
    const kids = children.get(n.id) ?? [];
    const row = kids.length === 0 ? next++ : visit(kids[0]);
    for (const k of kids.slice(1)) visit(k);
    rows.set(n.id, row);
    return row;
  };
  for (const root of children.get(null) ?? []) visit(root);
  return rows;
}

/**
 * Two-stage popover: pick a move (Showdown type colors), then optionally a
 * target from the four on-field Pokémon. "No move" and "no target" are
 * first-class — a card can record positioning only.
 */
function MovePicker({
  species,
  moves,
  moveColor,
  moveMetaOf,
  allyFront,
  foeFront,
  backChoices,
  anchor,
  onMove,
  onTarget,
  onSwitchIn,
  onBench,
  onClose,
}: {
  species: string;
  moves: string[];
  moveColor: (move: string) => string;
  moveMetaOf: ((move: string) => MoveMeta | null) | null;
  allyFront: string[];
  foeFront: string[];
  /** Back-row Pokémon that can switch in for this one. */
  backChoices: string[];
  /** Viewport coordinates to pin the panel at (from the clicked anchor). */
  anchor: { left: number; top: number };
  onMove: (move: string | null) => void;
  onTarget: (ref: string | null) => void;
  onSwitchIn: (incoming: string) => void;
  onBench: () => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<"move" | "target">("move");
  const [targetKind, setTargetKind] = useState<string | null>(null);

  const pickMove = (m: string) => {
    onMove(m);
    const kind = moveMetaOf?.(m)?.target ?? null;
    // Known no-choice moves (spread, self, side, field) need no target — the
    // game aims them. Unknown moves fall back to offering the full choice.
    if (kind !== null && !CHOICE_TARGETS.has(kind)) {
      onTarget(null);
      onClose();
      return;
    }
    setTargetKind(kind);
    setStage("target");
  };

  const targetRow = (label: string, ref: string, iconSpecies: string) => (
    <button
      key={ref}
      onClick={() => {
        onTarget(ref);
        onClose();
      }}
      className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] text-stone-700 hover:bg-stone-100"
    >
      <MonIcon species={iconSpecies} scale={1} />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <>
      <button
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
        aria-label="close move picker"
      />
      {/* Fixed positioning escapes the board's scroll-clipping entirely. */}
      <div
        className="fixed z-50 max-h-[60vh] w-44 overflow-y-auto rounded-md border border-stone-200 bg-white p-1 shadow-lg"
        style={{
          left: Math.min(anchor.left, window.innerWidth - 192),
          top: anchor.top,
        }}
      >
        {stage === "move" ? (
          <>
            {moves.map((m) => (
              <button
                key={m}
                onClick={() => pickMove(m)}
                className="mb-0.5 block w-full rounded px-2 py-1 text-left text-[11px] font-semibold text-white hover:opacity-85"
                style={{ backgroundColor: moveColor(m) }}
              >
                {m}
              </button>
            ))}
            {moves.length === 0 && (
              <p className="px-2 py-1 text-[10px] text-stone-400">
                no moves in this import
              </p>
            )}
            {backChoices.length > 0 && (
              <p className="mt-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                switch out
              </p>
            )}
            {backChoices.map((b) => (
              <button
                key={b}
                onClick={() => {
                  onSwitchIn(b);
                  onClose();
                }}
                className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] text-stone-700 hover:bg-stone-100"
              >
                <MonIcon species={b} scale={1} />
                <span className="truncate">switch to {b}</span>
              </button>
            ))}
            <button
              onClick={() => {
                onMove(null);
                onClose();
              }}
              className="mt-1 block w-full rounded px-2 py-1 text-left text-[11px] text-stone-500 hover:bg-stone-100"
            >
              no move — just position
            </button>
            <button
              onClick={() => {
                onBench();
                onClose();
              }}
              className="block w-full rounded px-2 py-1 text-left text-[11px] text-stone-500 hover:bg-stone-100"
            >
              send to bench
            </button>
          </>
        ) : (
          <>
            <p className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
              target
            </p>
            {targetKind !== "adjacentAlly" &&
              targetKind !== "adjacentAllyOrSelf" &&
              foeFront.map((t) => targetRow(t, `foe:${t}`, t))}
            {targetKind !== "adjacentFoe" &&
              allyFront
                .filter((t) =>
                  t === species ? targetKind === "adjacentAllyOrSelf" : true,
                )
                .map((t) =>
                  targetRow(
                    t === species ? `${t} (self)` : `${t} (ally)`,
                    `ally:${t}`,
                    t,
                  ),
                )}
            <button
              onClick={() => {
                onTarget(null);
                onClose();
              }}
              className="block w-full rounded px-1.5 py-1 text-left text-[11px] text-stone-500 hover:bg-stone-100"
            >
              no target
            </button>
          </>
        )}
      </div>
    </>
  );
}

/** One filled-or-empty slot in the Front/Back rows. Click removes. */
function Slot({
  species,
  onRemove,
}: {
  species?: string;
  onRemove?: () => void;
}) {
  if (!species) {
    return (
      <span className="inline-block h-[34px] w-[46px] rounded border border-dashed border-stone-200" />
    );
  }
  return (
    <button
      onClick={onRemove}
      title={`${species} — click to send back`}
      className="h-[34px] w-[46px] rounded border border-stone-300 bg-white pl-0.5 hover:border-stone-500"
    >
      <MonIcon species={species} scale={1} />
    </button>
  );
}

/**
 * One side of a state card, per the reference sketch: the six-mon roster row
 * stays as-is on top; Front and Back each get their own two-slot row.
 */
function SideBoard({
  title,
  roster,
  movesFor,
  state,
  foeFront,
  brought,
  allowMoves,
  moveMetaOf,
  pickerFor,
  pickerAnchor,
  onOpenPicker,
  onPickMove,
  onPickTarget,
  onSwitchIn,
  onToggle,
  onFaint,
  onRemove,
}: {
  title: string;
  roster: string[];
  /** The Pokémon's possible moves, from the imported set (may be empty). */
  movesFor: (species: string) => string[];
  state: SideState;
  /** The other side's front pair — move targets come from the on-field four. */
  foeFront: string[];
  /** After turn 0, only the four brought Pokémon are selectable (null = no restriction). */
  brought: Set<string> | null;
  /** Turn 0 is team preview: positions only, no move declarations. */
  allowMoves: boolean;
  /** Dex move metadata, once lazily loaded (null while loading). */
  moveMetaOf: ((move: string) => MoveMeta | null) | null;
  /** Species whose move picker is open on this board, if any. */
  pickerFor: string | null;
  /** Viewport anchor for the open picker panel. */
  pickerAnchor: { left: number; top: number } | null;
  onOpenPicker: (
    species: string | null,
    anchor?: { left: number; top: number },
  ) => void;
  onPickMove: (species: string, move: string | null) => void;
  onPickTarget: (species: string, ref: string | null) => void;
  onSwitchIn: (outgoing: string, incoming: string) => void;
  onToggle: (species: string) => void;
  onFaint: (species: string) => void;
  onRemove: (species: string) => void;
}) {
  const moveColor = (move: string) => {
    const type = moveMetaOf?.(move)?.type ?? null;
    return (type && TYPE_COLORS[type]) || "#a8a29e";
  };
  const inState = (s: string) =>
    state.front.includes(s) || state.back.includes(s) || state.fainted.includes(s);

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
        {title}
      </p>
      <div className="mt-1 flex">
        {roster.map((s, i) => {
          const excluded = brought !== null && !brought.has(s) && !inState(s);
          return (
            <button
              key={`${s}-${i}`}
              disabled={excluded}
              onClick={excluded ? undefined : () => onToggle(s)}
              onContextMenu={
                excluded
                  ? (e) => e.preventDefault()
                  : (e) => {
                      e.preventDefault();
                      onFaint(s);
                    }
              }
              title={
                excluded
                  ? `${s} — not brought (chosen at turn 1)`
                  : state.fainted.includes(s)
                    ? `${s} — fainted (right-click to revive)`
                    : s
              }
              className={
                excluded
                  ? "cursor-not-allowed opacity-25 grayscale"
                  : "rounded hover:bg-stone-100"
              }
            >
              <MonIcon
                species={s}
                scale={1}
                fainted={state.fainted.includes(s)}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="w-9 text-[10px] text-stone-400">Front</span>
        {[0, 1].map((i) => {
          const s = state.front[i];
          if (!s) {
            return (
              <div key={i} className="flex w-[64px] justify-center">
                <span className="inline-block h-[34px] w-[46px] rounded border border-dashed border-stone-200" />
              </div>
            );
          }
          return (
            <div key={i} className="flex w-[64px] justify-center">
              {allowMoves ? (
                <button
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    onOpenPicker(pickerFor === s ? null : s, {
                      left: r.left,
                      top: r.bottom + 4,
                    });
                  }}
                  title={`${s} — declare a move or send back`}
                  className="h-[34px] w-[46px] rounded border border-stone-300 bg-white pl-0.5 hover:border-stone-500"
                >
                  <MonIcon species={s} scale={1} />
                </button>
              ) : (
                // Team preview: the slot is just a position — click sends back.
                <Slot species={s} onRemove={() => onRemove(s)} />
              )}
            </div>
          );
        })}
      </div>

      {/* One fixed chip line per front slot (top line = left mon) — heights
          are deterministic, so chips can never wrap or shift the rows below. */}
      {allowMoves && state.front.length > 0 && (
        <div className="ml-[42px] mt-1 space-y-1">
          {[0, 1].map((slotIndex) => {
            const s = state.front[slotIndex];
            if (!s) return <div key={slotIndex} className="h-[19px]" />;
            const move = state.moves?.[s];
            // A target renders only while it's still one of the on-field four.
            const targetRef = state.targets?.[s]
              ? parseTargetRef(state.targets[s])
              : null;
            const targetSpecies =
              targetRef &&
              (targetRef.kind === "ally" ? state.front : foeFront).includes(
                targetRef.species,
              )
                ? targetRef.species
                : null;
            return (
              <div key={s} className="flex h-[19px] items-center">
                <button
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    onOpenPicker(pickerFor === s ? null : s, {
                      left: r.left,
                      top: r.bottom + 4,
                    });
                  }}
                  title={
                    move
                      ? `${s}: ${move}${targetSpecies ? ` → ${targetSpecies}` : ""}`
                      : `${s} — declare a move`
                  }
                  className={`flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    move
                      ? "text-white"
                      : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                  }`}
                  style={move ? { backgroundColor: moveColor(move) } : undefined}
                >
                  <MonIcon species={s} scale={0.5} />
                  {move ?? "+ move"}
                  {move && targetSpecies && (
                    <>
                      <span className="opacity-80">→</span>
                      <MonIcon species={targetSpecies} scale={0.5} />
                    </>
                  )}
                </button>
                {pickerFor === s && pickerAnchor && (
                  <MovePicker
                    key={s}
                    species={s}
                    moves={movesFor(s)}
                    moveColor={moveColor}
                    moveMetaOf={moveMetaOf}
                    allyFront={state.front}
                    foeFront={foeFront}
                    backChoices={state.back}
                    anchor={pickerAnchor}
                    onMove={(m) => onPickMove(s, m)}
                    onTarget={(ref) => onPickTarget(s, ref)}
                    onSwitchIn={(incoming) => onSwitchIn(s, incoming)}
                    onBench={() => onRemove(s)}
                    onClose={() => onOpenPicker(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-1 flex items-center gap-1.5">
        <span className="w-9 text-[10px] text-stone-400">Back</span>
        {[0, 1].map((i) => (
          <div key={i} className="flex w-[64px] justify-center">
            <Slot
              species={state.back[i]}
              onRemove={() => onRemove(state.back[i])}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  branch: boolean;
}

/** Dex metadata per move: type (for color) and targeting shape. */
interface MoveMeta {
  type: string;
  target: string;
}

/** Dex targeting kinds that require the author to pick a specific target.
 * Spread moves (Rock Slide), self/side/field moves need no choice. */
const CHOICE_TARGETS = new Set([
  "normal",
  "any",
  "adjacentFoe",
  "adjacentAlly",
  "adjacentAllyOrSelf",
]);

export default function SimPage() {
  const [setup, setSetup] = useState<SimSetup | null>(null);
  const [nodes, setNodes] = useState<TurnNode[]>([]);
  const [ready, setReady] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  /** The library entry this board belongs to (null = not yet saved). */
  const [matchup, setMatchup] = useState<{ id: string; name: string } | null>(
    null,
  );
  /** Cloud copy of the last save: off (signed out), ok, or an error message. */
  const [cloudState, setCloudState] = useState<"off" | "ok" | string>("off");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [movePicker, setMovePicker] = useState<{
    nodeId: string;
    side: "my" | "opp";
    species: string;
    anchor: { left: number; top: number };
  } | null>(null);
  const [moveMetaOf, setMoveMetaOf] = useState<
    ((move: string) => MoveMeta | null) | null
  >(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  // The dex supplies move metadata only — type (for Showdown colors) and
  // targeting shape (so spread/self moves skip the target prompt). Loaded
  // lazily so the board renders immediately; nothing is computed with it.
  useEffect(() => {
    let alive = true;
    import("@pkmn/dex").then(({ Dex }) => {
      if (!alive) return;
      setMoveMetaOf(() => (name: string) => {
        const move = Dex.moves.get(name);
        return move.exists ? { type: move.type, target: move.target } : null;
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggleNote = (id: string) => {
    const next = new Set(expandedNotes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNotes(next);
  };

  useEffect(() => {
    // Deferred so the storage read + state seeding happen outside the effect's
    // synchronous body (localStorage is browser-only; this runs once).
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const s = loadSetup();
      if (!s) {
        setReady(true);
        return;
      }
      // Resume the library entry that was opened (or, failing that, the most
      // recent save of this exact team pair); otherwise start fresh.
      const matches = (m: SavedMatchup) =>
        m.setup.my.id === s.my.id &&
        m.setup.opp.id === s.opp.id &&
        m.nodes.length > 0;
      const library = loadMatchups();
      const activeId = loadActiveMatchupId();
      const entry =
        (activeId
          ? library.find((m) => m.id === activeId && matches(m))
          : undefined) ?? library.find(matches);
      setSetup(s);
      if (entry) {
        setNodes(entry.nodes);
        setSavedAt(entry.savedAt);
        setMatchup({ id: entry.id, name: entry.name });
        setActiveMatchupId(entry.id);
      } else {
        setNodes(freshNodes(s));
        setSavedAt(null);
        setMatchup(null);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Measure card positions after layout and draw parent → child edges.
  useEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const origin = wrap.getBoundingClientRect();
      const rect = (id: string) => {
        const el = cardRefs.current.get(id);
        return el ? el.getBoundingClientRect() : null;
      };
      const found: Edge[] = [];
      const firstChild = new Map<string, string>();
      for (const n of nodes) {
        if (n.parentId && !firstChild.has(n.parentId)) {
          firstChild.set(n.parentId, n.id);
        }
      }
      for (const n of nodes) {
        if (!n.parentId) continue;
        const from = rect(n.parentId);
        const to = rect(n.id);
        if (!from || !to) continue;
        found.push({
          x1: from.right - origin.left,
          y1: from.top - origin.top + from.height / 2,
          x2: to.left - origin.left,
          y2: to.top - origin.top + to.height / 2,
          branch: firstChild.get(n.parentId) !== n.id,
        });
      }
      setEdges(found);
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [nodes, expandedNotes]);

  if (!ready) return null;
  if (!setup) {
    return (
      <div className="min-h-screen w-full bg-[#fafaf8] p-12 font-sans text-sm text-stone-500">
        No teams set.{" "}
        <Link href="/demo" className="underline underline-offset-2">
          Pick teams first →
        </Link>
      </div>
    );
  }

  const rows = layoutRows(nodes);
  const maxTurn = Math.max(...nodes.map((n) => n.turn));
  const maxRow = Math.max(...[...rows.values()], 0);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childCount = new Map<string, number>();
  for (const n of nodes) {
    if (n.parentId)
      childCount.set(n.parentId, (childCount.get(n.parentId) ?? 0) + 1);
  }
  const rootCount = nodes.filter((n) => n.parentId === null).length;
  const firstSiblingId = (node: TurnNode) =>
    nodes.find((n) => n.parentId === node.parentId)?.id;

  const rootOf = (n: TurnNode): TurnNode => {
    let cur = n;
    while (cur.parentId) {
      const p = byId.get(cur.parentId);
      if (!p) break;
      cur = p;
    }
    return cur;
  };

  /** Bring 6, pick 4: once turn 0 (team preview) has all four slots filled,
   * later turns of that line may only use those four. */
  const broughtOf = (node: TurnNode, side: "my" | "opp"): Set<string> | null => {
    if (node.turn <= 1) return null;
    const rootSide = rootOf(node)[side];
    const four = [...rootSide.front, ...rootSide.back];
    return four.length === 4 ? new Set(four) : null;
  };

  // Functional update: move + target changes can land in the same tick.
  const update = (id: string, fn: (n: TurnNode) => TurnNode) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? fn(n) : n)));

  const setSideMove = (
    nodeId: string,
    sideKey: "my" | "opp",
    species: string,
    move: string | null,
  ) =>
    update(nodeId, (n) => {
      const side = n[sideKey];
      const next = move
        ? { ...side, moves: { ...side.moves, [species]: move } }
        : stripMove(side, species);
      return { ...n, [sideKey]: next };
    });

  /** Switch: a back Pokémon takes the front slot; the outgoing one goes to
   * the back (its declared move clears — it's no longer acting). */
  const swapFrontBack = (
    nodeId: string,
    sideKey: "my" | "opp",
    outgoing: string,
    incoming: string,
  ) =>
    update(nodeId, (n) => {
      const side = n[sideKey];
      const fi = side.front.indexOf(outgoing);
      const bi = side.back.indexOf(incoming);
      if (fi < 0 || bi < 0) return n;
      const front = [...side.front];
      const back = [...side.back];
      front[fi] = incoming;
      back[bi] = outgoing;
      return { ...n, [sideKey]: stripMove({ ...side, front, back }, outgoing) };
    });

  const setSideTarget = (
    nodeId: string,
    sideKey: "my" | "opp",
    species: string,
    ref: string | null,
  ) =>
    update(nodeId, (n) => {
      const side = n[sideKey];
      const targets = { ...side.targets };
      if (ref) targets[species] = ref;
      else delete targets[species];
      return {
        ...n,
        [sideKey]: {
          ...side,
          targets: Object.keys(targets).length > 0 ? targets : undefined,
        },
      };
    });

  /** Extend the line: a child at turn+1 carrying this turn's state forward. */
  const addNextTurn = (parent: TurnNode) =>
    setNodes([
      ...nodes,
      {
        id: crypto.randomUUID(),
        turn: parent.turn + 1,
        parentId: parent.id,
        my: structuredClone(parent.my),
        opp: structuredClone(parent.opp),
      },
    ]);

  /** Branch: an ALTERNATE of this same turn (same parent, same turn). */
  const addAlternate = (node: TurnNode) =>
    setNodes([
      ...nodes,
      {
        id: crypto.randomUUID(),
        turn: node.turn,
        parentId: node.parentId,
        my: structuredClone(node.my),
        opp: structuredClone(node.opp),
      },
    ]);

  const removeSubtree = (id: string) => {
    const doomed = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of nodes) {
        if (n.parentId && doomed.has(n.parentId) && !doomed.has(n.id)) {
          doomed.add(n.id);
          grew = true;
        }
      }
    }
    setNodes(nodes.filter((n) => !doomed.has(n.id)));
  };

  /** Save upserts this board into the matchup library — each team pair the
   * author works on keeps its own entry instead of overwriting one slot. */
  const save = (toSave: TurnNode[] = nodes) => {
    const entry: SavedMatchup = {
      id: matchup?.id ?? crypto.randomUUID(),
      name: matchup?.name ?? `${setup.my.name} vs ${setup.opp.name}`,
      setup,
      nodes: toSave,
      savedAt: new Date().toISOString(),
    };
    upsertMatchup(entry);
    setActiveMatchupId(entry.id);
    setMatchup({ id: entry.id, name: entry.name });
    setSavedAt(entry.savedAt);
    // Signed in → mirror the save to the account; local save already landed.
    void upsertCloudMatchup(entry).then(setCloudState);
  };

  /** Save button in the note editor: trim, collapse, persist to the browser. */
  const commitNote = (id: string) => {
    const next = nodes.map((n) =>
      n.id === id ? { ...n, note: n.note?.trim() || undefined } : n,
    );
    setNodes(next);
    const collapsed = new Set(expandedNotes);
    collapsed.delete(id);
    setExpandedNotes(collapsed);
    save(next);
  };

  /** Reset clears the working board only — the library entry (if any) keeps
   * its last saved state until the next Save overwrites it. */
  const resetBoard = () => {
    setNodes(freshNodes(setup));
    setSavedAt(null);
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(encodeWorkflow(setup, nodes));
  };

  const importWorkflow = () => {
    const result = decodeWorkflow(importText.trim());
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    setSetup(result.setup);
    setNodes(result.nodes);
    saveSetup(result.setup);
    // An imported board is a new, not-yet-saved matchup.
    setActiveMatchupId(null);
    setMatchup(null);
    setSavedAt(null);
    setShowImport(false);
    setImportText("");
    setImportError(null);
    setImportWarnings(result.warnings);
  };

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-7xl px-6 py-10">
        <header className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {setup.my.name}{" "}
              <span className="font-normal text-stone-400">vs.</span>{" "}
              {setup.opp.name}
            </h1>
            <p className="text-xs text-stone-400">
              turn 0 picks your four at preview · from turn 1, click a front
              slot to declare its move (optional; spread moves aim themselves)
              · right-click to faint · ⑂ records an alternate version of that
              turn · turn 2 is the last
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AccountLink />
            <Link
              href="/demo"
              className="px-2 text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              ← teams
            </Link>
            <button
              onClick={resetBoard}
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-600 hover:border-stone-500"
            >
              Reset
            </button>
            <button
              onClick={() => {
                setShowImport(!showImport);
                setImportError(null);
              }}
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-600 hover:border-stone-500"
            >
              Import
            </button>
            <button
              onClick={copyJson}
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-600 hover:border-stone-500"
            >
              Copy JSON
            </button>
            <button
              onClick={() => save()}
              className="rounded-md bg-[#e5484d] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:opacity-85"
            >
              Save
            </button>
          </div>
        </header>
        {savedAt && matchup && (
          <p className="mt-1 text-right text-[10px] text-stone-400">
            saved as “{matchup.name}” · {new Date(savedAt).toLocaleTimeString()}
            {cloudState === "ok" && " · synced to your account"}
          </p>
        )}
        {cloudState !== "ok" && cloudState !== "off" && (
          <p className="mt-1 text-right text-[10px] text-amber-700">
            saved to this browser, but the account sync failed: {cloudState}
          </p>
        )}

        {importWarnings.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">
                Imported with fixes
              </p>
              <button
                onClick={() => setImportWarnings([])}
                className="text-[11px] text-amber-600 hover:text-amber-800"
              >
                dismiss
              </button>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[11px] leading-relaxed text-amber-800">
              {importWarnings.map((w, i) => (
                <li key={i}>· {w}</li>
              ))}
            </ul>
          </div>
        )}

        {showImport && (
          <div className="mt-4 rounded-lg border border-stone-200 bg-[#f6f5ef] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              Import a matchup workflow
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="Paste a workflow copied with Copy JSON…"
              className="mt-2 w-full resize-y rounded border border-stone-300 bg-white p-2.5 font-mono text-[11px] text-stone-700 placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={importWorkflow}
                disabled={!importText.trim()}
                className="rounded bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:opacity-80 disabled:opacity-30"
              >
                Load
              </button>
              {importError && (
                <p className="text-xs text-red-600">{importError}</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 overflow-x-auto pb-4">
          <div ref={wrapRef} className="relative w-max">
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              <defs>
                <marker
                  id="arrow-main"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6.5"
                  refY="4"
                  orient="auto"
                >
                  <path d="M1 1 L7 4 L1 7 Z" fill="#b3ada4" />
                </marker>
                <marker
                  id="arrow-branch"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6.5"
                  refY="4"
                  orient="auto"
                >
                  <path d="M1 1 L7 4 L1 7 Z" fill="#d97706" />
                </marker>
              </defs>
              {edges.map((e, i) => {
                const dx = Math.max(24, (e.x2 - e.x1) * 0.5);
                const color = e.branch ? "#d97706" : "#b3ada4";
                return (
                  <g key={i}>
                    <circle cx={e.x1} cy={e.y1} r={3} fill={color} />
                    <path
                      d={`M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2 - 7} ${e.y2}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.75}
                      strokeLinecap="round"
                      strokeDasharray={e.branch ? "5 4" : undefined}
                      markerEnd={`url(#${e.branch ? "arrow-branch" : "arrow-main"})`}
                    />
                  </g>
                );
              })}
            </svg>
            <div
              className="grid gap-x-10 gap-y-4"
              style={{
                gridTemplateColumns: `repeat(${maxTurn}, 560px)`,
                gridTemplateRows: `auto repeat(${maxRow + 1}, auto)`,
              }}
            >
            {Array.from({ length: maxTurn }, (_, i) => (
              <p
                key={i}
                className="text-[11px] font-semibold uppercase tracking-widest text-stone-400"
                style={{ gridColumn: i + 1, gridRow: 1 }}
              >
                {i === 0 ? "Turn 0 · team preview" : `Turn ${i}`}
              </p>
            ))}

            {nodes.map((node) => {
              const row = (rows.get(node.id) ?? 0) + 2;
              const parent = node.parentId ? byId.get(node.parentId) : null;
              const isAlternate = firstSiblingId(node) !== node.id;
              const removable = node.parentId !== null || rootCount > 1;
              return (
                <div
                  key={node.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(node.id, el);
                    else cardRefs.current.delete(node.id);
                  }}
                  className="relative rounded-lg border border-stone-200 bg-white p-3"
                  style={{ gridColumn: node.turn, gridRow: row }}
                >
                  {isAlternate && (
                    <p className="mb-1.5 text-[10px] font-medium text-amber-600">
                      ⑂ alternate turn {node.turn - 1}
                      {parent ? ` (after turn ${parent.turn - 1})` : ""}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <SideBoard
                      title="My Team"
                      roster={setup.my.parsed.map((m) => m.species)}
                      movesFor={(s) =>
                        setup.my.parsed.find((m) => m.species === s)?.moves ?? []
                      }
                      state={node.my}
                      foeFront={node.opp.front}
                      brought={broughtOf(node, "my")}
                      allowMoves={node.turn > 1}
                      moveMetaOf={moveMetaOf}
                      pickerFor={
                        movePicker?.nodeId === node.id && movePicker.side === "my"
                          ? movePicker.species
                          : null
                      }
                      pickerAnchor={movePicker?.anchor ?? null}
                      onOpenPicker={(s, anchor) =>
                        setMovePicker(
                          s && anchor
                            ? { nodeId: node.id, side: "my", species: s, anchor }
                            : null,
                        )
                      }
                      onPickMove={(s, m) => setSideMove(node.id, "my", s, m)}
                      onPickTarget={(s, ref) =>
                        setSideTarget(node.id, "my", s, ref)
                      }
                      onSwitchIn={(out, inc) =>
                        swapFrontBack(node.id, "my", out, inc)
                      }
                      onToggle={(s) =>
                        update(node.id, (n) => ({
                          ...n,
                          my: togglePlace(n.my, s),
                        }))
                      }
                      onFaint={(s) =>
                        update(node.id, (n) => ({
                          ...n,
                          my: toggleFaint(n.my, s),
                        }))
                      }
                      onRemove={(s) =>
                        update(node.id, (n) => ({
                          ...n,
                          my: togglePlace(n.my, s),
                        }))
                      }
                    />
                    <SideBoard
                      title="Opposing Team"
                      roster={setup.opp.parsed.map((m) => m.species)}
                      movesFor={(s) =>
                        setup.opp.parsed.find((m) => m.species === s)?.moves ??
                        []
                      }
                      state={node.opp}
                      foeFront={node.my.front}
                      brought={broughtOf(node, "opp")}
                      allowMoves={node.turn > 1}
                      moveMetaOf={moveMetaOf}
                      pickerFor={
                        movePicker?.nodeId === node.id &&
                        movePicker.side === "opp"
                          ? movePicker.species
                          : null
                      }
                      pickerAnchor={movePicker?.anchor ?? null}
                      onOpenPicker={(s, anchor) =>
                        setMovePicker(
                          s && anchor
                            ? {
                                nodeId: node.id,
                                side: "opp",
                                species: s,
                                anchor,
                              }
                            : null,
                        )
                      }
                      onPickMove={(s, m) => setSideMove(node.id, "opp", s, m)}
                      onPickTarget={(s, ref) =>
                        setSideTarget(node.id, "opp", s, ref)
                      }
                      onSwitchIn={(out, inc) =>
                        swapFrontBack(node.id, "opp", out, inc)
                      }
                      onToggle={(s) =>
                        update(node.id, (n) => ({
                          ...n,
                          opp: togglePlace(n.opp, s),
                        }))
                      }
                      onFaint={(s) =>
                        update(node.id, (n) => ({
                          ...n,
                          opp: toggleFaint(n.opp, s),
                        }))
                      }
                      onRemove={(s) =>
                        update(node.id, (n) => ({
                          ...n,
                          opp: togglePlace(n.opp, s),
                        }))
                      }
                    />
                  </div>

                  <div className="mt-2">
                    {expandedNotes.has(node.id) ? (
                      <div>
                        <button
                          onClick={() => toggleNote(node.id)}
                          className="text-[10px] font-medium text-stone-400 hover:text-stone-600"
                        >
                          ▾ note
                        </button>
                        <textarea
                          value={node.note ?? ""}
                          onChange={(e) =>
                            update(node.id, (n) => ({
                              ...n,
                              note: e.target.value,
                            }))
                          }
                          rows={Math.max(
                            3,
                            (node.note ?? "").split("\n").length + 1,
                          )}
                          placeholder="Why this line, what to watch for — optional"
                          className="mt-1 w-full resize-y rounded border border-stone-200 bg-stone-50 p-2 text-[11px] leading-relaxed text-stone-700 field-sizing-content placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
                        />
                        <div className="mt-1 flex justify-end">
                          <button
                            onClick={() => commitNote(node.id)}
                            className="rounded bg-stone-900 px-2.5 py-1 text-[10px] font-medium text-white hover:opacity-80"
                          >
                            save note
                          </button>
                        </div>
                      </div>
                    ) : node.note?.trim() ? (
                      <button
                        onClick={() => toggleNote(node.id)}
                        className="flex w-full items-baseline gap-1 text-left"
                      >
                        <span className="text-[10px] text-stone-400">▸</span>
                        <span className="min-w-0 flex-1 truncate text-[11px] text-stone-500 hover:text-stone-700">
                          {node.note}
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleNote(node.id)}
                        className="text-[10px] text-stone-300 hover:text-stone-500"
                      >
                        + note
                      </button>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2 border-t border-stone-100 pt-2">
                    {(childCount.get(node.id) ?? 0) === 0 && node.turn < 3 && (
                      <button
                        onClick={() => addNextTurn(node)}
                        className="rounded border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 hover:border-stone-400"
                      >
                        + turn {node.turn}
                      </button>
                    )}
                    <button
                      onClick={() => addAlternate(node)}
                      className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 hover:border-amber-400"
                    >
                      ⑂ branch
                    </button>
                    {removable && (
                      <button
                        onClick={() => removeSubtree(node.id)}
                        className="ml-auto rounded px-1.5 py-0.5 text-[11px] text-stone-300 hover:text-red-600"
                      >
                        remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>

        <footer className="mt-10 border-t border-stone-200 pt-4 text-[11px] leading-relaxed text-stone-400">
          xatu is an unaffiliated, non-commercial fan project. Pokémon is owned
          by Nintendo, The Pokémon Company, Game Freak, and Creatures.
        </footer>
      </main>
    </div>
  );
}
