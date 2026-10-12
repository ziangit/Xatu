import { describe, expect, it } from "vitest";
import {
  cascadePositions,
  isAlternate,
  layoutRows,
  stripMove,
  switchedInSpecies,
} from "../board";
import type { SideState, TurnNode } from "../storage";

const side = (p: Partial<SideState>): SideState => ({
  front: [],
  back: [],
  fainted: [],
  ...p,
});

/** t0 → t1 → t2, one line, all three showing the same arrangement. */
function line(): TurnNode[] {
  const state = () => ({
    my: side({
      front: ["Torkoal", "Lilligant-Hisui"],
      back: ["Tyranitar", "Incineroar"],
    }),
    opp: side({
      front: ["Aerodactyl", "Charizard"],
      back: ["Kingambit", "Sylveon"],
    }),
  });
  return [
    { id: "t0", turn: 1, parentId: null, ...state() },
    { id: "t1", turn: 2, parentId: "t0", ...state() },
    { id: "t2", turn: 3, parentId: "t1", ...state() },
  ];
}

describe("switchedInSpecies", () => {
  it("flags a Pokémon that wasn't in front last turn", () => {
    const parent = side({
      front: ["Torkoal", "Lilligant-Hisui"],
      back: ["Tyranitar"],
    });
    const now = side({
      front: ["Tyranitar", "Lilligant-Hisui"],
      back: ["Torkoal"],
    });
    expect(switchedInSpecies(now, parent)).toEqual(["Tyranitar"]);
  });

  it("ignores a reorder of the same two", () => {
    const parent = side({ front: ["Torkoal", "Lilligant-Hisui"] });
    const now = side({ front: ["Lilligant-Hisui", "Torkoal"] });
    expect(switchedInSpecies(now, parent)).toEqual([]);
  });

  it("has nothing to compare at team preview", () => {
    expect(switchedInSpecies(side({ front: ["Torkoal"] }), null)).toEqual([]);
  });
});

describe("cascadePositions", () => {
  it("carries a switch forward to later turns", () => {
    const nodes = line();
    const before = nodes[1].my;
    const after = side({
      front: ["Tyranitar", "Lilligant-Hisui"],
      back: ["Torkoal", "Incineroar"],
    });
    const out = cascadePositions(
      nodes.map((n) => (n.id === "t1" ? { ...n, my: after } : n)),
      "t1",
      "my",
      before,
      after,
    );
    expect(out.find((n) => n.id === "t2")!.my.front).toEqual([
      "Tyranitar",
      "Lilligant-Hisui",
    ]);
    expect(out.find((n) => n.id === "t2")!.my.back).toEqual([
      "Torkoal",
      "Incineroar",
    ]);
    // The edited turn and the untouched side are left alone.
    expect(out.find((n) => n.id === "t0")!.my.front[0]).toBe("Torkoal");
    expect(out.find((n) => n.id === "t2")!.opp.front[0]).toBe("Aerodactyl");
  });

  it("keeps a downstream arrangement the author chose themselves", () => {
    const nodes = line();
    // The author already switched Incineroar in on turn 2.
    const edited = nodes.map((n) =>
      n.id === "t2"
        ? {
            ...n,
            my: side({
              front: ["Incineroar", "Lilligant-Hisui"],
              back: ["Torkoal", "Tyranitar"],
            }),
          }
        : n,
    );
    const before = edited[1].my;
    const after = side({
      front: ["Tyranitar", "Lilligant-Hisui"],
      back: ["Torkoal", "Incineroar"],
    });
    const out = cascadePositions(
      edited.map((n) => (n.id === "t1" ? { ...n, my: after } : n)),
      "t1",
      "my",
      before,
      after,
    );
    expect(out.find((n) => n.id === "t2")!.my.front).toEqual([
      "Incineroar",
      "Lilligant-Hisui",
    ]);
  });

  it("propagates a faint and clears the fainted Pokémon's move downstream", () => {
    const nodes = line().map((n) =>
      n.id === "t2"
        ? { ...n, my: { ...n.my, moves: { Torkoal: "Eruption" } } }
        : n,
    );
    const before = nodes[1].my;
    const after = side({
      front: ["Lilligant-Hisui"],
      back: ["Tyranitar", "Incineroar"],
      fainted: ["Torkoal"],
    });
    const out = cascadePositions(
      nodes.map((n) => (n.id === "t1" ? { ...n, my: after } : n)),
      "t1",
      "my",
      before,
      after,
    );
    const t2 = out.find((n) => n.id === "t2")!.my;
    expect(t2.fainted).toContain("Torkoal");
    expect(t2.front).not.toContain("Torkoal");
    expect(t2.moves).toBeUndefined();
  });

  it("reaches alternates of the next turn (they share the parent)", () => {
    const nodes = [
      ...line(),
      {
        id: "t1b",
        turn: 2,
        parentId: "t0",
        my: side({
          front: ["Torkoal", "Lilligant-Hisui"],
          back: ["Tyranitar"],
        }),
        opp: side({ front: ["Aerodactyl", "Charizard"] }),
      },
    ];
    const before = nodes[0].my;
    const after = side({
      front: ["Torkoal", "Incineroar"],
      back: ["Tyranitar", "Lilligant-Hisui"],
    });
    const out = cascadePositions(
      nodes.map((n) => (n.id === "t0" ? { ...n, my: after } : n)),
      "t0",
      "my",
      before,
      after,
    );
    expect(out.find((n) => n.id === "t1b")!.my.front).toEqual([
      "Torkoal",
      "Incineroar",
    ]);
  });

  it("does nothing when only moves changed", () => {
    const nodes = line();
    const before = nodes[1].my;
    const after = { ...before, moves: { Torkoal: "Eruption" } };
    const out = cascadePositions(nodes, "t1", "my", before, after);
    expect(out).toBe(nodes);
  });

  it("keeps a Mega recorded downstream — a Mega Pokémon stays Mega", () => {
    const nodes = line().map((n) =>
      n.id === "t2" ? { ...n, my: { ...n.my, mega: "Tyranitar" } } : n,
    );
    const before = nodes[1].my;
    const after = side({
      front: ["Tyranitar", "Lilligant-Hisui"],
      back: ["Torkoal", "Incineroar"],
    });
    const out = cascadePositions(
      nodes.map((n) => (n.id === "t1" ? { ...n, my: after } : n)),
      "t1",
      "my",
      before,
      after,
    );
    expect(out.find((n) => n.id === "t2")!.my.mega).toBe("Tyranitar");
  });
});

describe("stripMove", () => {
  it("drops the move and its target, collapsing empty records", () => {
    const s = side({
      front: ["Torkoal"],
      moves: { Torkoal: "Eruption" },
      targets: { Torkoal: "foe:Aerodactyl" },
    });
    const out = stripMove(s, "Torkoal");
    expect(out.moves).toBeUndefined();
    expect(out.targets).toBeUndefined();
  });

  it("returns the same object when there's nothing to strip", () => {
    const s = side({ front: ["Torkoal"] });
    expect(stripMove(s, "Torkoal")).toBe(s);
  });
});

/**
 * These two drive both the editor's grid and the read-only reader's. They were
 * duplicated once and drifted: the reader laid alternates out in a row with
 * arrows between them, so two versions of the same turn read as a sequence —
 * the plan appeared to say something its author never wrote.
 */
describe("layoutRows / isAlternate", () => {
  const node = (
    id: string,
    turn: number,
    parentId: string | null,
  ): TurnNode => ({
    id,
    turn,
    parentId,
    my: { front: [], back: [], fainted: [] },
    opp: { front: [], back: [], fainted: [] },
  });

  it("keeps a straight line of turns on one row", () => {
    const nodes = [node("a", 1, null), node("b", 2, "a"), node("c", 3, "b")];
    const rows = layoutRows(nodes);
    expect([rows.get("a"), rows.get("b"), rows.get("c")]).toEqual([0, 0, 0]);
  });

  it("steps a branch down to its own row", () => {
    // a → b, and a → b2 as an alternate of the same turn.
    const nodes = [node("a", 1, null), node("b", 2, "a"), node("b2", 2, "a")];
    const rows = layoutRows(nodes);
    expect(rows.get("b")).toBe(0);
    expect(rows.get("b2")).toBe(1);
    expect(rows.get("a")).toBe(0);
  });

  it("gives a second root its own row", () => {
    const nodes = [node("a", 1, null), node("z", 1, null)];
    const rows = layoutRows(nodes);
    expect(rows.get("a")).not.toBe(rows.get("z"));
  });

  it("calls the second child, and only the second, an alternate", () => {
    const nodes = [node("a", 1, null), node("b", 2, "a"), node("b2", 2, "a")];
    expect(isAlternate(nodes[0], nodes)).toBe(false);
    expect(isAlternate(nodes[1], nodes)).toBe(false);
    expect(isAlternate(nodes[2], nodes)).toBe(true);
  });

  it("calls a second root an alternate", () => {
    const nodes = [node("a", 1, null), node("z", 1, null)];
    expect(isAlternate(nodes[0], nodes)).toBe(false);
    expect(isAlternate(nodes[1], nodes)).toBe(true);
  });
});
