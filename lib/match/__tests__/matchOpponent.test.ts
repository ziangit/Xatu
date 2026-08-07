import { describe, expect, it } from "vitest";
import type { Matchup, OpponentSpecies } from "../../schema";
import { matchOpponent } from "../matchOpponent";
import { yoshimapGuide } from "../../schema/fixtures/yoshimap-sand-staraptor";

function mu(
  id: string,
  species: [string, OpponentSpecies["tag"]][],
): Matchup {
  return {
    id,
    name: id,
    opponentSpecies: species.map(([s, tag]) => ({ species: s, tag })),
    plans: [],
  };
}

describe("matchOpponent", () => {
  it("ranks a full-overlap matchup first with score 1", () => {
    const a = mu("a", [
      ["Aerodactyl", "required"],
      ["Charizard", "required"],
      ["Garchomp", "common"],
    ]);
    const b = mu("b", [
      ["Torkoal", "required"],
      ["Hatterene", "common"],
    ]);
    const results = matchOpponent(
      ["Aerodactyl", "Charizard", "Garchomp", "Sylveon", "Kingambit", "Dragonite"],
      [b, a],
    );
    expect(results[0].matchup.id).toBe("a");
    expect(results[0].score).toBe(1);
  });

  it("matches fuzzily on partial (4-of-6-ish) overlap", () => {
    const a = mu("a", [
      ["Aerodactyl", "required"],
      ["Charizard", "required"],
      ["Garchomp", "common"],
      ["Sylveon", "common"],
      ["Kingambit", "optional"],
      ["Dragonite", "optional"],
    ]);
    // Observed team shares 4 of the 6 listed species.
    const results = matchOpponent(
      ["Aerodactyl", "Charizard", "Garchomp", "Sylveon", "Amoonguss", "Rillaboom"],
      [a],
    );
    expect(results).toHaveLength(1);
    expect(results[0].score).toBeGreaterThan(0.7);
  });

  it("weights ubiquitous species less than distinctive ones (IDF)", () => {
    // Incineroar appears in every matchup — pure noise. Torkoal only in `tr`.
    const zard = mu("zard", [
      ["Incineroar", "common"],
      ["Charizard", "common"],
    ]);
    const tr = mu("tr", [
      ["Incineroar", "common"],
      ["Torkoal", "common"],
    ]);
    const other = mu("other", [
      ["Incineroar", "common"],
      ["Dragonite", "common"],
    ]);
    // Observed: the shared species plus tr's distinctive one.
    const results = matchOpponent(["Incineroar", "Torkoal"], [zard, other, tr]);
    expect(results[0].matchup.id).toBe("tr");
    // The noise species alone scores well under half of tr's mass.
    const noiseOnly = matchOpponent(["Incineroar"], [zard, other, tr]);
    expect(noiseOnly[0].score).toBeLessThan(0.5);
  });

  it("required-tagged species dominate the score", () => {
    const a = mu("a", [
      ["Flutter Mane", "required"],
      ["Amoonguss", "common"],
      ["Rillaboom", "common"],
    ]);
    const requiredOnly = matchOpponent(["Flutter Mane"], [a]);
    const commonsOnly = matchOpponent(["Amoonguss", "Rillaboom"], [a]);
    // One required species outweighs both commons together.
    expect(requiredOnly[0].score).toBeGreaterThan(commonsOnly[0].score);
  });

  it("matches forme names against the base species the author wrote", () => {
    const a = mu("a", [["Charizard", "required"]]);
    const results = matchOpponent(["Charizard-Mega-Y"], [a]);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(1);
  });

  it("is case- and spacing-insensitive", () => {
    const a = mu("a", [["Flutter Mane", "required"]]);
    expect(matchOpponent(["fluttermane"], [a])[0].score).toBe(1);
  });

  it("returns at most 3 results, best first, and drops zero scores", () => {
    const matchups = [
      mu("w", [["Pelipper", "required"]]),
      mu("x", [["Charizard", "required"], ["Aerodactyl", "common"]]),
      mu("y", [["Charizard", "required"]]),
      mu("z", [["Charizard", "common"], ["Torkoal", "common"]]),
      mu("none", [["Farigiraf", "required"]]),
    ];
    const results = matchOpponent(["Charizard", "Aerodactyl", "Torkoal"], matchups);
    expect(results.length).toBeLessThanOrEqual(3);
    expect(results.map((r) => r.matchup.id)).not.toContain("w");
    expect(results.map((r) => r.matchup.id)).not.toContain("none");
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("finds the right matchup in the yoshimap fixture from a real-shaped paste", () => {
    const aeroTeam = ["Aerodactyl", "Charizard", "Garchomp", "Sylveon", "Kingambit", "Dragonite"];
    const trTeam = ["Farigiraf", "Torkoal", "Incineroar", "Kangaskhan", "Hatterene", "Ursaluna"];
    expect(matchOpponent(aeroTeam, yoshimapGuide.matchups)[0].matchup.id).toBe("mu-aero-zard");
    expect(matchOpponent(trTeam, yoshimapGuide.matchups)[0].matchup.id).toBe("mu-hard-tr");
  });
});
