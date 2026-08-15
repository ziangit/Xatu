import { describe, expect, it } from "vitest";
import {
  decodeWorkflow,
  decodeWorkflowGroup,
  encodeGroup,
  encodeWorkflow,
} from "../workflow-io";
import type { SimSetup, TurnNode } from "../storage";

const MY = [
  "Tyranitar",
  "Excadrill",
  "Milotic",
  "Gholdengo",
  "Sinistcha",
  "Staraptor",
];
const OPP = [
  "Aerodactyl",
  "Charizard",
  "Garchomp",
  "Sylveon",
  "Kingambit",
  "Dragonite",
];

const team = (name: string, species: string[]) => ({
  id: name,
  name,
  format: "[Gen 9 Champions] VGC 2026 Reg M-B",
  exportText: species.join("\n\n"),
  parsed: species.map((s) => ({ species: s, moves: [] })),
});

const setup: SimSetup = { my: team("Sand", MY), opp: team("Zard", OPP) };

const side = (front: string[], back: string[], fainted: string[] = []) => ({
  front,
  back,
  fainted,
});

// T1 with an alternate T1, the main line continuing to T2 with a faint.
const nodes: TurnNode[] = [
  {
    id: "a",
    turn: 1,
    parentId: null,
    my: side(["Tyranitar", "Excadrill"], ["Milotic", "Gholdengo"]),
    opp: side(["Aerodactyl", "Kingambit"], ["Garchomp", "Sylveon"]),
  },
  {
    id: "b",
    turn: 2,
    parentId: "a",
    my: {
      ...side(["Milotic", "Excadrill"], ["Gholdengo"], ["Tyranitar"]),
      moves: { Milotic: "Icy Wind", Excadrill: "High Horsepower" },
      targets: { Excadrill: "foe:Aerodactyl", Milotic: "ally:Excadrill" },
    },
    opp: side(["Aerodactyl", "Kingambit"], ["Garchomp", "Sylveon"]),
    note: "Sac Tyranitar to keep sand up; Milotic answers Torkoal.",
  },
  {
    id: "c",
    turn: 1,
    parentId: null,
    my: side(["Gholdengo", "Milotic"], ["Tyranitar", "Staraptor"]),
    opp: side(["Charizard", "Sylveon"], ["Aerodactyl", "Kingambit"]),
  },
];

describe("workflow codec", () => {
  it("round-trips the graph: turns, tree shape, placements, and notes survive", () => {
    const result = decodeWorkflow(encodeWorkflow(setup, nodes));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toEqual([]);
    const out = result.nodes;
    expect(out).toHaveLength(3);
    expect(out.map((n) => n.turn)).toEqual([1, 2, 1]);
    expect(out[1].parentId).toBe(out[0].id);
    expect(out[2].parentId).toBeNull();
    expect(out[1].my).toEqual(nodes[1].my); // includes declared moves + targets
    expect(out[1].my.moves).toEqual({
      Milotic: "Icy Wind",
      Excadrill: "High Horsepower",
    });
    expect(out[1].my.targets).toEqual({
      Excadrill: "foe:Aerodactyl",
      Milotic: "ally:Excadrill",
    });
    expect(out[0].my.moves).toBeUndefined();
    expect(out[1].note).toBe(nodes[1].note);
    expect(out[0].note).toBeUndefined();
    expect(out[2].opp.front).toEqual(["Charizard", "Sylveon"]);
    expect(result.setup.my.parsed.map((m) => m.species)).toEqual(MY);
  });

  it("stays compact — a few hundred bytes, not KB", () => {
    expect(encodeWorkflow(setup, nodes).length).toBeLessThan(700);
  });

  it("round-trips a recorded Mega, with or without a move", () => {
    const withMega: TurnNode[] = [
      nodes[0],
      {
        ...nodes[1],
        my: {
          ...side(["Tyranitar", "Excadrill"], ["Milotic", "Gholdengo"]),
          moves: { Tyranitar: "Rock Slide" },
          mega: "Tyranitar",
        },
      },
    ];
    const out = decodeWorkflow(encodeWorkflow(setup, withMega));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.warnings).toEqual([]);
    expect(out.nodes[1].my.mega).toBe("Tyranitar");
    expect(out.nodes[1].my.moves).toEqual({ Tyranitar: "Rock Slide" });
    expect(out.nodes[0].my.mega).toBeUndefined();

    // A Mega with no move declared still survives (empty 4th group).
    const megaOnly: TurnNode[] = [
      nodes[0],
      {
        ...nodes[1],
        my: {
          ...side(["Tyranitar", "Excadrill"], ["Milotic", "Gholdengo"]),
          mega: "Tyranitar",
        },
      },
    ];
    const bare = decodeWorkflow(encodeWorkflow(setup, megaOnly));
    expect(bare.ok).toBe(true);
    if (!bare.ok) return;
    expect(bare.nodes[1].my.mega).toBe("Tyranitar");
    expect(bare.nodes[1].my.moves).toBeUndefined();
  });

  it("drops a Mega recorded for a Pokémon that isn't in front, with a warning", () => {
    const bogus = JSON.stringify({
      v: 2,
      my: { n: "Sand", f: "", s: MY },
      op: { n: "Zard", f: "", s: OPP },
      // front|back|fainted|moves|mega — Tyranitar (0) is on the bench but
      // flagged as the Mega, so the 5th group must be dropped with a warning.
      t: [[0, "12|34|||0", "01|23"]],
    });
    const out = decodeWorkflow(bogus);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.nodes[0].my.mega).toBeUndefined();
    expect(out.warnings.join(" ")).toMatch(
      /Tyranitar Megas but isn't in front/,
    );
  });

  it("rejects garbage and unknown versions as a group too", () => {
    expect(decodeWorkflowGroup("not json")).toMatchObject({ ok: false });
    expect(decodeWorkflowGroup('{"v":4}')).toMatchObject({ ok: false });
    expect(
      decodeWorkflowGroup(
        JSON.stringify({ v: 3, my: { n: "A", f: "", s: MY } }),
      ),
    ).toMatchObject({ ok: false });
    // v3 with no opposing teams at all
    const empty = decodeWorkflowGroup(
      JSON.stringify({ v: 3, my: { n: "A", f: "", s: MY }, b: [] }),
    );
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error).toMatch(/no opposing teams/);
  });

  it("still accepts the legacy verbose form", () => {
    const legacy = JSON.stringify({ version: 1, setup, nodes });
    const result = decodeWorkflow(legacy);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.nodes).toHaveLength(3);
  });

  it("rejects garbage with an error message", () => {
    expect(decodeWorkflow("not json")).toMatchObject({ ok: false });
    expect(decodeWorkflow('{"v":3}')).toMatchObject({ ok: false });
  });

  it("rejects structurally broken v2 payloads instead of throwing", () => {
    const base = `"my":{"n":"A","f":"","s":["Pikachu"]},"op":{"n":"B","f":"","s":["Eevee"]}`;
    expect(decodeWorkflow(`{"v":2,${base},"t":["nope"]}`)).toMatchObject({
      ok: false,
    });
    expect(decodeWorkflow(`{"v":2,${base},"t":[[0,1,2]]}`)).toMatchObject({
      ok: false,
    });
    expect(
      decodeWorkflow(
        `{"v":2,"my":{"n":"A","f":"","s":[]},"op":{"n":"B","f":"","s":["Eevee"]},"t":[[0,"0","0"]]}`,
      ),
    ).toMatchObject({ ok: false });
  });

  it("rejects non-existent Pokémon by name", () => {
    const json = JSON.stringify({
      v: 2,
      my: { n: "A", f: "", s: ["Tyranitar", "Newmon2027"] },
      op: { n: "B", f: "", s: OPP },
      t: [[0, "01", "01"]],
    });
    const result = decodeWorkflow(json);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Newmon2027");
  });

  it("imports rule-breaking states with warnings: overflow, duplicates, bad refs", () => {
    const json = JSON.stringify({
      v: 2,
      my: { n: "A", f: "", s: MY },
      op: { n: "B", f: "", s: OPP },
      // front of 3, a mon repeated in front and back, a digit off the roster,
      // and a forward parent reference
      t: [
        [0, "012|03", "09|1"],
        [5, "01|23", "01|23"],
      ],
    });
    const result = decodeWorkflow(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n = result.nodes[0];
    expect(n.my.front).toEqual(["Tyranitar", "Excadrill"]); // overflow dropped
    expect(n.my.back).toEqual(["Gholdengo"]); // duplicate kept first placement
    expect(n.opp.front).toEqual(["Aerodactyl"]); // "9" off the roster — dropped
    expect(result.nodes[1].turn).toBe(1); // bad parent → alternate turn 1
    expect(result.warnings.length).toBeGreaterThanOrEqual(4);
    expect(result.warnings.join(" ")).toContain("Milotic moved to the bench");
    expect(result.warnings.join(" ")).toContain("invalid parent reference");
  });

  it("drops moves declared for Pokémon not in front, with a warning", () => {
    const json = JSON.stringify({
      v: 2,
      my: { n: "A", f: "", s: MY },
      op: { n: "B", f: "", s: OPP },
      // On turn 1: Milotic (2) has a move but sits on the bench; Tyranitar is legal.
      t: [
        [0, "01|23", "01|23"],
        [1, "01|34||0:Rock Slide,2:Scald", "01|23"],
      ],
    });
    const result = decodeWorkflow(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[1].my.moves).toEqual({ Tyranitar: "Rock Slide" });
    expect(result.warnings.join(" ")).toContain("isn't in front");
  });

  it("drops move targets that aren't on the field, keeping the move", () => {
    const json = JSON.stringify({
      v: 2,
      my: { n: "A", f: "", s: MY },
      op: { n: "B", f: "", s: OPP },
      // Tyranitar targets foe 4 (Kingambit), who is NOT in the opposing front.
      t: [
        [0, "01|23", "01|23"],
        [1, "01|23||0:Rock Slide>f4", "01|23"],
      ],
    });
    const result = decodeWorkflow(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[1].my.moves).toEqual({ Tyranitar: "Rock Slide" });
    expect(result.nodes[1].my.targets).toBeUndefined();
    expect(result.warnings.join(" ")).toContain("target isn't on the field");
  });

  it("drops moves declared on turn 0 — team preview is positions only", () => {
    const json = JSON.stringify({
      v: 2,
      my: { n: "A", f: "", s: MY },
      op: { n: "B", f: "", s: OPP },
      t: [[0, "01|23||0:Rock Slide", "01|23"]],
    });
    const result = decodeWorkflow(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nodes[0].my.moves).toBeUndefined();
    expect(result.warnings.join(" ")).toContain("team preview");
  });
});

// One team vs. many: the same document, N opponents. A single board is N = 1,
// so copy/paste doesn't care which one the author is looking at.
describe("group codec (one team vs. many opponents)", () => {
  const THIRD = [
    "Torkoal",
    "Ursaluna",
    "Amoonguss",
    "Rillaboom",
    "Farigiraf",
    "Ting-Lu",
  ];
  const boards = [
    { opp: team("Zard", OPP), nodes },
    {
      opp: team("Trick Room", THIRD),
      nodes: [
        {
          id: "x",
          turn: 1,
          parentId: null,
          my: side(["Milotic", "Gholdengo"], ["Tyranitar", "Excadrill"]),
          opp: side(["Torkoal", "Ursaluna"], ["Amoonguss", "Rillaboom"]),
          note: "Don't let Torkoal set sun for free.",
        },
      ] as TurnNode[],
    },
  ];

  it("round-trips several opponents under one team", () => {
    const result = decodeWorkflowGroup(encodeGroup(setup.my, boards));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toEqual([]);
    expect(result.my.name).toBe("Sand");
    expect(result.my.parsed.map((m) => m.species)).toEqual(MY);
    expect(result.boards).toHaveLength(2);
    expect(result.boards.map((b) => b.opp.name)).toEqual([
      "Zard",
      "Trick Room",
    ]);
    expect(result.boards[0].nodes).toHaveLength(3);
    expect(result.boards[0].nodes[1].my.moves).toEqual({
      Milotic: "Icy Wind",
      Excadrill: "High Horsepower",
    });
    expect(result.boards[1].nodes[0].note).toBe(
      "Don't let Torkoal set sun for free.",
    );
    expect(result.boards[1].opp.parsed.map((m) => m.species)).toEqual(THIRD);
  });

  it("gives every board the same `my` team, so they group on import", () => {
    const result = decodeWorkflowGroup(encodeGroup(setup.my, boards));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The team id is what `groupByMyTeam` buckets on — one team, one id.
    expect(result.my.exportText).toBe(MY.join("\n\n"));
    expect(new Set([result.my.id]).size).toBe(1);
  });

  it("states the author's roster once — a group is far smaller than N copies", () => {
    const group = encodeGroup(setup.my, boards);
    const separate = boards
      .map((b) => encodeWorkflow({ my: setup.my, opp: b.opp }, b.nodes))
      .join("");
    expect(group.length).toBeLessThan(separate.length);
    expect(group.split('"Sand"').length - 1).toBe(1);
  });

  it("a single board is the same format — v3 with one opponent", () => {
    const one = encodeWorkflow(setup, nodes);
    expect(JSON.parse(one).v).toBe(3);
    expect(JSON.parse(one).b).toHaveLength(1);
    const asGroup = decodeWorkflowGroup(one);
    expect(asGroup.ok).toBe(true);
    if (asGroup.ok) expect(asGroup.boards).toHaveLength(1);
    // …and reading it as one board still works, for the board page.
    const asBoard = decodeWorkflow(one);
    expect(asBoard.ok).toBe(true);
    if (asBoard.ok) expect(asBoard.nodes).toHaveLength(3);
  });

  it("reads a v2 pair as a group of one", () => {
    const legacyPair = JSON.stringify({
      v: 2,
      my: { n: "Sand", f: "", s: MY },
      op: { n: "Zard", f: "", s: OPP },
      t: [[0, "01|23", "01|23"]],
    });
    const result = decodeWorkflowGroup(legacyPair);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.boards).toHaveLength(1);
    expect(result.boards[0].opp.name).toBe("Zard");
  });

  it("names the board a warning came from, but only when there are several", () => {
    const many = JSON.stringify({
      v: 3,
      my: { n: "Sand", f: "", s: MY },
      b: [
        { op: { n: "Zard", f: "", s: OPP }, t: [[0, "01|23", "01|23"]] },
        // front of three on the opposing side — sanitized with a warning
        {
          op: { n: "Trick Room", f: "", s: THIRD },
          t: [[0, "01|23", "012|3"]],
        },
      ],
    });
    const result = decodeWorkflowGroup(many);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.every((w) => w.startsWith("vs Trick Room — "))).toBe(
      true,
    );

    const single = decodeWorkflowGroup(
      JSON.stringify({
        v: 3,
        my: { n: "Sand", f: "", s: MY },
        b: [{ op: { n: "Zard", f: "", s: OPP }, t: [[0, "01|23", "012|3"]] }],
      }),
    );
    expect(single.ok).toBe(true);
    if (single.ok) {
      expect(single.warnings.length).toBeGreaterThan(0);
      expect(single.warnings.some((w) => w.startsWith("vs "))).toBe(false);
    }
  });

  it("carries an opponent that has no plan yet", () => {
    const lined_up = [
      boards[0],
      { opp: team("Trick Room", THIRD), nodes: [] as TurnNode[] },
    ];
    const result = decodeWorkflowGroup(encodeGroup(setup.my, lined_up));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.boards).toHaveLength(2);
    // Empty turn list = "lined up, not planned yet", same as storage's nodes: []
    expect(result.boards[1].nodes).toEqual([]);
    expect(result.boards[1].opp.parsed.map((m) => m.species)).toEqual(THIRD);
    expect(result.warnings).toEqual([]);
  });

  it("rejects the whole paste when one opponent is unreadable", () => {
    const bad = JSON.stringify({
      v: 3,
      my: { n: "Sand", f: "", s: MY },
      b: [
        { op: { n: "Zard", f: "", s: OPP }, t: [[0, "01|23", "01|23"]] },
        {
          op: { n: "Fake", f: "", s: ["Torkoal", "Newmon2027"] },
          t: [[0, "01|23", "01"]],
        },
      ],
    });
    const result = decodeWorkflowGroup(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Newmon2027");
  });

  it("rejects a group when any board is structurally broken", () => {
    const base = { v: 3, my: { n: "Sand", f: "", s: MY } };
    const good = {
      op: { n: "Zard", f: "", s: OPP },
      t: [[0, "01|23", "01|23"]],
    };
    // second board's turn list holds a non-node
    expect(
      decodeWorkflowGroup(
        JSON.stringify({ ...base, b: [good, { ...good, t: ["nope"] }] }),
      ),
    ).toMatchObject({ ok: false });
    // second board has no roster
    expect(
      decodeWorkflowGroup(
        JSON.stringify({
          ...base,
          b: [good, { op: { n: "X", f: "", s: [] }, t: good.t }],
        }),
      ),
    ).toMatchObject({ ok: false });
  });
});

describe("document identity (the `g` stamp)", () => {
  const boards = [{ opp: setup.opp, nodes }];

  it("writes `g` only when asked, so the dirty-check fingerprint is unchanged", () => {
    expect(JSON.parse(encodeGroup(setup.my, boards)).g).toBeUndefined();
    // Same board, two StoredTeam objects with different ids: still identical.
    expect(encodeWorkflow(setup, nodes)).toBe(
      encodeWorkflow({ ...setup, my: { ...setup.my, id: "other" } }, nodes),
    );
    expect(
      JSON.parse(encodeGroup(setup.my, boards, { docId: "team-1" })).g,
    ).toBe("team-1");
  });

  it("round-trips the stamp, and reports its absence as null", () => {
    const stamped = decodeWorkflowGroup(
      encodeGroup(setup.my, boards, { docId: "team-1" }),
    );
    expect(stamped).toMatchObject({ ok: true, docId: "team-1" });
    expect(decodeWorkflowGroup(encodeGroup(setup.my, boards))).toMatchObject({
      ok: true,
      docId: null,
    });
  });

  it("reads a stamped document as a v3 reader that ignores `g` would", () => {
    const withStamp = decodeWorkflowGroup(
      encodeGroup(setup.my, boards, { docId: "team-1" }),
    );
    const without = decodeWorkflowGroup(encodeGroup(setup.my, boards));
    // Node ids are minted per decode, so compare everything else.
    const shape = (r: typeof withStamp) =>
      r.ok &&
      r.boards[0].nodes.map(({ my, opp, turn, note }) => ({
        my,
        opp,
        turn,
        note,
      }));
    expect(shape(withStamp)).toEqual(shape(without));
  });

  it("has no stamp on v2 or legacy documents", () => {
    expect(
      decodeWorkflowGroup(
        JSON.stringify({
          v: 2,
          my: { n: "Sand", f: "", s: MY },
          op: { n: "Zard", f: "", s: OPP },
          t: [[0, "01|23", "01|23"]],
        }),
      ),
    ).toMatchObject({ ok: true, docId: null });
    expect(
      decodeWorkflowGroup(JSON.stringify({ version: 1, setup, nodes: [] })),
    ).toMatchObject({ ok: true, docId: null });
  });
});
