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
 * Front Pokémon that weren't in front last turn — and **why**, because the two
 * reasons have opposite consequences.
 *
 * - `switched`: it came in on a switch. Switching *is* that turn's action, so
 *   it cannot also declare a move.
 * - `arrived`: it came in to replace something that fainted. That choice is
 *   made between turns and costs no action, so it **can** move.
 *
 * This used to be one list — "in front now, wasn't before" — which read every
 * replacement as a switch and refused it a move. The state needed to tell them
 * apart was already here: `fainted` is on `SideState` and was simply never
 * consulted.
 *
 * Doubles can do both at once (one slot faints while the other switches out),
 * and the pairing of newcomer to departure is then not recoverable from the
 * state. **It fails open**: if anything that left the front fainted, every
 * newcomer is treated as a replacement. Wrongly allowing a move leaves a line
 * the author can see is wrong; wrongly forbidding one leaves them with no
 * affordance and no explanation, which is the bug this fixes. It also keeps
 * xatu out of the business of enforcing battle rules it cannot fully judge.
 *
 * A turn-0 preview has no previous turn, so nobody has arrived.
 */
export function arrivals(
  side: SideState,
  parentSide: SideState | null,
): { switched: string[]; arrived: string[] } {
  if (!parentSide) return { switched: [], arrived: [] };
  const newcomers = side.front.filter((s) => !parentSide.front.includes(s));
  if (newcomers.length === 0) return { switched: [], arrived: [] };
  const replacing = parentSide.front.some(
    (s) => !side.front.includes(s) && side.fainted.includes(s),
  );
  return replacing
    ? { switched: [], arrived: newcomers }
    : { switched: newcomers, arrived: [] };
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

/**
 * A Mega carries forward down the tree, like positions do.
 *
 * A Pokémon that Mega Evolves stays Mega for the rest of the battle, so a
 * later turn must draw the Mega forme. `addNextTurn` already copies `mega`
 * into a child at the moment the child is made — but recording the Mega
 * *after* the next turn exists left every later turn showing the pre-Mega
 * sprite, which is the ordinary order of work: lay out the turns, then go back
 * and say what happened.
 *
 * It stops where someone has said otherwise. A descendant recording a
 * different Mega is a deliberate edit and is left alone, along with everything
 * below it — the same rule `cascadePositions` follows for a slot whose
 * occupant has already changed.
 */
export function cascadeMega(
  nodes: TurnNode[],
  changedId: string,
  sideKey: "my" | "opp",
  before: string | undefined,
  after: string | undefined,
): TurnNode[] {
  if (before === after) return nodes;
  let out = nodes;
  const queue = [changedId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const child of out.filter((n) => n.parentId === id)) {
      // Diverged: this line has its own answer, so leave it and its children.
      if (child[sideKey].mega !== before) continue;
      out = out.map((n) =>
        n.id === child.id
          ? {
              ...n,
              [sideKey]: { ...n[sideKey], ...(after ? { mega: after } : {}) },
            }
          : n,
      );
      if (!after) {
        out = out.map((n) => {
          if (n.id !== child.id) return n;
          const side = { ...n[sideKey] };
          delete side.mega;
          return { ...n, [sideKey]: side };
        });
      }
      queue.push(child.id);
    }
  }
  return out;
}

/**
 * Where each node sits vertically when the tree is drawn as turn columns.
 *
 * Leaves take sequential rows in depth-first order; a parent sits on its first
 * child's row, so a straight line of turns stays on one row and only branches
 * step down. Pure, so both the editor and the read-only reader can lay a board
 * out the same way — they disagreed once, and a reader that renders two
 * alternates as a sequence is telling the viewer something untrue.
 */
export function layoutRows(nodes: TurnNode[]): Map<string, number> {
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
 * True when this node is a *branch* — an alternate version of the same turn
 * rather than the main line. It is the second or later child of its parent (or
 * the second or later root), which is exactly what "⑂ branch" creates.
 */
export function isAlternate(node: TurnNode, nodes: TurnNode[]): boolean {
  return nodes.find((n) => n.parentId === node.parentId)?.id !== node.id;
}
