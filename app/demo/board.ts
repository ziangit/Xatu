import type { SideState, TurnNode } from "./storage";

/**
 * Board rules that are worth testing, kept pure and framework-free.
 *
 * None of this computes a battle — it only keeps the recorded state coherent
 * with two facts about doubles the author shouldn't have to re-enter by hand:
 * a Pokémon that switches in is spending its action on the switch, and the
 * next turn starts from where the previous turn ended.
 */

/** A declared move belongs to a front Pokémon — leaving the front clears it
 * (and its target). */
export function stripMove(side: SideState, species: string): SideState {
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
 * Front Pokémon that weren't in front on the previous turn: they switched in,
 * which *is* their action for the turn, so they can't also declare a move. A
 * turn-0 preview has no previous turn and therefore no switches.
 */
export function switchedInSpecies(
  side: SideState,
  parentSide: SideState | null,
): string[] {
  if (!parentSide) return [];
  return side.front.filter((s) => !parentSide.front.includes(s));
}

const sameGroups = (a: SideState, b: SideState) =>
  a.front.join() === b.front.join() &&
  a.back.join() === b.back.join() &&
  [...a.fainted].sort().join() === [...b.fainted].sort().join();

/**
 * Applies a parent's positional change to one descendant, but only where the
 * descendant still held the old occupant — anything the author deliberately
 * changed downstream is left alone. Returns null when nothing applies.
 */
function applyDelta(
  child: SideState,
  before: SideState,
  after: SideState,
): SideState | null {
  let front = [...child.front];
  let back = [...child.back];
  let fainted = [...child.fainted];
  let touched = false;

  const substitute = (
    group: string[],
    i: number,
    from?: string,
    to?: string,
  ) => {
    if (from === to) return;
    if (group[i] !== from) return; // author changed it downstream — keep theirs
    if (to === undefined) group.splice(i, 1);
    else group[i] = to;
    touched = true;
  };

  for (let i = 0; i < 2; i++) {
    substitute(front, i, before.front[i], after.front[i]);
    substitute(back, i, before.back[i], after.back[i]);
  }

  // A faint carries forward (it's permanent); a revive just clears the flag.
  for (const s of after.fainted) {
    if (before.fainted.includes(s) || fainted.includes(s)) continue;
    fainted.push(s);
    front = front.filter((x) => x !== s);
    back = back.filter((x) => x !== s);
    touched = true;
  }
  for (const s of before.fainted) {
    if (after.fainted.includes(s) || !fainted.includes(s)) continue;
    fainted = fainted.filter((x) => x !== s);
    touched = true;
  }

  if (!touched) return null;

  // A substitution can duplicate a Pokémon across groups; front wins.
  back = back.filter((s) => !front.includes(s));
  fainted = fainted.filter((s) => !front.includes(s) && !back.includes(s));

  let next: SideState = { ...child, front, back, fainted };
  // Anything no longer in front loses its declared move. (A Mega is kept: a
  // Mega-Evolved Pokémon stays Mega, on the field or on the bench.)
  for (const s of child.front) {
    if (!front.includes(s)) next = stripMove(next, s);
  }
  return next;
}

/**
 * Positions carry forward down the tree: after a change to one node's side,
 * every descendant that still showed the old arrangement is updated to the new
 * one. Alternates share their sibling's parent, so they inherit too.
 */
export function cascadePositions(
  nodes: TurnNode[],
  changedId: string,
  sideKey: "my" | "opp",
  before: SideState,
  after: SideState,
): TurnNode[] {
  let out = nodes;
  const queue: { id: string; before: SideState; after: SideState }[] = [
    { id: changedId, before, after },
  ];
  while (queue.length > 0) {
    const step = queue.shift()!;
    if (sameGroups(step.before, step.after)) continue;
    for (const child of out.filter((n) => n.parentId === step.id)) {
      const next = applyDelta(child[sideKey], step.before, step.after);
      if (!next) continue;
      const childBefore = child[sideKey];
      out = out.map((n) => (n.id === child.id ? { ...n, [sideKey]: next } : n));
      queue.push({ id: child.id, before: childBefore, after: next });
    }
  }
  return out;
}
