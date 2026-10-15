import { describe, expect, it } from "vitest";
import {
  calcContext,
  hasUsableSet,
  missingSets,
  calcKey,
  calcSubject,
  fieldPrint,
  hasField,
  inputPrint,
  isFresh,
  pruneCalcs,
} from "../calc";
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
const FOES = { front: ["Gholdengo", "Rillaboom"], fainted: [] as string[] };

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
    // The *foe's* fainted list decides this, not the attacker's — reading the
    // attacker's was wrong in a way only a shared species would reveal.
    const s = side({
      front: ["Talonflame"],
      moves: { Talonflame: "Heat Wave" },
    });
    const downed = {
      front: ["Gholdengo", "Rillaboom"],
      fainted: ["Rillaboom"],
    };
    expect(calcSubject(s, "Talonflame", SPREAD, downed)?.defenders).toEqual([
      "Gholdengo",
    ]);
  });

  it("ignores the attacker's own fainted list when aiming a spread move", () => {
    const s = side({
      front: ["Talonflame"],
      fainted: ["Rillaboom"],
      moves: { Talonflame: "Heat Wave" },
    });
    expect(calcSubject(s, "Talonflame", SPREAD, FOES)?.defenders).toEqual([
      "Gholdengo",
      "Rillaboom",
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
    expect(pruneCalcs([n], mine(), theirs(), SINGLE, null)[0].calcs).toEqual(
      n.calcs,
    );
  });

  it("drops one whose fingerprint has gone stale", () => {
    const n = node({
      [calcKey("my", "Talonflame")]: { text: "hit", print: "stale" },
    });
    expect(
      pruneCalcs([n], mine(), theirs(), SINGLE, null)[0].calcs,
    ).toBeUndefined();
  });

  it("drops one whose move is gone", () => {
    const n = node({
      [calcKey("my", "Talonflame")]: { text: "hit", print: freshPrint() },
    });
    n.my = side({ front: ["Talonflame"] });
    expect(
      pruneCalcs([n], mine(), theirs(), SINGLE, null)[0].calcs,
    ).toBeUndefined();
  });

  it("returns the same array when there is nothing to drop", () => {
    const nodes = [node(undefined)];
    expect(pruneCalcs(nodes, mine(), theirs(), SINGLE, null)).toBe(nodes);
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
    expect(pruneCalcs([n], mine(), theirs(), null, null)[0].calcs).toEqual(
      n.calcs,
    );
  });
});

describe("field conditions", () => {
  it("an empty field is no field", () => {
    expect(hasField(undefined)).toBe(false);
    expect(hasField({})).toBe(false);
    expect(hasField({ my: {}, opp: {} })).toBe(false);
    expect(hasField({ weather: "Sun" })).toBe(true);
    expect(hasField({ opp: { lightScreen: true } })).toBe(true);
  });

  it("is part of the fingerprint, so changing it restates the number", () => {
    const print = (field?: Parameters<typeof fieldPrint>[0]) =>
      inputPrint(mine(), "Talonflame", theirs(), ["Gholdengo"], "Overheat", {
        field,
      });
    expect(print()).toBe(print({}));
    expect(print({ weather: "Sun" })).not.toBe(print());
    expect(print({ weather: "Sun" })).not.toBe(print({ weather: "Rain" }));
    expect(print({ opp: { lightScreen: true } })).not.toBe(print());
  });

  it("tells the two sides apart", () => {
    // A screen on the defender's side matters; the same screen on the
    // attacker's does not, so the two must not fingerprint alike.
    const field = { my: { lightScreen: true } };
    const asMine = inputPrint(
      mine(),
      "Talonflame",
      theirs(),
      ["Gholdengo"],
      "Overheat",
      { field, attackerIsMySide: true },
    );
    const asTheirs = inputPrint(
      mine(),
      "Talonflame",
      theirs(),
      ["Gholdengo"],
      "Overheat",
      { field, attackerIsMySide: false },
    );
    expect(asMine).not.toBe(asTheirs);
  });
});

describe("spread damage depends on how many are actually out", () => {
  it("fingerprints one target differently from two", () => {
    // VGC: a spread move into two targets is reduced, into a lone survivor it
    // is full damage. The number differs, so the fingerprint must too.
    const one = inputPrint(
      mine(),
      "Talonflame",
      theirs(),
      ["Gholdengo"],
      "Heat Wave",
    );
    const two = inputPrint(
      mine(),
      "Talonflame",
      theirs(),
      ["Gholdengo", "Gholdengo"],
      "Heat Wave",
    );
    expect(one).not.toBe(two);
  });
});

describe("stat stages and crits are part of the fingerprint", () => {
  const print = (ctx = {}) =>
    inputPrint(mine(), "Talonflame", theirs(), ["Gholdengo"], "Overheat", ctx);

  it("an attacker's stage restates the number", () => {
    expect(print({ attackerBoosts: { spa: 1 } })).not.toBe(print());
    expect(print({ attackerBoosts: { spa: 1 } })).not.toBe(
      print({ attackerBoosts: { spa: -1 } }),
    );
  });

  it("a defender's stage restates it too", () => {
    expect(print({ defenderBoosts: { Gholdengo: { spd: 2 } } })).not.toBe(
      print(),
    );
  });

  it("a stage of zero is the same as no stage", () => {
    // Stepping up and back down must not leave the card permanently stale.
    expect(print({ attackerBoosts: { spa: 0 } })).toBe(print());
    expect(print({ attackerBoosts: {} })).toBe(print());
  });

  it("a crit restates it", () => {
    expect(print({ crit: true })).not.toBe(print());
    expect(print({ crit: false })).toBe(print());
  });
});

describe("a recorded Mega is calculated as its Mega forme", () => {
  const node = {
    my: side({
      front: ["Talonflame"],
      moves: { Talonflame: "Overheat" },
      targets: { Talonflame: "foe:Gholdengo" },
      mega: "Talonflame",
    }),
    opp: side({ front: ["Gholdengo"], mega: "Gholdengo" }),
    field: undefined,
  };
  const formeOf = (sp: string) => `${sp}-Mega`;

  it("names the forme for the attacker and the defender", () => {
    const ctx = calcContext(node, "my", "Talonflame", formeOf);
    expect(ctx.attackerAs).toBe("Talonflame-Mega");
    expect(ctx.defenderAs).toEqual({ Gholdengo: "Gholdengo-Mega" });
  });

  it("leaves the forme alone while the dex has not loaded", () => {
    const ctx = calcContext(node, "my", "Talonflame", null);
    expect(ctx.attackerAs).toBeUndefined();
    expect(ctx.defenderAs).toBeUndefined();
  });

  it("restates the number, since a Mega changes stats and ability", () => {
    const plain = inputPrint(
      mine(),
      "Talonflame",
      theirs(),
      ["Gholdengo"],
      "Overheat",
    );
    const mega = inputPrint(
      mine(),
      "Talonflame",
      theirs(),
      ["Gholdengo"],
      "Overheat",
      {
        attackerAs: "Talonflame-Mega",
      },
    );
    expect(mega).not.toBe(plain);
  });
});

describe("a roster without sets is not calculated", () => {
  // A team typed into the species picker, or carried by a pasted document,
  // stores names only. Calculating one means inventing a 0-EV neutral Pokémon
  // the author never wrote and then stating the result as fact.
  const bare = () => team("bare", "Talonflame\n\nGholdengo");

  it("knows a bare entry from a real set", () => {
    expect(hasUsableSet(mine(), "Talonflame")).toBe(true);
    expect(hasUsableSet(bare(), "Talonflame")).toBe(false);
  });

  it("names every participant that is missing one", () => {
    expect(missingSets(bare(), "Talonflame", theirs(), ["Gholdengo"])).toEqual([
      "Talonflame",
    ]);
    expect(missingSets(mine(), "Talonflame", bare(), ["Gholdengo"])).toEqual([
      "Gholdengo",
    ]);
    expect(missingSets(mine(), "Talonflame", theirs(), ["Gholdengo"])).toEqual(
      [],
    );
  });

  it("counts a set with an item but no EVs as real", () => {
    // Champions sets always total 66 EVs, but an item or a nature alone is
    // still an author statement — only a naked species name is not.
    const itemOnly = team("i", "Talonflame @ Charcoal");
    expect(hasUsableSet(itemOnly, "Talonflame")).toBe(true);
  });
});
