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
  foeFront: readonly string[],
): { move: string; defenders: string[]; defendersAreAllies: boolean } | null {
  const move = state.moves?.[species];
  if (!move) return null;

  if (isSpreadMove(targetKindOf(move))) {
    const defenders = foeFront.filter(
      (s) => s && !state.fainted.includes(s),
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
): string {
  const a = setFor(attackerTeam, attacker);
  if (!a || defenders.length === 0) return "";
  const parts = [attacker, Sets.exportSet(a), move];
  for (const defender of defenders) {
    const d = setFor(defenderTeam, defender);
    if (!d) return "";
    parts.push(defender, Sets.exportSet(d));
  }
  // Doubles spread damage is part of the number, so the game type belongs in
  // the fingerprint even though it never varies today.
  parts.push("Doubles");
  return hash(parts.join("\u0000"));
}

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

  try {
    const lines: string[] = [];
    for (const defender of defenders) {
      const d = setFor(defenderTeam, defender);
      if (!d) return null;
      const result = calc.calculate(
        gen,
        build(a, attacker),
        build(d, defender),
        new calc.Move(gen, move),
        // Doubles is not decoration: a spread move is reduced here, which is
        // most of why these numbers differ from a singles calculator's.
        new calc.Field({ gameType: "Doubles" }),
      );
      const text = result.desc();
      if (text) lines.push(text);
    }
    if (lines.length === 0) return null;
    // One line per defender — a spread move hits both, and the author wants
    // both numbers rather than whichever one we picked for them.
    return {
      text: lines.join("\n"),
      print: inputPrint(attackerTeam, attacker, defenderTeam, defenders, move),
    };
  } catch {
    // An unknown move or species is the author's data, not a crash. The board
    // is lenient everywhere else and stays lenient here.
    return null;
  }
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
      const subject = calcSubject(state, species, targetKindOf, foe.front);
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
