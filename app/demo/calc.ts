import { Sets } from "@pkmn/sets";
import type { SideState, StoredTeam, TurnNode } from "./storage";
import { parseTargetRef } from "./workflow-io";

/**
 * The opt-in damage calculator.
 *
 * Read CLAUDE.md → "Hard constraints" before changing any of this. The rule it
 * lives under is narrow and was amended deliberately: xatu computes a damage
 * roll **only** when the author has switched the calculator on, the result is
 * an opaque string attached to the move it describes, and nothing ever reads
 * that string back as data. No simulation, no speed tiers, no solver, no
 * recommended plays — those are still out.
 *
 * Two properties make this safe to store:
 *
 * 1. **A stored calculation is always true for the sets as they are now.**
 *    Every result carries a fingerprint of its inputs. When a set, move or
 *    target changes, the fingerprint stops matching and the result is dropped
 *    rather than shown. xatu would rather show nothing than a number it cannot
 *    stand behind — and a note could not do this, because a note has no idea
 *    which move it describes.
 * 2. **It is never re-derived on read.** A published page shows the sentence
 *    the author accepted, so a later change to the maths cannot move numbers
 *    under its readers. Same reason a published document is a snapshot.
 *
 * `@smogon/calc` is ~4MB unpacked and is therefore **lazy-loaded** — nothing
 * here imports it at module scope, so a reader who never turns the calculator
 * on never pays for it. It has first-class Champions support
 * (`Generations.get(0)`), which is why the numbers match: Champions runs a
 * different stat system (EVs 0–32, 66 total, no IV or level term) that a
 * gen-9 calculator would get silently wrong.
 */

/**
 * Field conditions for one card — weather, terrain and the screens that are up
 * on each side.
 *
 * Stored on the **node**, not on a calculation, because that is what it is: if
 * it is raining on turn 2 it is raining for every attack on that turn, and it
 * is worth recording whether or not anything is ever calculated. Author-stated
 * state, exactly like the Mega marker — xatu does not infer it from the moves.
 */
export interface FieldState {
  weather?: "Sun" | "Rain" | "Sand" | "Snow";
  terrain?: "Electric" | "Grassy" | "Misty" | "Psychic";
  /** Screens and the ally buffs, per side. */
  my?: SideField;
  opp?: SideField;
}
export interface SideField {
  reflect?: boolean;
  lightScreen?: boolean;
  auroraVeil?: boolean;
  helpingHand?: boolean;
  friendGuard?: boolean;
}

/** Stable text for the fingerprint — field conditions change the number. */
export function fieldPrint(field: FieldState | undefined): string {
  // An absent field and an empty one describe the same board, so they must
  // fingerprint identically — otherwise clearing the last condition would
  // invalidate every calculation on the card for no reason.
  const f0 = field ?? {};
  const side = (f: SideField | undefined) =>
    f
      ? (
          [
            "reflect",
            "lightScreen",
            "auroraVeil",
            "helpingHand",
            "friendGuard",
          ] as const
        )
          .filter((k) => f[k])
          .join(",")
      : "";
  return [f0.weather ?? "", f0.terrain ?? "", side(f0.my), side(f0.opp)].join(
    "/",
  );
}

/** True when anything is set — the board shows a marker only then. */
export const hasField = (f: FieldState | undefined) =>
  !!f && fieldPrint(f) !== "///";

/** A calculation, kept only while `print` still describes the current inputs. */
export interface CalcNote {
  /** The sentence, exactly as `@smogon/calc`'s `desc()` renders it. */
  text: string;
  /** Fingerprint of (attacker set, defender set, move). See `inputPrint`. */
  print: string;
}

/** `my:Incineroar` — the side and the attacker, so one key names one chip. */
export const calcKey = (side: "my" | "opp", species: string) =>
  `${side}:${species}`;

/** FNV-1a. Short and stable; this is an equality check, not a digest. */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** One Pokémon's set out of a team's verbatim export, by species. */
function setFor(team: StoredTeam, species: string) {
  for (const block of team.exportText.split(/\n\s*\n/)) {
    if (!block.trim()) continue;
    const set = Sets.importSet(block);
    if (!set) continue;
    const name = set.species || set.name;
    if (name && name.toLowerCase() === species.toLowerCase()) return set;
  }
  return null;
}

/** Target kinds that hit both opposing Pokémon at once. */
const SPREAD_AT_FOES = new Set(["allAdjacentFoes", "allAdjacent"]);
export const isSpreadMove = (targetKind: string | null | undefined) =>
  !!targetKind && SPREAD_AT_FOES.has(targetKind);

/**
 * What the attacker on this side is doing, if it is calculable at all.
 *
 * A spread move has **no declared target** — the board deliberately skips that
 * step because the game aims it — so its defenders are whoever is in front on
 * the other side, and doubles' spread reduction is part of each number.
 */
export function calcSubject(
  state: SideState,
  species: string,
  targetKindOf: (move: string) => string | null,
  foe: Pick<SideState, "front" | "fainted">,
): { move: string; defenders: string[]; defendersAreAllies: boolean } | null {
  const move = state.moves?.[species];
  if (!move) return null;

  if (isSpreadMove(targetKindOf(move))) {
    // Filtered against the **foe's** fainted list, not the attacker's. Reading
    // the attacker's was wrong in a way that would only ever show up with a
    // shared species across the two teams.
    const defenders = foe.front.filter(
      (s) => s && !foe.fainted.includes(s),
    ) as string[];
    return defenders.length > 0
      ? { move, defenders, defendersAreAllies: false }
      : null;
  }

  const ref = state.targets?.[species];
  if (!ref) return null;
  const parsed = parseTargetRef(ref);
  if (!parsed) return null;
  return {
    move,
    defenders: [parsed.species],
    defendersAreAllies: parsed.kind === "ally",
  };
}

/**
 * A fingerprint of everything the number depends on.
 *
 * Deliberately built from the **verbatim set text**, not from parsed fields:
 * if an author edits an EV, a nature or an item, the text changes and the
 * fingerprint changes, without this module having to know which fields matter.
 */
export function inputPrint(
  attackerTeam: StoredTeam,
  attacker: string,
  defenderTeam: StoredTeam,
  defenders: readonly string[],
  move: string,
  field?: FieldState,
  attackerIsMySide = true,
): string {
  const a = setFor(attackerTeam, attacker);
  if (!a || defenders.length === 0) return "";
  const parts = [attacker, Sets.exportSet(a), move];
  for (const defender of defenders) {
    const d = setFor(defenderTeam, defender);
    if (!d) return "";
    parts.push(defender, Sets.exportSet(d));
  }
  // The spread reduction depends on how many targets are actually out, so the
  // game type is part of the number and therefore part of the fingerprint.
  parts.push(gameTypeFor(defenders));
  parts.push(fieldPrint(field), attackerIsMySide ? "m" : "o");
  return hash(parts.join("\u0000"));
}

/**
 * A spread move is only reduced when it actually hits more than one Pokémon.
 *
 * That is how VGC works: Heat Wave into two targets is 0.75x each, and into a
 * lone survivor it is full damage. `@smogon/calc` drives the reduction off
 * `gameType` alone, and gameType changes nothing else — a single-target move
 * calculates byte-identically either way (verified) — so this is the honest
 * lever rather than a hack.
 */
const gameTypeFor = (defenders: readonly string[]) =>
  defenders.length > 1 ? "Doubles" : "Singles";

/** True when a stored calculation still describes the board as it stands. */
export const isFresh = (note: CalcNote | undefined, print: string) =>
  !!note && !!print && note.print === print;

/**
 * Run one calculation. Returns null when the board does not describe a
 * complete attack — no move, no declared target, or a set we cannot read.
 *
 * Spread moves are deliberately not calculated: the board offers no target for
 * them (that is a rule of the editor, not an oversight), and inventing one
 * would be xatu deciding something the author did not say.
 */
export async function runCalc(
  attackerTeam: StoredTeam,
  attacker: string,
  defenderTeam: StoredTeam,
  defenders: readonly string[],
  move: string,
  field?: FieldState,
  attackerIsMySide = true,
): Promise<CalcNote | null> {
  const a = setFor(attackerTeam, attacker);
  if (!a || defenders.length === 0) return null;

  const calc = await import("@smogon/calc");
  // Generation 0 is Champions — see `MECHANICS[0] = calculateChampions`.
  const gen = calc.Generations.get(0);
  const build = (set: ReturnType<typeof Sets.importSet>, species: string) =>
    new calc.Pokemon(gen, species, {
      level: set?.level ?? 50,
      nature: set?.nature || "Hardy",
      item: set?.item || undefined,
      ability: set?.ability || undefined,
      evs: set?.evs ?? {},
      ivs: set?.ivs ?? {},
      teraType: set?.teraType as never,
    });

  const sideField = (f: SideField | undefined) => ({
    isReflect: !!f?.reflect,
    isLightScreen: !!f?.lightScreen,
    isAuroraVeil: !!f?.auroraVeil,
    isHelpingHand: !!f?.helpingHand,
    isFriendGuard: !!f?.friendGuard,
  });

  const lines: string[] = [];
  for (const defender of defenders) {
    const d = setFor(defenderTeam, defender);
    if (!d) continue;
    // `calculate` is safe; **`desc()` throws on a zero-damage result**. So the
    // two are separated, and the guard is per defender rather than around the
    // loop — one immune target (Flash Fire into Heat Wave, Ground into a
    // Flying type) used to delete the other target's line along with its own.
    let result;
    try {
      result = calc.calculate(
        gen,
        build(a, attacker),
        build(d, defender),
        new calc.Move(gen, move),
        // The author's stated field, mapped onto the library's shape. The
        // attacker's own side owns Helping Hand; the defender's owns the
        // screens and Friend Guard, so the two swap when the opposing side is
        // the one attacking.
        new calc.Field({
          gameType: gameTypeFor(defenders),
          ...(field?.weather ? { weather: field.weather } : {}),
          ...(field?.terrain ? { terrain: field.terrain } : {}),
          attackerSide: sideField(
            attackerIsMySide ? field?.my : field?.opp,
          ) as never,
          defenderSide: sideField(
            attackerIsMySide ? field?.opp : field?.my,
          ) as never,
        }),
      );
    } catch {
      // Unreadable data is the author's, not a crash — skip this defender.
      continue;
    }

    let text: string | null = null;
    try {
      text = result.desc();
    } catch {
      text = null;
    }
    if (text) {
      lines.push(text);
      continue;
    }
    // No description means no damage. Say so: "this does nothing to that" is a
    // real answer and often the whole point of checking. *Why* is the author's
    // to write — xatu states the result, not the mechanic behind it.
    const rolls = [result.damage as unknown].flat(3).map(Number);
    if (rolls.every((n) => !Number.isFinite(n) || n === 0)) {
      lines.push(`${attacker} ${move} vs. ${defender}: 0`);
    }
  }

  if (lines.length === 0) return null;
  // One line per defender — a spread move hits both, and the author wants both
  // numbers rather than whichever one we picked for them.
  return {
    text: lines.join("\n"),
    print: inputPrint(
      attackerTeam,
      attacker,
      defenderTeam,
      defenders,
      move,
      field,
      attackerIsMySide,
    ),
  };
}

/**
 * Drop every calculation whose inputs have moved on.
 *
 * Called before the board is stored, so the invariant holds at rest as well as
 * on screen: anything written to localStorage, mirrored to the account or
 * published is true for the sets it ships with. A dropped calculation is not
 * lost work — turning the calculator on recomputes it.
 */
export function pruneCalcs(
  nodes: TurnNode[],
  my: StoredTeam,
  opp: StoredTeam,
  /**
   * Move targeting, from the lazily-loaded dex. **Null means "not loaded
   * yet"**, and then nothing is pruned: without it a spread move looks like a
   * move with no target, every fingerprint would mismatch, and a save in the
   * first moments of a page would delete the author's calculations.
   */
  targetKindOf: ((move: string) => string | null) | null,
): TurnNode[] {
  if (!targetKindOf) return nodes;
  let changed = false;
  const next = nodes.map((node) => {
    if (!node.calcs) return node;
    const kept: Record<string, CalcNote> = {};
    for (const [key, note] of Object.entries(node.calcs)) {
      const [side, species] = [
        key.slice(0, key.indexOf(":")),
        key.slice(key.indexOf(":") + 1),
      ];
      if (side !== "my" && side !== "opp") continue;
      const state = side === "my" ? node.my : node.opp;
      const foe = side === "my" ? node.opp : node.my;
      const subject = calcSubject(state, species, targetKindOf, foe);
      if (!subject) continue;
      const attackerTeam = side === "my" ? my : opp;
      const defenderTeam = subject.defendersAreAllies
        ? attackerTeam
        : side === "my"
          ? opp
          : my;
      const print = inputPrint(
        attackerTeam,
        species,
        defenderTeam,
        subject.defenders,
        subject.move,
        node.field,
        side === "my",
      );
      if (isFresh(note, print)) kept[key] = note;
    }
    const hasAny = Object.keys(kept).length > 0;
    if (hasAny && Object.keys(kept).length === Object.keys(node.calcs).length)
      return node;
    changed = true;
    const copy = { ...node };
    if (hasAny) copy.calcs = kept;
    else delete copy.calcs;
    return copy;
  });
  return changed ? next : nodes;
}
