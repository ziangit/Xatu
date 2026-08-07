import { describe, expect, it } from "vitest";
import { importTeamText } from "../import";

const EXPORT = `Charizard @ Charizardite Y
Ability: Blaze
Level: 50
- Heat Wave
- Solar Beam
- Air Slash
- Protect

Chompy (Garchomp) @ Life Orb
Ability: Rough Skin
- Dragon Claw
- Earthquake
`;

describe("importTeamText", () => {
  it("parses species, items, and moves from a Showdown export", () => {
    const team = importTeamText(EXPORT);
    expect(team).not.toBeNull();
    expect(team!.parsed.map((m) => m.species)).toEqual(["Charizard", "Garchomp"]);
    expect(team!.parsed[0].item).toBe("Charizardite Y");
    expect(team!.parsed[0].moves).toHaveLength(4);
    expect(team!.parsed[1].nickname).toBe("Chompy");
  });

  it("keeps the export text verbatim (lossless round-trip)", () => {
    expect(importTeamText(EXPORT)!.exportText).toBe(EXPORT);
  });

  it("returns null for unparseable text", () => {
    expect(importTeamText("")).toBeNull();
    expect(importTeamText("total garbage !!!")).toBeNull();
  });

  it("passes unknown species through untouched (lenient, not a legality check)", () => {
    const team = importTeamText("Newmon2027 @ Leftovers\n- Tackle\n");
    expect(team).not.toBeNull();
    expect(team!.parsed[0].species).toBe("Newmon2027");
  });
});
