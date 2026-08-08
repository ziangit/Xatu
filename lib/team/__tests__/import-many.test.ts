import { describe, expect, it } from "vitest";
import { importFlexibleTeam, importTeams, teamLabel } from "../import-many";

const SET_A = `Charizard @ Charizardite Y
Ability: Blaze
- Heat Wave
- Protect
`;

const SET_B = `Aerodactyl @ Focus Sash
Ability: Rock Head
- Rock Slide
- Tailwind
`;

describe("importFlexibleTeam", () => {
  it("accepts a bare comma-separated species list", () => {
    const team = importFlexibleTeam("Charizard, Kingambit, Sylveon");
    expect(team!.parsed.map((m) => m.species)).toEqual([
      "Charizard",
      "Kingambit",
      "Sylveon",
    ]);
  });

  it("caps a species list at six", () => {
    const team = importFlexibleTeam("A, B, C, D, E, F, G, H");
    expect(team!.parsed).toHaveLength(6);
  });

  it("falls through to the export parser, keeping the text verbatim but trimmed", () => {
    expect(importFlexibleTeam(SET_A)!.exportText).toBe(SET_A.trim());
  });

  it("returns null for empty input", () => {
    expect(importFlexibleTeam("   ")).toBeNull();
  });
});

describe("importTeams", () => {
  it("returns a single team unchanged, keeping the export verbatim", () => {
    const teams = importTeams(SET_A);
    expect(teams).toHaveLength(1);
    expect(teams[0].exportText).toBe(SET_A.trim());
  });

  it("splits a === delimited multi-team export and takes the header names", () => {
    const teams = importTeams(
      `=== [gen9vgc2026regmb] Sand Staraptor ===\n\n${SET_A}\n=== [gen9vgc2026regmb] Aero + Zard ===\n\n${SET_B}`,
    );
    expect(teams.map((t) => t.name)).toEqual(["Sand Staraptor", "Aero + Zard"]);
    expect(teams[0].parsed[0].species).toBe("Charizard");
    expect(teams[1].parsed[0].species).toBe("Aerodactyl");
  });

  it("names a headerless section after its first two species", () => {
    const teams = importTeams(`=== ===\n\n${SET_B}`);
    expect(teams[0].name).toBe("Aerodactyl");
  });

  it("treats one species list per line as one team each", () => {
    const teams = importTeams(
      "Aerodactyl, Charizard, Kingambit\nMiraidon, Iron Hands, Farigiraf",
    );
    expect(teams).toHaveLength(2);
    expect(teams.map((t) => t.name)).toEqual([
      "Aerodactyl + Charizard",
      "Miraidon + Iron Hands",
    ]);
  });

  it("does not split a single export into one team per line", () => {
    // Set lines contain "@" / ":" / "-", so the per-line rule must not fire.
    expect(importTeams(`${SET_A}\n${SET_B}`)).toHaveLength(1);
  });

  it("returns nothing for unparseable input", () => {
    expect(importTeams("   ")).toEqual([]);
    expect(importTeams("=== nothing here ===")).toEqual([]);
  });
});

describe("teamLabel", () => {
  it("uses the first two species", () => {
    expect(
      teamLabel([
        { species: "Torkoal", moves: [] },
        { species: "Lilligant-Hisui", moves: [] },
        { species: "Incineroar", moves: [] },
      ]),
    ).toBe("Torkoal + Lilligant-Hisui");
  });
});
