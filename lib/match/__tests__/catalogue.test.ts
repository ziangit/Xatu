import { describe, expect, it } from "vitest";
import { rankCatalogueMatches, type CatalogueRow } from "../catalogue";
import { matchSpecies } from "../roster";

/** A catalogue row as the ingest writes it: display order kept, keys derived. */
const row = (
  species: string[],
  extra: Partial<CatalogueRow> = {},
): CatalogueRow => {
  const keys = matchSpecies(species);
  return {
    species,
    match_species: keys,
    roster_code: keys.join("|"),
    name: species.slice(0, 2).join(" + "),
    ...extra,
  };
};

const SAND = [
  "Tyranitar",
  "Excadrill",
  "Sinistcha",
  "Milotic",
  "Gholdengo",
  "Staraptor",
];
const ZARD = [
  "Charizard",
  "Garchomp",
  "Whimsicott",
  "Sylveon",
  "Kingambit",
  "Basculegion",
];

describe("rankCatalogueMatches", () => {
  it("finds teams sharing at least the threshold, and counts the overlap", () => {
    const rows = [row(SAND), row(ZARD)];
    const found = rankCatalogueMatches(SAND.slice(0, 4), rows);
    expect(found).toHaveLength(1);
    expect(found[0].shared).toBe(4);
    expect(found[0].observed).toBe(4);
    expect(found[0].species).toEqual(SAND);
  });

  it("puts the closer team first — 6/6 above 5/6 above 4/6", () => {
    const five = [...SAND.slice(0, 5), "Incineroar"];
    const four = [...SAND.slice(0, 4), "Incineroar", "Rillaboom"];
    const found = rankCatalogueMatches(SAND, [row(four), row(SAND), row(five)]);
    expect(found.map((m) => m.shared)).toEqual([6, 5, 4]);
  });

  it("returns one row per roster, not per paste", () => {
    // The corpus really is like this: the most-copied six appears 30 times.
    const copies = Array.from({ length: 30 }, (_, i) =>
      row(SAND, { name: `copy ${i}` }),
    );
    const found = rankCatalogueMatches(SAND, copies);
    expect(found).toHaveLength(1);
    expect(found[0].pastes).toBe(30);
  });

  it("prefers a featured paste as the row's representative", () => {
    const found = rankCatalogueMatches(SAND, [
      row(SAND, { name: "some ladder team" }),
      row(SAND, { name: "the archetype", featured: true, category: "Sand" }),
    ]);
    expect(found[0].team.name).toBe("the archetype");
    expect(found[0].team.category).toBe("Sand");
  });

  it("breaks a tie by how many people published the roster", () => {
    const other = [...SAND.slice(0, 4), "Incineroar", "Rillaboom"];
    const found = rankCatalogueMatches(SAND.slice(0, 4), [
      row(other, { name: "one-off" }),
      ...Array.from({ length: 3 }, () => row(SAND, { name: "popular" })),
    ]);
    expect(found.map((m) => [m.team.name, m.pastes])).toEqual([
      ["popular", 3],
      ["one-off", 1],
    ]);
  });

  it("matches through in-battle formes, both directions", () => {
    // A paste naming Garchomp-Mega is the same team preview as Garchomp.
    const mega = ZARD.map((s) => (s === "Garchomp" ? "Garchomp-Mega" : s));
    const observed = ZARD.slice(0, 4);
    expect(rankCatalogueMatches(observed, [row(mega)])[0].shared).toBe(4);
    expect(
      rankCatalogueMatches(
        observed.map((s) => (s === "Garchomp" ? "Garchomp-Mega" : s)),
        [row(ZARD)],
      )[0].shared,
    ).toBe(4);
  });

  it("marks which of the matched team's six were named", () => {
    const found = rankCatalogueMatches(SAND.slice(0, 4), [row(SAND)]);
    expect(found[0].matched).toEqual(SAND.slice(0, 4));
  });

  it("honours the caller's threshold and limit", () => {
    const three = [...SAND.slice(0, 3), "Incineroar", "Rillaboom", "Amoonguss"];
    expect(rankCatalogueMatches(SAND, [row(three)])).toEqual([]);
    expect(rankCatalogueMatches(SAND, [row(three)], { min: 3 })).toHaveLength(
      1,
    );
    const many = Array.from({ length: 5 }, (_, i) =>
      row([...SAND.slice(0, 4), `Filler${i}`, "Amoonguss"]),
    );
    expect(rankCatalogueMatches(SAND, many, { limit: 2 })).toHaveLength(2);
  });

  it("is empty for an empty observation rather than matching everything", () => {
    expect(rankCatalogueMatches([], [row(SAND)])).toEqual([]);
  });

  it("counts distinct species, so a repeated name can't inflate the score", () => {
    const found = rankCatalogueMatches(
      ["Tyranitar", "Tyranitar", "Excadrill", "Sinistcha", "Milotic"],
      [row(SAND)],
    );
    expect(found[0].shared).toBe(4);
    expect(found[0].observed).toBe(4);
  });
});
