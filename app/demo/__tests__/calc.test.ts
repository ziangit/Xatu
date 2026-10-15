import { describe, expect, it } from "vitest";
import { calcKey, calcSubject, inputPrint, isFresh, pruneCalcs } from "../calc";
import type { SideState, StoredTeam, TurnNode } from "../storage";

const team = (name: string, exportText: string): StoredTeam => ({
  id: name,
  name,
  format: "[Gen 9 Champions] VGC 2026 Reg M-C",
  exportText,
  parsed: [
    { species: "Talonflame", moves: [] },
    { species: "Gholdengo", moves: [] },
  ],
});

const TALON = `Talonflame @ Charcoal
Ability: Gale Wings
Level: 50
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Overheat`;

const GHOLD = `Gholdengo
Ability: Good as Gold
Level: 50
EVs: 27 HP / 16 SpD
Hardy Nature
- Make It Rain`;

const mine = () => team("mine", TALON);
const theirs = () => team("theirs", GHOLD);

const side = (p: Partial<SideState>): SideState => ({
  front: [],
  back: [],
  fainted: [],
  ...p,
});

const SINGLE = () => "normal";
const SPREAD = () => "allAdjacentFoes";
const FOES = ["Gholdengo", "Rillaboom"];

describe("calcSubject", () => {
  const base = side({ front: ["Talonflame"] });

  it("needs a move", () => {
    expect(calcSubject(base, "Talonflame", SINGLE, FOES)).toBeNull();
  });

  it("needs a declared target for a single-target move", () => {
    const m = { ...base, moves: { Talonflame: "Overheat" } };
    expect(calcSubject(m, "Talonflame", SINGLE, FOES)).toBeNull();
    expect(
      calcSubject(
        { ...m, targets: { Talonflame: "foe:Gholdengo" } },
        "Talonflame",
        SINGLE,
        FOES,
      ),
    ).toEqual({
      move: "Overheat",
      defenders: ["Gholdengo"],
      defendersAreAllies: false,
    });
  });

  it("aims a spread move at the whole opposing front, with no target declared", () => {
    // The board deliberately never asks for a target here, so requiring one
    // meant Heat Wave was silently never calculated.
    expect(
      calcSubject(
        { ...base, moves: { Talonflame: "Heat Wave" } },
        "Talonflame",
        SPREAD,
        FOES,
      ),
    ).toEqual({
      move: "Heat Wave",
      defenders: ["Gholdengo", "Rillaboom"],
      defendersAreAllies: false,
    });
  });

  it("does not aim a spread move at something already fainted", () => {
    const s = side({
      front: ["Talonflame"],
      fainted: ["Rillaboom"],
      moves: { Talonflame: "Heat Wave" },
    });
    expect(calcSubject(s, "Talonflame", SPREAD, FOES)?.defenders).toEqual([
      "Gholdengo",
    ]);
  });
});

describe("inputPrint", () => {
  const print = (a = TALON, d = GHOLD, move = "Overheat") =>
    inputPrint(team("a", a), "Talonflame", team("d", d), ["Gholdengo"], move);

  it("is stable for unchanged inputs", () => {
    expect(print()).toBe(print());
    expect(print()).not.toBe("");
  });

  it("changes when the attacker's spread changes", () => {
    expect(print(TALON.replace("32 SpA", "16 SpA"))).not.toBe(print());
  });

  it("changes when the defender's spread changes", () => {
    expect(print(TALON, GHOLD.replace("27 HP", "4 HP"))).not.toBe(print());
  });

  it("changes when the item or nature changes", () => {
    expect(print(TALON.replace("@ Charcoal", "@ Life Orb"))).not.toBe(print());
    expect(print(TALON.replace("Modest", "Timid"))).not.toBe(print());
  });

  it("changes when the move changes", () => {
    expect(print(TALON, GHOLD, "Flare Blitz")).not.toBe(print());
  });

  it("is empty when a set cannot be found, so nothing counts as fresh", () => {
    const p = inputPrint(
      mine(),
      "Incineroar",
      theirs(),
      ["Gholdengo"],
      "Knock Off",
    );
    expect(p).toBe("");
    expect(isFresh({ text: "x", print: "" }, p)).toBe(false);
  });
});

describe("pruneCalcs", () => {
  const attacking = (): SideState =>
    side({
      front: ["Talonflame"],
      moves: { Talonflame: "Overheat" },
      targets: { Talonflame: "foe:Gholdengo" },
    });
  const freshPrint = () =>
    inputPrint(mine(), "Talonflame", theirs(), ["Gholdengo"], "Overheat");
  const node = (calcs: TurnNode["calcs"]): TurnNode => ({
    id: "n",
    turn: 2,
    parentId: null,
    my: attacking(),
    opp: side({ front: ["Gholdengo"] }),
    calcs,
  });

  it("keeps a calculation whose inputs still match", () => {
    const n = node({
      [calcKey("my", "Talonflame")]: { text: "hit", print: freshPrint() },
    });
    expect(pruneCalcs([n], mine(), theirs(), SINGLE)[0].calcs).toEqual(n.calcs);
  });

  it("drops one whose fingerprint has gone stale", () => {
    const n = node({
      [calcKey("my", "Talonflame")]: { text: "hit", print: "stale" },
    });
    expect(pruneCalcs([n], mine(), theirs(), SINGLE)[0].calcs).toBeUndefined();
  });

  it("drops one whose move is gone", () => {
    const n = node({
      [calcKey("my", "Talonflame")]: { text: "hit", print: freshPrint() },
    });
    n.my = side({ front: ["Talonflame"] });
    expect(pruneCalcs([n], mine(), theirs(), SINGLE)[0].calcs).toBeUndefined();
  });

  it("returns the same array when there is nothing to drop", () => {
    const nodes = [node(undefined)];
    expect(pruneCalcs(nodes, mine(), theirs(), SINGLE)).toBe(nodes);
  });
});

describe("pruneCalcs without the dex", () => {
  it("prunes nothing, rather than deleting work it cannot judge", () => {
    // Null targeting means the lazily-loaded dex has not arrived. Treating a
    // spread move as untargeted would mismatch every fingerprint and wipe the
    // author's calculations on the next save.
    const n: TurnNode = {
      id: "n",
      turn: 2,
      parentId: null,
      my: side({ front: ["Talonflame"], moves: { Talonflame: "Heat Wave" } }),
      opp: side({ front: ["Gholdengo"] }),
      calcs: { "my:Talonflame": { text: "x", print: "whatever" } },
    };
    expect(pruneCalcs([n], mine(), theirs(), null)[0].calcs).toEqual(n.calcs);
  });
});
