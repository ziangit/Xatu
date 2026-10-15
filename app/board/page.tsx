"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BackLink, HeaderNav, LegalFooter, NavLink, Wordmark } from "../nav";
import { T } from "../i18n/T";
import { useLang, useT } from "../i18n/provider";
import { htmlLang } from "../i18n/translate";
import { useCopy } from "../ui";
import {
  cascadeMega,
  cascadePositions,
  isAlternate,
  layoutRows,
  stripMove,
  arrivals,
} from "../demo/board";
import { MonIcon, TYPE_COLORS } from "../demo/components";
import { EdgeLayer, useTurnEdges } from "../demo/turn-edges";
import { upsertCloudMatchup } from "../demo/cloud";
import {
  decodeWorkflowGroup,
  encodeGroup,
  encodeWorkflow,
  parseTargetRef,
} from "../demo/workflow-io";
import { applyGroupImport, importSummary } from "../demo/import-group";
import { FieldPanel } from "../demo/field-panel";
import {
  calcKey,
  calcContext,
  calcSubject,
  hasField,
  inputPrint,
  isFresh,
  missingSets,
  pruneCalcs,
  runCalc,
  type Boosts,
  type CalcNote,
  type FieldState,
} from "../demo/calc";
import {
  findPairMatchup,
  groupDocId,
  loadActiveMatchupId,
  loadCalcOn,
  loadMatchups,
  loadSetup,
  saveCalcOn,
  saveSetup,
  setActiveMatchupId,
  upsertMatchup,
  type SavedMatchup,
  type SideState,
  type SimSetup,
  type TurnNode,
} from "../demo/storage";

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

/** Board rules live in ./board — pure and unit-tested. */

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
  if (side.front.length < 2)
    return { ...side, front: [...side.front, species] };
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
  switchedIn,
  boosts,
  crit,
  showBoosts,
  onBoost,
  onCrit,
  megaForme,
  megaActive,
  anchor,
  onMove,
  onTarget,
  onSwitchIn,
  onMega,
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
  /** This Pokémon came in on this turn — switching in IS its action, so it
   * can't also move or Mega Evolve. */
  switchedIn: boolean;
  /** Stat stages for this Pokémon, and whether its move crits. Null = the
   *  calculator is off, so none of it is offered. */
  boosts: Boosts | undefined;
  crit: boolean;
  showBoosts: boolean;
  onBoost: (stat: keyof Boosts, stage: number) => void;
  onCrit: (on: boolean) => void;
  /** Its Mega forme, when it holds the matching stone (null otherwise). */
  megaForme: string | null;
  megaActive: boolean;
  /** Viewport coordinates to pin the panel at (from the clicked anchor). */
  anchor: { left: number; top: number };
  onMove: (move: string | null) => void;
  onTarget: (ref: string | null) => void;
  onSwitchIn: (incoming: string) => void;
  onMega: (on: boolean) => void;
  onBench: () => void;
  onClose: () => void;
}) {
  const t = useT();
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
        aria-label={t("close move picker")}
      />
      {/* Fixed positioning escapes the board's scroll-clipping entirely. */}
      <div
        className="pop-in fixed z-50 max-h-[60vh] w-44 overflow-y-auto rounded-md border border-stone-200 bg-white p-1 shadow-lg"
        style={{
          left: Math.min(anchor.left, window.innerWidth - 192),
          top: anchor.top,
        }}
      >
        {stage === "move" ? (
          <>
            {switchedIn ? (
              <p className="px-2 py-1 text-[10px] leading-relaxed text-stone-500">
                {t(
                  "{species} switched in this turn — switching is its action, so it can’t also move.",
                  { species },
                )}
              </p>
            ) : (
              <>
                {/* Mega first: it happens alongside the turn's move, so the
                    panel stays open after toggling it. */}
                {megaForme && (
                  <button
                    onClick={() => onMega(!megaActive)}
                    className={`mb-1 flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[11px] font-semibold ${
                      megaActive
                        ? "bg-violet-600 text-white hover:opacity-85"
                        : "border border-violet-300 text-violet-700 hover:bg-violet-50"
                    }`}
                  >
                    <MonIcon species={megaForme} scale={0.6} />
                    {megaActive ? t("⟡ Mega — recorded") : t("⟡ Mega Evolve")}
                  </button>
                )}
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
                    {t("no moves in this import")}
                  </p>
                )}
              </>
            )}
            {backChoices.length > 0 && (
              <p className="mt-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                {t("switch out")}
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
                <span className="truncate">
                  {t("switch to {species}", { species: b })}
                </span>
              </button>
            ))}
            {!switchedIn && (
              <button
                onClick={() => {
                  onMove(null);
                  onClose();
                }}
                className="mt-1 block w-full rounded px-2 py-1 text-left text-[11px] text-stone-500 hover:bg-stone-100"
              >
                {t("no move — just position")}
              </button>
            )}
            {/* Stages belong to the Pokémon, so they live in its own picker
                and apply to everything it does *and* everything done to it —
                the calculation reads the attacker's offensive stage and the
                defender's defensive one. A crit belongs to this attack, so it
                sits with the move. Nothing here is inferred: xatu will not
                apply Intimidate for you. */}
            {showBoosts && (
              <div className="mt-1 border-t border-stone-100 pt-1">
                <p className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                  {t("stat stages")}
                </p>
                {(["atk", "def", "spa", "spd"] as const).map((stat) => {
                  const stage = boosts?.[stat] ?? 0;
                  return (
                    <div
                      key={stat}
                      className="flex items-center gap-1 px-1.5 py-0.5"
                    >
                      <span className="w-7 text-[10px] text-stone-500">
                        {/* The key must read correctly in English: a missing
                            translation falls back to the text after `|`. */}
                        {t(STAT_LABEL[stat])}
                      </span>
                      <button
                        onClick={() => onBoost(stat, stage - 1)}
                        disabled={stage <= -6}
                        className="h-4 w-4 rounded border border-stone-200 text-[10px] leading-none text-stone-500 hover:border-stone-400 disabled:opacity-30"
                      >
                        −
                      </button>
                      <span
                        className={`w-6 text-center text-[10px] tabular-nums ${
                          stage > 0
                            ? "font-semibold text-emerald-700"
                            : stage < 0
                              ? "font-semibold text-[#e5484d]"
                              : "text-stone-400"
                        }`}
                      >
                        {stage > 0 ? `+${stage}` : stage}
                      </span>
                      <button
                        onClick={() => onBoost(stat, stage + 1)}
                        disabled={stage >= 6}
                        className="h-4 w-4 rounded border border-stone-200 text-[10px] leading-none text-stone-500 hover:border-stone-400 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => onCrit(!crit)}
                  className={`mt-0.5 block w-full rounded px-1.5 py-1 text-left text-[11px] transition-colors ${
                    crit
                      ? "bg-amber-500 font-semibold text-white hover:opacity-85"
                      : "text-stone-500 hover:bg-stone-100"
                  }`}
                >
                  {crit ? t("✦ critical hit") : t("critical hit")}
                </button>
              </div>
            )}
            <button
              onClick={() => {
                onBench();
                onClose();
              }}
              className="block w-full rounded px-2 py-1 text-left text-[11px] text-stone-500 hover:bg-stone-100"
            >
              {t("send to bench")}
            </button>
          </>
        ) : (
          <>
            <p className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
              {t("target")}
            </p>
            {targetKind !== "adjacentAlly" &&
              targetKind !== "adjacentAllyOrSelf" &&
              foeFront.map((tg) => targetRow(tg, `foe:${tg}`, tg))}
            {targetKind !== "adjacentFoe" &&
              allyFront
                .filter((tg) =>
                  tg === species ? targetKind === "adjacentAllyOrSelf" : true,
                )
                .map((tg) =>
                  targetRow(
                    tg === species
                      ? t("{species} (self)", { species: tg })
                      : t("{species} (ally)", { species: tg }),
                    `ally:${tg}`,
                    tg,
                  ),
                )}
            <button
              onClick={() => {
                onTarget(null);
                onClose();
              }}
              className="block w-full rounded px-1.5 py-1 text-left text-[11px] text-stone-500 hover:bg-stone-100"
            >
              {t("no target")}
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
  const t = useT();
  if (!species) {
    return (
      <span className="inline-block h-[34px] w-[46px] rounded border border-dashed border-stone-200" />
    );
  }
  return (
    <button
      onClick={onRemove}
      title={t("{species} — click to send back", { species })}
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
  megaFormeFor,
  state,
  parentState,
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
  onMega,
  onToggle,
  onFaint,
  onRemove,
  calcs,
  calcHintOf,
  boostsOf,
  critOf,
  onBoost,
  onCrit,
}: {
  title: string;
  roster: string[];
  /** The Pokémon's possible moves, from the imported set (may be empty). */
  movesFor: (species: string) => string[];
  /** Its Mega forme when it holds the stone, else null (dex metadata only). */
  megaFormeFor: (species: string) => string | null;
  state: SideState;
  /** The same side one turn earlier — anything newly in front switched in. */
  parentState: SideState | null;
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
  onMega: (species: string | null) => void;
  onToggle: (species: string) => void;
  onFaint: (species: string) => void;
  onRemove: (species: string) => void;
  /** Stored calculations for this side, or null when the calculator is off. */
  calcs: Record<string, CalcNote> | null;
  /** Why a calculation is absent, when it would otherwise be there. */
  calcHintOf: ((species: string) => string[] | null) | null;
  /** Stat stages and crits, offered only while the calculator is on. */
  boostsOf: ((species: string) => Boosts | undefined) | null;
  critOf: (species: string) => boolean;
  onBoost: (species: string, stat: keyof Boosts, stage: number) => void;
  onCrit: (species: string, on: boolean) => void;
}) {
  const t = useT();
  const moveColor = (move: string) => {
    const type = moveMetaOf?.(move)?.type ?? null;
    return (type && TYPE_COLORS[type]) || "#a8a29e";
  };
  // `switchedIn` cannot move (switching was its action); `cameIn` replaced
  // something that fainted, which costs no action, so it can.
  const { switched, arrived } = arrivals(state, parentState);
  const switchedIn = new Set(switched);
  const cameIn = new Set(arrived);
  /** On the field, a Mega-Evolved Pokémon is shown as its Mega forme. */
  const shownAs = (s: string) =>
    (state.mega === s ? megaFormeFor(s) : null) ?? s;
  const inState = (s: string) =>
    state.front.includes(s) ||
    state.back.includes(s) ||
    state.fainted.includes(s);

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
                  ? t("{species} — not brought (chosen at turn 1)", {
                      species: s,
                    })
                  : state.fainted.includes(s)
                    ? t("{species} — fainted (right-click to revive)", {
                        species: s,
                      })
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
        <span className="w-9 text-[10px] text-stone-400">
          {t("slot|Front")}
        </span>
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
                  title={
                    switchedIn.has(s)
                      ? t("{species} — switched in this turn", { species: s })
                      : cameIn.has(s)
                        ? t("{species} — came in after a faint; it can move", {
                            species: s,
                          })
                        : t("{species} — declare a move, Mega, or send back", {
                            species: s,
                          })
                  }
                  className={`h-[34px] w-[46px] rounded border bg-white pl-0.5 hover:border-stone-500 ${
                    state.mega === s
                      ? "border-violet-400"
                      : switchedIn.has(s) || cameIn.has(s)
                        ? "border-dashed border-sky-300"
                        : "border-stone-300"
                  }`}
                >
                  <MonIcon species={shownAs(s)} scale={1} />
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
            if (!s) return <div key={slotIndex} className="h-[22px]" />;
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
              <div key={s}>
                <div className="flex h-[22px] items-center">
                  <button
                    onClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      onOpenPicker(pickerFor === s ? null : s, {
                        left: r.left,
                        top: r.bottom + 4,
                      });
                    }}
                    title={
                      switchedIn.has(s)
                        ? t("{species} switched in this turn — no move", {
                            species: s,
                          })
                        : !move && cameIn.has(s)
                          ? t("{species} came in after a faint — it can move", {
                              species: s,
                            })
                          : move
                            ? t("{species}: {detail}", {
                                species: s,
                                detail:
                                  (state.mega === s ? t("Mega, ") : "") +
                                  move +
                                  (targetSpecies
                                    ? t(" → {target}", {
                                        target: targetSpecies,
                                      })
                                    : ""),
                              })
                            : t("{species} — declare a move or Mega", {
                                species: s,
                              })
                    }
                    className={`flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold leading-none transition-opacity ${
                      move
                        ? "text-white"
                        : switchedIn.has(s) || cameIn.has(s)
                          ? "bg-sky-50 text-sky-700 hover:bg-sky-100"
                          : state.mega === s
                            ? "bg-violet-600 text-white hover:opacity-85"
                            : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                    }`}
                    style={
                      move ? { backgroundColor: moveColor(move) } : undefined
                    }
                  >
                    <MonIcon species={shownAs(s)} scale={0.5} />
                    {state.mega === s && (
                      <span title={t("Mega Evolves")}>⟡</span>
                    )}
                    {switchedIn.has(s)
                      ? t("switched in")
                      : (move ?? (cameIn.has(s) ? t("came in") : t("+ move")))}
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
                      switchedIn={switchedIn.has(s)}
                      showBoosts={!!boostsOf}
                      boosts={boostsOf?.(s)}
                      crit={critOf(s)}
                      onBoost={(stat, stage) => onBoost(s, stat, stage)}
                      onCrit={(on) => onCrit(s, on)}
                      megaForme={megaFormeFor(s)}
                      megaActive={state.mega === s}
                      anchor={pickerAnchor}
                      onMove={(m) => onPickMove(s, m)}
                      onTarget={(ref) => onPickTarget(s, ref)}
                      onSwitchIn={(incoming) => onSwitchIn(s, incoming)}
                      onMega={(on) => onMega(on ? s : null)}
                      onBench={() => onRemove(s)}
                      onClose={() => onOpenPicker(null)}
                    />
                  )}
                </div>
                {/* Under the move it describes — the association the author
                    otherwise keeps in their head. Outside the fixed 22px chip
                    row on purpose: it is a full sentence, and squeezed into a
                    slot column it wrapped six lines deep. Stored text, never
                    re-derived here, and `pruneCalcs` has already dropped
                    anything whose inputs moved. */}
                {!calcs?.[s] && calcHintOf?.(s) && (
                  <p className="mb-0.5 mt-0.5 pl-1.5 text-[10px] leading-snug text-stone-400">
                    {t("needs a set for {species} — re-import that team", {
                      species: calcHintOf(s)!.join(", "),
                    })}
                  </p>
                )}
                {calcs?.[s] && (
                  <p
                    className="mb-0.5 mt-0.5 whitespace-pre-wrap border-l-2 pl-1.5 text-[10px] leading-snug"
                    style={{
                      borderColor: move ? moveColor(move) : "#d6d3d1",
                      // The move's own colour, mixed toward ink so the light
                      // types (Electric, Ground) stay readable at 10px — a raw
                      // #F8D030 on white is not text.
                      color: move
                        ? `color-mix(in srgb, ${moveColor(move)} 65%, #1c1917)`
                        : undefined,
                    }}
                  >
                    {calcs[s].text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-1 flex items-center gap-1.5">
        <span className="w-9 text-[10px] text-stone-400">{t("slot|Back")}</span>
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

// `Edge`, the measurement and the SVG live in `../demo/turn-edges`, so the
// published reader draws the same arrows instead of none.

/** Dex metadata per move: type (for color) and targeting shape. */
interface MoveMeta {
  type: string;
  target: string;
}

/** Dex targeting kinds that require the author to pick a specific target.
 * Spread moves (Rock Slide), self/side/field moves need no choice. */
/** Keyed so an untranslated fallback still reads "Atk", not "atk". */
const STAT_LABEL = {
  atk: "stat|Atk",
  def: "stat|Def",
  spa: "stat|SpA",
  spd: "stat|SpD",
} as const;

const CHOICE_TARGETS = new Set([
  "normal",
  "any",
  "adjacentFoe",
  "adjacentAlly",
  "adjacentAllyOrSelf",
]);

/**
 * Keeps the board when the page goes away in a way the app never sees: a
 * trackpad swipe-back, the browser's own back button, a closed tab. Every
 * other exit routes through a click handler that calls `saveIfDirty`; these do
 * not, so a note typed and not saved was simply gone.
 *
 * `pagehide`, never `beforeunload` — that one puts a native dialog on screen,
 * which this project does not do. It saves silently instead of asking.
 * `visibilitychange` covers a backgrounded tab, where `pagehide` can be
 * skipped entirely.
 *
 * Its own component because the board declares `saveIfDirty` below its early
 * returns, so an effect up where the hooks must live cannot see it. A child
 * renders unconditionally and takes the callback as a prop.
 */
function SaveOnExit({ onLeave }: { onLeave: () => void }) {
  const latest = useRef(onLeave);
  useEffect(() => {
    latest.current = onLeave;
  });
  useEffect(() => {
    const keep = () => latest.current();
    const onHidden = () => {
      if (document.visibilityState === "hidden") keep();
    };
    window.addEventListener("pagehide", keep);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", keep);
      document.removeEventListener("visibilitychange", onHidden);
      // Unmount is the one signal every in-app exit produces. A swipe-back is
      // a *client-side* pop in the App Router, so the document never unloads
      // and `pagehide` never fires — that was the hole. The listeners above
      // still matter for a closed tab or a hard reload, where this does not
      // run.
      keep();
    };
  }, []);
  return null;
}

export default function SimPage() {
  const { lang, t } = useLang();
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
  /** Every board built with the same team of mine — the opponent switcher. */
  const [group, setGroup] = useState<SavedMatchup[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const { copied, copy } = useCopy();
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [expandedNotes, setExpandedNotes] = useState<ReadonlySet<string>>(
    new Set(),
  );
  /**
   * The calculator switch.
   *
   * A **per-browser preference about the editor**, not a property of the
   * document — deliberately. If it lived on the guide, the same published link
   * would read differently for different people, which is the "two versions of
   * the data" that CLAUDE.md forbids. Turning it off hides the lines on your
   * own board while planning; a published page always shows what its author
   * saved.
   */
  const [calcOn, setCalcOn] = useState(false);
  /** The card whose field panel is open, if any. */
  const [fieldFor, setFieldFor] = useState<string | null>(null);
  useEffect(() => {
    // localStorage is browser-only, so the choice arrives after the first
    // render; `queueMicrotask` keeps that out of the effect body, which is the
    // same shape the report composer uses for its own mount read.
    queueMicrotask(() => setCalcOn(loadCalcOn()));
  }, []);
  /**
   * This side's calculations, keyed by attacker, for the chips to draw.
   *
   * **Freshness is decided here, at the point of display.** Clearing a move
   * used to leave its calculation sitting under an empty chip until the next
   * save, which is the one thing this feature must never do — show a number
   * nobody can stand behind. Filtering on render rather than writing state
   * from an effect also keeps this off the render-cascade path; storage is
   * tidied separately by `pruneCalcs` in `save()`.
   */
  /** The forme a Pokémon is calculated as — its Mega, when one is recorded. */
  const megaFormeFor = (species: string, side: "my" | "opp") => {
    if (!setup || !megaFormeOf) return null;
    const team = side === "my" ? setup.my : setup.opp;
    const item = team.parsed.find((m) => m.species === species)?.item;
    return megaFormeOf(species, item) ?? null;
  };

  /**
   * Why there is no calculation, when there would otherwise be one.
   *
   * A team pasted as a document, or typed into the species picker, carries
   * rosters without sets — and a set with no EVs is not something to calculate
   * quietly with zeroes. Naming the Pokémon makes it fixable: re-import that
   * team's Showdown export.
   */
  const calcHint = (node: TurnNode, side: "my" | "opp", species: string) => {
    if (!setup || !moveMetaOf) return null;
    const targetKind = (m: string) => moveMetaOf(m)?.target ?? null;
    const state = node[side];
    const foe = side === "my" ? node.opp : node.my;
    const subject = calcSubject(state, species, targetKind, foe);
    if (!subject) return null;
    const attackerTeam = side === "my" ? setup.my : setup.opp;
    const defenderTeam = subject.defendersAreAllies
      ? attackerTeam
      : side === "my"
        ? setup.opp
        : setup.my;
    const missing = missingSets(
      attackerTeam,
      species,
      defenderTeam,
      subject.defenders,
    );
    return missing.length > 0 ? missing : null;
  };

  const sideCalcs = (node: TurnNode, side: "my" | "opp") => {
    const out: Record<string, CalcNote> = {};
    if (!setup || !moveMetaOf) return out;
    const targetKind = (m: string) => moveMetaOf(m)?.target ?? null;
    const state = node[side];
    const foe = side === "my" ? node.opp : node.my;
    for (const [key, note] of Object.entries(node.calcs ?? {})) {
      if (!key.startsWith(`${side}:`)) continue;
      const species = key.slice(side.length + 1);
      const subject = calcSubject(state, species, targetKind, foe);
      if (!subject) continue;
      const attackerTeam = side === "my" ? setup.my : setup.opp;
      const defenderTeam = subject.defendersAreAllies
        ? attackerTeam
        : side === "my"
          ? setup.opp
          : setup.my;
      const print = inputPrint(
        attackerTeam,
        species,
        defenderTeam,
        subject.defenders,
        subject.move,
        calcContext(node, side, species, megaFormeFor),
      );
      if (isFresh(note, print)) out[species] = note;
    }
    return out;
  };

  /** "Sun · Reflect" — what is set, so a saved board says it at a glance. */
  const fieldSummary = (field: FieldState | undefined) => {
    const bits: string[] = [];
    if (field?.weather) bits.push(t(field.weather));
    if (field?.terrain) bits.push(t(field.terrain));
    for (const side of ["my", "opp"] as const) {
      const f = field?.[side];
      if (!f) continue;
      if (f.reflect) bits.push(t("Reflect"));
      if (f.lightScreen) bits.push(t("Light Screen"));
      if (f.auroraVeil) bits.push(t("Aurora Veil"));
      if (f.helpingHand) bits.push(t("Helping Hand"));
      if (f.friendGuard) bits.push(t("Friend Guard"));
    }
    return bits.join(" · ");
  };

  /** A stat stage on one Pokémon, this turn. Zero clears it. */
  const setBoost = (
    nodeId: string,
    sideKey: "my" | "opp",
    species: string,
    stat: keyof Boosts,
    stage: number,
  ) =>
    update(nodeId, (n) => {
      const side = n[sideKey];
      const mine = { ...(side.boosts?.[species] ?? {}) };
      if (stage === 0) delete mine[stat];
      else mine[stat] = Math.max(-6, Math.min(6, stage));
      const boosts = { ...side.boosts };
      if (Object.keys(mine).length === 0) delete boosts[species];
      else boosts[species] = mine;
      const next = { ...side };
      if (Object.keys(boosts).length === 0) delete next.boosts;
      else next.boosts = boosts;
      return { ...n, [sideKey]: next };
    });

  const setCrit = (
    nodeId: string,
    sideKey: "my" | "opp",
    species: string,
    on: boolean,
  ) =>
    update(nodeId, (n) => {
      const side = n[sideKey];
      const crit = (side.crit ?? []).filter((s) => s !== species);
      if (on) crit.push(species);
      const next = { ...side };
      if (crit.length === 0) delete next.crit;
      else next.crit = crit;
      return { ...n, [sideKey]: next };
    });

  const setField = (nodeId: string, field: FieldState) =>
    update(nodeId, (n) => {
      // An empty field is no field: the key is dropped so a card with nothing
      // set encodes exactly as it did before this existed.
      if (!hasField(field)) {
        const next = { ...n };
        delete next.field;
        return next;
      }
      return { ...n, field };
    });

  const toggleCalc = (on: boolean) => {
    setCalcOn(on);
    saveCalcOn(on);
  };

  const [movePicker, setMovePicker] = useState<{
    nodeId: string;
    side: "my" | "opp";
    species: string;
    anchor: { left: number; top: number };
  } | null>(null);
  const [moveMetaOf, setMoveMetaOf] = useState<
    ((move: string) => MoveMeta | null) | null
  >(null);
  const [megaFormeOf, setMegaFormeOf] = useState<
    ((species: string, item?: string) => string | null) | null
  >(null);

  /**
   * Keep the calculations current while the switch is on.
   *
   * It only ever computes what is missing or stale, and bails without touching
   * state when there is nothing to do — otherwise this would re-render itself
   * forever. Turning the switch off computes nothing; the stored results stay
   * put and simply stop being drawn.
   */
  useEffect(() => {
    // `moveMetaOf` is the lazily-loaded dex. Without it a spread move is
    // indistinguishable from an untargeted one, so wait rather than guess.
    if (!calcOn || !setup || !moveMetaOf) return;
    const targetKind = (m: string) => moveMetaOf(m)?.target ?? null;
    // Inlined rather than closing over the component's helper, which is
    // rebuilt every render and would make this dep list a lie.
    const formeOf = (species: string, s: "my" | "opp") => {
      const team = s === "my" ? setup.my : setup.opp;
      const item = team.parsed.find((m) => m.species === species)?.item;
      return megaFormeOf?.(species, item) ?? null;
    };

    let alive = true;
    void (async () => {
      const additions: { id: string; key: string; note: CalcNote }[] = [];
      for (const node of nodes) {
        for (const side of ["my", "opp"] as const) {
          const state = node[side];
          for (const species of state.front) {
            if (!species) continue;
            const foe = side === "my" ? node.opp : node.my;
            const subject = calcSubject(state, species, targetKind, foe);
            if (!subject) continue;
            const attackerTeam = side === "my" ? setup.my : setup.opp;
            const defenderTeam = subject.defendersAreAllies
              ? attackerTeam
              : side === "my"
                ? setup.opp
                : setup.my;
            const print = inputPrint(
              attackerTeam,
              species,
              defenderTeam,
              subject.defenders,
              subject.move,
              calcContext(node, side, species, formeOf),
            );
            const key = calcKey(side, species);
            if (isFresh(node.calcs?.[key], print)) continue;
            const note = await runCalc(
              attackerTeam,
              species,
              defenderTeam,
              subject.defenders,
              subject.move,
              calcContext(node, side, species, formeOf),
            );
            if (note) additions.push({ id: node.id, key, note });
          }
        }
      }
      if (!alive || additions.length === 0) return;
      setNodes((prev) =>
        prev.map((n) => {
          const mine = additions.filter((a) => a.id === n.id);
          if (mine.length === 0) return n;
          const calcs = { ...n.calcs };
          for (const a of mine) calcs[a.key] = a.note;
          return { ...n, calcs };
        }),
      );
    })();
    return () => {
      alive = false;
    };
  }, [calcOn, nodes, setup, moveMetaOf, megaFormeOf]);
  /** species+item → its Mega forme name, once the dex is loaded. */
  // The layout key carries the calculator too: a calculation adds a line under
  // a chip, which makes its card taller and every arrow touching it stale.
  const calcLayoutKey = calcOn
    ? nodes
        .map(
          (n) =>
            `${Object.values(n.calcs ?? {}).length}:${hasField(n.field) ? 1 : 0}`,
        )
        .join(",") + `|${fieldFor ?? ""}`
    : "off";
  const { wrapRef, setCardRef, edges } = useTurnEdges(nodes, [
    expandedNotes,
    calcLayoutKey,
  ]);

  // The dex supplies metadata only — a move's type (for Showdown colors) and
  // targeting shape (so spread/self moves skip the target prompt), and whether
  // an item is the Mega Stone for the Pokémon holding it (so the option can be
  // offered at all). Loaded lazily so the board renders immediately; nothing is
  // computed with it and no forme's stats are ever consulted.
  useEffect(() => {
    let alive = true;
    import("@pkmn/dex").then(({ Dex }) => {
      if (!alive) return;
      setMoveMetaOf(() => (name: string) => {
        const move = Dex.moves.get(name);
        return move.exists ? { type: move.type, target: move.target } : null;
      });
      setMegaFormeOf(() => (species: string, item?: string) => {
        if (!item) return null;
        const stone = Dex.items.get(item).megaStone as
          Record<string, string> | string | undefined;
        if (!stone) return null;
        // The field is a { baseSpecies: megaForme } map in this dex version.
        if (typeof stone === "string") return stone;
        const base = Dex.species.get(species).baseSpecies || species;
        return stone[species] ?? stone[base] ?? null;
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
      // Resume the library entry that was opened (or, failing that, this exact
      // team pair); otherwise start fresh. An entry with no nodes is a pairing
      // lined up on the setup page but never planned — seed a fresh board.
      const library = loadMatchups();
      const activeId = loadActiveMatchupId();
      const entry =
        (activeId
          ? library.find(
              (m) =>
                m.id === activeId &&
                m.setup.my.id === s.my.id &&
                m.setup.opp.id === s.opp.id,
            )
          : undefined) ?? findPairMatchup(library, s.my.id, s.opp.id);
      setSetup(s);
      setGroup(library.filter((m) => m.setup.my.id === s.my.id));
      if (entry) {
        const planned = entry.nodes.length > 0;
        setNodes(planned ? entry.nodes : freshNodes(s));
        setSavedAt(planned ? entry.savedAt : null);
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

  if (!ready) return null;
  if (!setup) {
    return (
      <div className="min-h-screen w-full bg-[#fafaf8] p-12 font-sans text-sm text-stone-500">
        <T
          k="No teams set. {0}"
          parts={[
            <Link
              key="pick"
              href="/matchups"
              className="underline underline-offset-2"
            >
              {t("Pick teams first →")}
            </Link>,
          ]}
        />
      </div>
    );
  }

  // Formatted here rather than inline so the save line's two variants share one
  // value — and so the clock follows the interface language.
  const savedTime = savedAt
    ? new Date(savedAt).toLocaleTimeString(htmlLang(lang))
    : "";

  // Where this board sits among the opponents planned with the same team.
  const groupIdx = group.findIndex((m) =>
    matchup ? m.id === matchup.id : m.setup.opp.id === setup.opp.id,
  );
  const plannedCount = group.filter((m) => m.nodes.length > 0).length;

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
  const broughtOf = (
    node: TurnNode,
    side: "my" | "opp",
  ): Set<string> | null => {
    if (node.turn <= 1) return null;
    const rootSide = rootOf(node)[side];
    const four = [...rootSide.front, ...rootSide.back];
    return four.length === 4 ? new Set(four) : null;
  };

  // Functional update: move + target changes can land in the same tick.
  const update = (id: string, fn: (n: TurnNode) => TurnNode) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? fn(n) : n)));

  /**
   * A positional edit (place, faint, switch) also updates the turns after it:
   * the next turn's default is where this turn ended. Descendants the author
   * changed themselves keep their own arrangement — see cascadePositions.
   */
  const updateSide = (
    nodeId: string,
    sideKey: "my" | "opp",
    fn: (side: SideState) => SideState,
  ) =>
    setNodes((prev) => {
      const node = prev.find((n) => n.id === nodeId);
      if (!node) return prev;
      const before = node[sideKey];
      const after = fn(before);
      if (after === before) return prev;
      const next = prev.map((n) =>
        n.id === nodeId ? { ...n, [sideKey]: after } : n,
      );
      return cascadePositions(next, nodeId, sideKey, before, after);
    });

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

  /**
   * Switch: a back Pokémon takes the front slot and the outgoing one goes to
   * the back. Both lose any declared move — the outgoing one isn't acting, and
   * the incoming one spent its turn switching in (it also can't Mega).
   */
  const swapFrontBack = (
    nodeId: string,
    sideKey: "my" | "opp",
    outgoing: string,
    incoming: string,
  ) =>
    updateSide(nodeId, sideKey, (side) => {
      const fi = side.front.indexOf(outgoing);
      const bi = side.back.indexOf(incoming);
      if (fi < 0 || bi < 0) return side;
      const front = [...side.front];
      const back = [...side.back];
      front[fi] = incoming;
      back[bi] = outgoing;
      // A Mega already recorded on this side stays — a Mega-Evolved Pokémon is
      // still Mega on the bench. Only the action (a move) clears.
      return stripMove(stripMove({ ...side, front, back }, outgoing), incoming);
    });

  /**
   * Records that a front Pokémon Mega Evolves this turn (it can still move).
   * One per side per card; picking another replaces it.
   *
   * It carries down the tree, like a positional edit: a Pokémon that Mega
   * Evolves stays Mega, so the turns after this one must draw the Mega forme.
   * `addNextTurn` copies it into a child at creation, which only covers
   * recording the Mega *before* the next turn exists — and the usual order of
   * work is the other way around.
   */
  const setSideMega = (
    nodeId: string,
    sideKey: "my" | "opp",
    species: string | null,
  ) =>
    setNodes((prev) => {
      const node = prev.find((n) => n.id === nodeId);
      if (!node) return prev;
      const before = node[sideKey].mega;
      const after = species ?? undefined;
      if (before === after) return prev;
      const next = prev.map((n) => {
        if (n.id !== nodeId) return n;
        const side = { ...n[sideKey] };
        if (after) side.mega = after;
        else delete side.mega;
        return { ...n, [sideKey]: side };
      });
      return cascadeMega(next, nodeId, sideKey, before, after);
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

  /**
   * Extend the line: a child at turn+1 starting from where this turn ended —
   * same positions, faints and Megas, but no moves. A declared move is that
   * turn's action; the next turn gets its own.
   */
  const addNextTurn = (parent: TurnNode) => {
    const carry = (side: SideState): SideState => ({
      front: [...side.front],
      back: [...side.back],
      fainted: [...side.fainted],
      ...(side.mega ? { mega: side.mega } : {}),
    });
    setNodes([
      ...nodes,
      {
        id: crypto.randomUUID(),
        turn: parent.turn + 1,
        parentId: parent.id,
        my: carry(parent.my),
        opp: carry(parent.opp),
      },
    ]);
  };

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
    // A stored calculation is always true for the sets it ships with, so
    // anything whose inputs have moved is dropped here — before localStorage,
    // before the account mirror, and therefore before anything can publish it.
    // Not lost work: switching the calculator on recomputes it.
    const pruned = pruneCalcs(
      toSave,
      setup.my,
      setup.opp,
      moveMetaOf ? (m) => moveMetaOf(m)?.target ?? null : null,
      megaFormeFor,
    );
    const entry: SavedMatchup = {
      id: matchup?.id ?? crypto.randomUUID(),
      name: matchup?.name ?? `${setup.my.name} vs ${setup.opp.name}`,
      setup,
      nodes: pruned,
      savedAt: new Date().toISOString(),
    };
    upsertMatchup(entry);
    setActiveMatchupId(entry.id);
    setMatchup({ id: entry.id, name: entry.name });
    setSavedAt(entry.savedAt);
    setGroup(loadMatchups().filter((m) => m.setup.my.id === setup.my.id));
    // Signed in → mirror the save to the account; local save already landed.
    void upsertCloudMatchup(entry).then(setCloudState);
    return entry;
  };

  /**
   * Has the author actually written anything that isn't stored yet? The codec
   * is id-free, so encoding is a stable way to compare boards — and a board
   * still identical to a fresh one counts as unwritten, so merely visiting an
   * opponent never turns "no plan yet" into a saved plan.
   */
  const hasUnsavedWork = () => {
    const current = encodeWorkflow(setup, nodes);
    if (current === encodeWorkflow(setup, freshNodes(setup))) return false;
    const stored = group.find((m) => m.id === matchup?.id);
    if (!stored || stored.nodes.length === 0) return true;
    return current !== encodeWorkflow(stored.setup, stored.nodes);
  };

  /** Leaving the board (back, home, any nav link) keeps what's written. */
  const saveIfDirty = () => {
    if (hasUnsavedWork()) save();
  };

  /** Move to another opponent of the same team, saving the current board first
   * if it holds work. Same route, so the state is swapped in place. */
  const switchTo = (entry: SavedMatchup) => {
    if (entry.id === matchup?.id) return;
    if (hasUnsavedWork()) save();
    const planned = entry.nodes.length > 0;
    saveSetup(entry.setup);
    setActiveMatchupId(entry.id);
    setSetup(entry.setup);
    setNodes(planned ? entry.nodes : freshNodes(entry.setup));
    setSavedAt(planned ? entry.savedAt : null);
    setMatchup({ id: entry.id, name: entry.name });
    setCloudState("off");
    setExpandedNotes(new Set());
    setMovePicker(null);
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

  // Stamped with the group this board belongs to, so a re-paste updates that
  // group rather than forking one. `hasUnsavedWork` calls the codec without a
  // stamp — see `encodeGroup`.
  const copyJson = () =>
    copy(
      encodeGroup(setup.my, [{ opp: setup.opp, nodes }], {
        docId: groupDocId(setup.my),
      }),
    );

  /**
   * A pasted document holds one team and 1..N opponents. Every board is saved
   * into the library (see `applyGroupImport`) and the first one is opened here,
   * so a shared group arrives whole and a document that collides with work
   * already here lands beside it instead of on top of it.
   *
   * The first board used to be left unsaved, which meant Save minted a fresh id
   * and the same pair ended up with two library entries. It is a real entry
   * from the moment it lands now, exactly like the ones behind it.
   */
  const importWorkflow = () => {
    const result = decodeWorkflowGroup(importText.trim(), lang);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    const applied = applyGroupImport(result);
    const [first, ...rest] = applied.entries;
    const setupIn = first.setup;
    const planned = first.nodes.length > 0;
    setSetup(setupIn);
    // nodes: [] means "not planned yet" — the board still needs its preview card.
    setNodes(planned ? first.nodes : freshNodes(setupIn));
    saveSetup(setupIn);
    setGroup(loadMatchups().filter((m) => m.setup.my.id === applied.my.id));
    setActiveMatchupId(first.id);
    setMatchup({ id: first.id, name: first.name });
    setSavedAt(planned ? first.savedAt : null);
    // Signed in → mirror what actually changed, as `/matchups` import and
    // adding an opponent on the builder both already do.
    for (const entry of applied.written) void upsertCloudMatchup(entry);
    setShowImport(false);
    setImportText("");
    setImportError(null);
    setImportWarnings([
      importSummary(applied, lang),
      // Whole sentences per branch, so the verb agrees and the awkward
      // "The other 1 opposing team" disappears in English too.
      ...(rest.length > 0
        ? [
            rest.length === 1
              ? t("The other opposing team is in this team's matchups.")
              : t("The other {n} opposing teams are in this team's matchups.", {
                  n: rest.length,
                }),
          ]
        : []),
      ...result.warnings,
    ]);
  };

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Three bands, so the site nav, the board's own actions, and the
            matchup switcher never read as one jumbled strip. */}
        <SaveOnExit onLeave={saveIfDirty} />
        <header className="border-b border-stone-200 pb-4">
          {/* Leaving the board saves it first, exactly like switching
              opponents — the board is the one page where navigating away could
              throw away written work. The wordmark is a link too, so it gets
              the same guard; the account menu doesn't navigate, so it doesn't. */}
          <div className="flex items-center justify-between gap-4">
            <span onClickCapture={saveIfDirty}>
              <Wordmark heading={false} />
            </span>
            <HeaderNav onBeforeLeave={saveIfDirty}>
              <NavLink href="/matchups">{t("matchups")}</NavLink>
            </HeaderNav>
          </div>

          <div className="mt-4 flex items-end justify-between gap-6">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">
                {/* This "vs." is presentational — the one inside a stored
                    matchup name is data and stays as it was written. */}
                <T
                  k="{0} vs. {1}"
                  parts={[
                    setup.my.name,
                    <span key="opp">{setup.opp.name}</span>,
                  ]}
                />
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {group.length > 1 && (
                  <>
                    <button
                      onClick={() => switchTo(group[groupIdx - 1])}
                      disabled={groupIdx <= 0}
                      title={t("previous opponent")}
                      className="rounded border border-stone-300 bg-white px-2 py-1 text-xs leading-none text-stone-500 hover:border-stone-500 disabled:opacity-30"
                    >
                      ‹
                    </button>
                    <select
                      value={groupIdx >= 0 ? group[groupIdx].id : ""}
                      onChange={(e) => {
                        const next = group.find((m) => m.id === e.target.value);
                        if (next) switchTo(next);
                      }}
                      className="max-w-[22rem] rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 focus:border-stone-500 focus:outline-none"
                    >
                      {groupIdx < 0 && (
                        <option value="">{t("this board (unsaved)")}</option>
                      )}
                      {group.map((m, i) => (
                        <option key={m.id} value={m.id}>
                          {m.nodes.length > 0
                            ? t("{n}. vs {team}", {
                                n: i + 1,
                                team: m.setup.opp.name,
                              })
                            : t("{n}. vs {team} · no plan yet", {
                                n: i + 1,
                                team: m.setup.opp.name,
                              })}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => switchTo(group[groupIdx + 1])}
                      disabled={groupIdx < 0 || groupIdx >= group.length - 1}
                      title={t("next opponent")}
                      className="rounded border border-stone-300 bg-white px-2 py-1 text-xs leading-none text-stone-500 hover:border-stone-500 disabled:opacity-30"
                    >
                      ›
                    </button>
                    <span className="text-[10px] text-stone-400">
                      {groupIdx >= 0
                        ? t("{i} of {total}", {
                            i: groupIdx + 1,
                            total: group.length,
                          })
                        : ""}
                      {plannedCount > 0 &&
                        t(" · {n} planned", { n: plannedCount })}
                    </span>
                  </>
                )}
                {/* The three stay together as **one** flex item, so the row
                    wraps them as a group instead of splitting them across
                    lines. They were three separate items in a wrapping row:
                    in Japanese the calculator sat on its own line even at
                    1512px, and in English below ~1100px. */}
                <span className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/matchups?team=${encodeURIComponent(setup.my.id)}`}
                    title={t(
                      "add another opposing team to plan against {team}",
                      { team: setup.my.name },
                    )}
                    className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-500 hover:border-stone-500"
                  >
                    {t("+ add opponent")}
                  </Link>
                  {/* Publishing acts on the whole **set** — this team against
                      every opponent — not on the one board you are looking at,
                      which is why it lives on the set's header. But you are
                      looking at the thing you want to publish, so the board has
                      to offer it; the label says "set" so the scope is not a
                      surprise. Saves first, or the snapshot would miss whatever
                      is on screen — and the handler goes on the link itself,
                      not on a wrapper. A bare `<span>` around it was an inline
                      flex item, whose padding does not count toward its height,
                      so it measured 4px shorter than its neighbours and
                      `items-center` pushed it 2px down: three buttons that
                      never quite shared a line. */}
                  <Link
                    href={`/matchups/${encodeURIComponent(setup.my.id)}/report`}
                    onClickCapture={saveIfDirty}
                    title={t(
                      "publish {team} and everything you've planned against",
                      { team: setup.my.name },
                    )}
                    className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-500 hover:border-stone-500"
                  >
                    {t("publish set →")}
                  </Link>
                  {/* A button, not the hairline link it started as — nobody saw
                      that one. Still out of the right-hand row: those act on
                      this board (Reset, Import, Copy JSON, Save) and this
                      leaves the site, which the ↗ and the lighter fill both
                      say. xatu computes no damage; this is a link wearing a
                      button. */}
                  <a
                    href="https://calc.pokemonshowdown.com/champions.html?mode=champions"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-500 transition-colors hover:border-stone-500 hover:text-stone-800"
                  >
                    {t("full calculator ↗")}
                  </a>
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* Back lives with the board's actions, not up in the site nav —
                  it's the way out of *this board*, so it belongs where the
                  eye already is. Wrapped alone so Reset can't trigger a save. */}
              <span onClickCapture={saveIfDirty}>
                <BackLink
                  fallback="/matchups"
                  className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-600 hover:border-stone-500"
                />
              </span>
              <button
                onClick={resetBoard}
                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-600 hover:border-stone-500"
              >
                {t("Reset")}
              </button>
              <button
                onClick={() => {
                  setShowImport(!showImport);
                  setImportError(null);
                }}
                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-600 hover:border-stone-500"
              >
                {t("Import")}
              </button>
              <button
                onClick={copyJson}
                title={t(
                  "copy this board as JSON — paste it here or on My matchups",
                )}
                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-600 hover:border-stone-500"
              >
                {copied ? t("Copied ✓") : t("Copy JSON")}
              </button>
              {/* Beside Save because that is where the eye already goes, and
                  coloured by *state* rather than a second red: Save owns the
                  primary action, and this one is a switch. */}
              <button
                onClick={() => toggleCalc(!calcOn)}
                title={t(
                  "Damage calculator — xatu computes only while this is on, and only for a move with a declared target.",
                )}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  calcOn
                    ? "border-emerald-700 bg-emerald-700 text-white hover:opacity-85"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400"
                }`}
              >
                {calcOn ? t("calculator on") : t("calculator off")}
              </button>
              <button
                onClick={() => save()}
                className="rounded-md bg-[#e5484d] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:opacity-85 active:scale-[0.98]"
              >
                {t("Save")}
              </button>
            </div>
          </div>

          {/* The rules of the board are reference material, not a banner —
              collapsed by default, remembered for the session. */}
          <div className="mt-3">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-[11px] text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
            >
              {showHelp ? "▾" : "▸"} {t("how the board works")}
            </button>
            {showHelp && (
              <ul className="grow-in mt-2 grid gap-x-8 gap-y-1 text-[11px] leading-relaxed text-stone-500 sm:grid-cols-2">
                <li>
                  · {t("turn 0 is team preview — pick the four you bring")}
                </li>
                <li>
                  · {t("from turn 1, click a front slot to declare its move")}
                </li>
                <li>
                  · {t("moves are optional; spread moves aim themselves")}
                </li>
                <li>· {t("a Pokémon that switches in can’t also move")}</li>
                <li>
                  · {t("a Mega Stone holder can Mega and move the same turn")}
                </li>
                <li>
                  · {t("positions carry into the next turn automatically")}
                </li>
                <li>· {t("right-click a Pokémon to faint it")}</li>
                <li>
                  · {t("⑂ records an alternate version of that same turn")}
                </li>
                <li>· {t("turn 2 is the last")}</li>
              </ul>
            )}
          </div>
        </header>
        {/* Fixed-height status line: always occupies its row, so the first save
            doesn't push the board down (and the row isn't a blank gap before
            one). Never empty — unsaved is itself worth saying. */}
        <div className="flex h-5 items-center justify-end text-[10px]">
          {cloudState !== "ok" && cloudState !== "off" ? (
            <p
              className="truncate text-amber-700"
              title={t("account sync failed: {error}", { error: cloudState })}
            >
              {/* The raw message stays in `title` for debugging, but it is
                  Postgres text — the one users actually hit read "new row
                  violates row-level security policy", which tells them
                  nothing. The board is safe either way, and that is the part
                  worth saying. */}
              {t("saved to this browser — couldn’t reach your account")}
            </p>
          ) : savedAt && matchup ? (
            <p className="truncate text-stone-400">
              {cloudState === "ok"
                ? t("saved as “{name}” · {time} · synced to your account", {
                    name: matchup.name,
                    time: savedTime,
                  })
                : t("saved as “{name}” · {time}", {
                    name: matchup.name,
                    time: savedTime,
                  })}
            </p>
          ) : (
            <p className="text-stone-300">
              {t("not saved yet — Save keeps this board")}
            </p>
          )}
        </div>

        {importWarnings.length > 0 && (
          <div className="grow-in mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">
                {t("Import notes")}
              </p>
              <button
                onClick={() => setImportWarnings([])}
                className="text-[11px] text-amber-600 hover:text-amber-800"
              >
                {t("dismiss")}
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
          <div className="grow-in mt-4 rounded-lg border border-stone-200 bg-[#f6f5ef] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              {t("Import a matchup workflow")}
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder={t("Paste a workflow copied with Copy JSON…")}
              className="mt-2 w-full resize-y rounded border border-stone-300 bg-white p-2.5 font-mono text-[11px] text-stone-700 placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={importWorkflow}
                disabled={!importText.trim()}
                className="rounded bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:opacity-80 disabled:opacity-30"
              >
                {t("Load")}
              </button>
              {importError && (
                <p className="text-xs text-red-600">{importError}</p>
              )}
            </div>
          </div>
        )}

        {/* `overscroll-x-contain`: a horizontal trackpad swipe here used to
            chain to the browser's back gesture the moment the strip hit an
            edge — so the board wouldn't scroll *and* you left the page, which
            is how written work went missing. Containing it keeps the gesture
            in the strip. */}
        <div className="mt-4 overscroll-x-contain overflow-x-auto pb-4">
          <div ref={wrapRef} className="relative w-max">
            <EdgeLayer edges={edges} />
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
                  {i === 0
                    ? t("Turn 0 · team preview")
                    : t("Turn {n}", { n: i })}
                </p>
              ))}

              {nodes.map((node) => {
                const row = (rows.get(node.id) ?? 0) + 2;
                const parent = node.parentId ? byId.get(node.parentId) : null;
                const alternate = isAlternate(node, nodes);
                const removable = node.parentId !== null || rootCount > 1;
                return (
                  <div
                    key={node.id}
                    ref={(el) => {
                      setCardRef(node.id)(el);
                    }}
                    // Cards arrive left-to-right so the tree reads as a
                    // sequence; the delay is capped so nothing feels slow.
                    // `self-start` keeps a card the height of its content
                    // instead of stretching to the tallest card in its row.
                    className={`fade-in step-${Math.min(node.turn, 4)} relative self-start rounded-lg border border-stone-200 bg-white p-3`}
                    style={{ gridColumn: node.turn, gridRow: row }}
                  >
                    {alternate && (
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                        {parent
                          ? t("⑂ alternate turn {n} · after turn {p}", {
                              n: node.turn - 1,
                              p: parent.turn - 1,
                            })
                          : t("⑂ alternate turn {n}", { n: node.turn - 1 })}
                      </p>
                    )}
                    {/* The two sides read as a matchup, so they're separated by
                        a hairline and a "vs" — same device as the landing hero. */}
                    <div className="relative grid grid-cols-2 gap-6">
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-stone-100"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1 py-0.5 text-[9px] uppercase tracking-widest text-stone-300"
                      >
                        vs
                      </span>
                      <SideBoard
                        calcs={calcOn ? sideCalcs(node, "my") : null}
                        calcHintOf={
                          calcOn ? (sp) => calcHint(node, "my", sp) : null
                        }
                        boostsOf={calcOn ? (sp) => node.my.boosts?.[sp] : null}
                        critOf={(sp) => !!node.my.crit?.includes(sp)}
                        onBoost={(sp, stat, stage) =>
                          setBoost(node.id, "my", sp, stat, stage)
                        }
                        onCrit={(sp, on) => setCrit(node.id, "my", sp, on)}
                        title={t("My Team")}
                        roster={setup.my.parsed.map((m) => m.species)}
                        movesFor={(s) =>
                          setup.my.parsed.find((m) => m.species === s)?.moves ??
                          []
                        }
                        megaFormeFor={(s) =>
                          megaFormeOf?.(
                            s,
                            setup.my.parsed.find((m) => m.species === s)?.item,
                          ) ?? null
                        }
                        state={node.my}
                        parentState={parent ? parent.my : null}
                        foeFront={node.opp.front}
                        brought={broughtOf(node, "my")}
                        allowMoves={node.turn > 1}
                        moveMetaOf={moveMetaOf}
                        pickerFor={
                          movePicker?.nodeId === node.id &&
                          movePicker.side === "my"
                            ? movePicker.species
                            : null
                        }
                        pickerAnchor={movePicker?.anchor ?? null}
                        onOpenPicker={(s, anchor) =>
                          setMovePicker(
                            s && anchor
                              ? {
                                  nodeId: node.id,
                                  side: "my",
                                  species: s,
                                  anchor,
                                }
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
                        onMega={(s) => setSideMega(node.id, "my", s)}
                        onToggle={(s) =>
                          updateSide(node.id, "my", (side) =>
                            togglePlace(side, s),
                          )
                        }
                        onFaint={(s) =>
                          updateSide(node.id, "my", (side) =>
                            toggleFaint(side, s),
                          )
                        }
                        onRemove={(s) =>
                          updateSide(node.id, "my", (side) =>
                            togglePlace(side, s),
                          )
                        }
                      />
                      <SideBoard
                        calcs={calcOn ? sideCalcs(node, "opp") : null}
                        calcHintOf={
                          calcOn ? (sp) => calcHint(node, "opp", sp) : null
                        }
                        boostsOf={calcOn ? (sp) => node.opp.boosts?.[sp] : null}
                        critOf={(sp) => !!node.opp.crit?.includes(sp)}
                        onBoost={(sp, stat, stage) =>
                          setBoost(node.id, "opp", sp, stat, stage)
                        }
                        onCrit={(sp, on) => setCrit(node.id, "opp", sp, on)}
                        title={t("Opposing Team")}
                        roster={setup.opp.parsed.map((m) => m.species)}
                        movesFor={(s) =>
                          setup.opp.parsed.find((m) => m.species === s)
                            ?.moves ?? []
                        }
                        megaFormeFor={(s) =>
                          megaFormeOf?.(
                            s,
                            setup.opp.parsed.find((m) => m.species === s)?.item,
                          ) ?? null
                        }
                        state={node.opp}
                        parentState={parent ? parent.opp : null}
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
                        onMega={(s) => setSideMega(node.id, "opp", s)}
                        onToggle={(s) =>
                          updateSide(node.id, "opp", (side) =>
                            togglePlace(side, s),
                          )
                        }
                        onFaint={(s) =>
                          updateSide(node.id, "opp", (side) =>
                            toggleFaint(side, s),
                          )
                        }
                        onRemove={(s) =>
                          updateSide(node.id, "opp", (side) =>
                            togglePlace(side, s),
                          )
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
                            {t("▾ note")}
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
                            placeholder={t(
                              "Why this line, what to watch for — optional",
                            )}
                            className="mt-1 w-full resize-y rounded border border-stone-200 bg-stone-50 p-2 text-[11px] leading-relaxed text-stone-700 field-sizing-content placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
                          />
                          <div className="mt-1 flex justify-end">
                            <button
                              onClick={() => commitNote(node.id)}
                              className="rounded bg-stone-900 px-2.5 py-1 text-[10px] font-medium text-white hover:opacity-80"
                            >
                              {t("save note")}
                            </button>
                          </div>
                        </div>
                      ) : node.note?.trim() ? (
                        // A saved note shows **in full**, newlines and all. It
                        // was `truncate`d to one line, which threw away the
                        // thing notes are mostly used for — a sentence of plan
                        // and a damage calc under it — the instant you saved.
                        // Card heights feed the SVG edge measurement, but
                        // `toggleNote` changes the layout key, so collapsing
                        // re-measures.
                        <button
                          onClick={() => toggleNote(node.id)}
                          className="flex w-full items-start gap-1 text-left"
                        >
                          <span className="pt-px text-[10px] text-stone-400">
                            ▸
                          </span>
                          <span className="min-w-0 flex-1 whitespace-pre-wrap text-[11px] leading-relaxed text-stone-500 hover:text-stone-700">
                            {node.note}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleNote(node.id)}
                          className="text-[10px] text-stone-300 hover:text-stone-500"
                        >
                          {t("+ note")}
                        </button>
                      )}
                    </div>

                    {/* Field conditions, only while the calculator is on —
                        without it there is nothing they would change, and the
                        card stays as uncluttered as it was. The marker shows
                        what is set so a glance at a saved board tells you the
                        numbers were taken under sand. */}
                    {calcOn && (
                      <div className="mt-1">
                        <button
                          onClick={() =>
                            setFieldFor(fieldFor === node.id ? null : node.id)
                          }
                          className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                            hasField(node.field)
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "text-stone-300 hover:text-stone-600"
                          }`}
                        >
                          {hasField(node.field)
                            ? fieldSummary(node.field)
                            : t("+ field")}
                        </button>
                        {fieldFor === node.id && (
                          <FieldPanel
                            field={node.field}
                            onChange={(next) => setField(node.id, next)}
                            onClose={() => setFieldFor(null)}
                          />
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2 border-t border-stone-100 pt-2">
                      {(childCount.get(node.id) ?? 0) === 0 &&
                        node.turn < 3 && (
                          <button
                            onClick={() => addNextTurn(node)}
                            className="rounded border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 hover:border-stone-400"
                          >
                            {t("+ turn {n}", { n: node.turn })}
                          </button>
                        )}
                      <button
                        onClick={() => addAlternate(node)}
                        className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 hover:border-amber-400"
                      >
                        {t("⑂ branch")}
                      </button>
                      {removable && (
                        <button
                          onClick={() => removeSubtree(node.id)}
                          className="ml-auto rounded px-1.5 py-0.5 text-[11px] text-stone-300 hover:text-red-600"
                        >
                          {t("remove")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <LegalFooter className="mt-10" />
      </main>
    </div>
  );
}
