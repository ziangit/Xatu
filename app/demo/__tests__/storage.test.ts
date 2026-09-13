import { beforeEach, describe, expect, it } from "vitest";
import { importTeamText } from "@/lib/team";
import {
  loadMatchups,
  loadSavedTeams,
  rememberTeam,
  loadSetup,
  renameTeam,
  saveSetup,
  upsertMatchup,
  type SavedMatchup,
  type StoredTeam,
} from "../storage";

/**
 * `storage.ts` reads `window.localStorage` behind a `typeof window` guard, so
 * the suite's node environment needs a stand-in. A Map is enough — nothing here
 * depends on quota, events or JSON edge cases.
 */
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  },
};

/** One Rillaboom, so the only difference between versions is its fourth move. */
const paste = (move: string) => `Rillaboom @ Assault Vest  
Ability: Grassy Surge  
Level: 50  
EVs: 252 HP / 252 Atk  
Adamant Nature  
- Fake Out  
- Grassy Glide  
- Wood Hammer  
- ${move}  
`;

const team = (move: string, name = "Sand"): StoredTeam => {
  const parsed = importTeamText(paste(move))!;
  return {
    id: crypto.randomUUID(),
    name,
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
    exportText: parsed.exportText,
    parsed: parsed.parsed,
  };
};
const fourthMove = (t: StoredTeam) => t.parsed[0].moves?.[3];

/**
 * A genuinely different team. It must not share a species list with the one
 * above: `rememberTeam` identifies teams by their roster, so two fixtures built
 * from the same Pokémon are *correctly* merged into one — which quietly makes
 * any assertion about "the other team" meaningless.
 */
const otherTeam = (name: string): StoredTeam => {
  const parsed = importTeamText(`Incineroar @ Safety Goggles  
Ability: Intimidate  
Level: 50  
EVs: 252 HP / 4 Atk  
Careful Nature  
- Fake Out  
- Knock Off  
- Parting Shot  
- Will-O-Wisp  
`)!;
  return {
    id: crypto.randomUUID(),
    name,
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
    exportText: parsed.exportText,
    parsed: parsed.parsed,
  };
};

/** A team as it arrives inside a shared document: roster only, no sets. */
const asDocumentTeam = (t: StoredTeam): StoredTeam => ({
  ...t,
  id: crypto.randomUUID(),
  exportText: t.parsed.map((m) => m.species).join(", "),
  parsed: t.parsed.map((m) => ({ species: m.species, moves: [] })),
});

const board = (my: StoredTeam, opp: StoredTeam): SavedMatchup => ({
  id: "board-1",
  name: `${my.name} vs ${opp.name}`,
  setup: { my, opp },
  nodes: [],
  savedAt: new Date(0).toISOString(),
});

beforeEach(() => store.clear());

describe("re-importing an edited team", () => {
  /**
   * The regression. Export length used to decide which copy survived, so
   * shortening a move ("High Horsepower" → "Superpower") made the *stored* copy
   * longer and therefore the winner: the edit vanished, and re-importing could
   * never fix it because the same comparison ran again.
   */
  it("keeps the edit even when the new export is shorter", () => {
    const before = team("High Horsepower");
    const after = team("Superpower");
    expect(after.exportText.length).toBeLessThan(before.exportText.length);

    rememberTeam(before, { authoritative: true });
    const back = rememberTeam(after, { authoritative: true });

    expect(fourthMove(back)).toBe("Superpower");
    expect(fourthMove(loadSavedTeams()[0])).toBe("Superpower");
  });

  it("keeps the team's identity, so its group doesn't fork", () => {
    const first = rememberTeam(team("High Horsepower"), {
      authoritative: true,
    });
    const second = rememberTeam(team("Superpower"), { authoritative: true });
    expect(second.id).toBe(first.id);
    expect(loadSavedTeams()).toHaveLength(1);
  });

  /**
   * A board keeps its own copy of both teams, so the library alone is not
   * enough — this is why deleting the team and re-importing still showed the
   * old move: a saved board kept handing it back.
   */
  it("updates boards that already reference the team", () => {
    const my = rememberTeam(team("High Horsepower", "Mine"), {
      authoritative: true,
    });
    const opp = rememberTeam(team("Wood Hammer", "Theirs"), {
      authoritative: true,
    });
    upsertMatchup(board(my, opp));

    rememberTeam(
      { ...team("Superpower"), name: "Mine" },
      {
        authoritative: true,
      },
    );

    expect(fourthMove(loadMatchups()[0].setup.my)).toBe("Superpower");
    // The opponent is a different team and must not be touched.
    expect(loadMatchups()[0].setup.opp.id).toBe(opp.id);
  });

  it("leaves the plan alone — a recorded move is what you intended", () => {
    const my = rememberTeam(team("High Horsepower"), { authoritative: true });
    const opp = rememberTeam(otherTeam("Theirs"), { authoritative: true });
    const withPlan = {
      ...board(my, opp),
      nodes: [
        {
          id: "n1",
          turn: 1,
          parentId: null,
          my: {
            front: ["Rillaboom"],
            back: [],
            fainted: [],
            moves: { Rillaboom: "High Horsepower" },
          },
          opp: { front: ["Incineroar"], back: [], fainted: [] },
        },
      ],
    } as unknown as SavedMatchup;
    upsertMatchup(withPlan);

    rememberTeam(team("Superpower"), { authoritative: true });

    expect(loadMatchups()[0].nodes[0].my.moves?.Rillaboom).toBe(
      "High Horsepower",
    );
  });
});

describe("a team arriving in a shared document", () => {
  /**
   * The behaviour the length rule was protecting, and which must survive: a
   * document carries bare rosters, so importing one must not replace real sets
   * with a species list.
   */
  it("never overwrites real sets with its bare roster", () => {
    const mine = rememberTeam(team("High Horsepower"), { authoritative: true });
    const fromDoc = asDocumentTeam(mine);

    const back = rememberTeam(fromDoc);

    expect(fourthMove(back)).toBe("High Horsepower");
    expect(back.exportText).toBe(mine.exportText);
  });
});

describe("renameTeam", () => {
  it("renames in the library and in every board that shows the name", () => {
    const my = rememberTeam(team("Superpower", "Sand"), {
      authoritative: true,
    });
    const opp = rememberTeam(otherTeam("Incineroar + Rillaboom"), {
      authoritative: true,
    });
    upsertMatchup(board(my, opp));

    const renamed = renameTeam(opp.id, "  Trick Room  ");

    expect(renamed?.name).toBe("Trick Room");
    expect(loadMatchups()[0].setup.opp.name).toBe("Trick Room");
    expect(loadMatchups()[0].setup.my.name).toBe("Sand");
    // The stored matchup name is data written once; it is deliberately not
    // rewritten (nothing displays it).
    expect(loadMatchups()[0].name).toBe("Sand vs Incineroar + Rillaboom");
  });

  it("also updates the in-progress setup the board reads on open", () => {
    const my = rememberTeam(team("Superpower", "Sand"), {
      authoritative: true,
    });
    const opp = rememberTeam(otherTeam("Theirs"), { authoritative: true });
    saveSetup({ my, opp });

    renameTeam(my.id, "Y Sand");

    expect(loadSetup()?.my.name).toBe("Y Sand");
    expect(loadSetup()?.opp.name).toBe("Theirs");
  });

  it("ignores a blank or unchanged name", () => {
    const t = rememberTeam(team("Superpower", "Sand"), { authoritative: true });
    expect(renameTeam(t.id, "   ")).toBeNull();
    expect(renameTeam(t.id, "Sand")).toBeNull();
    expect(loadSavedTeams()[0].name).toBe("Sand");
  });
});
