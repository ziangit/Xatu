import { describe, expect, it } from "vitest";
import {
  SPECIES_NAMES,
  canonicalSpecies,
  isNamedSpecies,
  searchSpecies,
  speciesKey,
} from "../index";

const names = (query: string, limit?: number) =>
  searchSpecies(query, limit).map((m) => m.name);

describe("speciesKey", () => {
  it("folds case, punctuation and spacing", () => {
    expect(speciesKey("Iron Hands")).toBe("ironhands");
    expect(speciesKey("Farfetch'd")).toBe("farfetchd");
    expect(speciesKey("Type: Null")).toBe("typenull");
    expect(speciesKey("Mr. Mime")).toBe("mrmime");
    expect(speciesKey("Lycanroc-Dusk")).toBe("lycanrocdusk");
  });

  it("folds accents, so an ASCII keyboard reaches every name", () => {
    expect(speciesKey("Flabébé")).toBe("flabebe");
    expect(speciesKey("Flabebe")).toBe(speciesKey("Flabébé"));
  });
});

describe("searchSpecies", () => {
  it("puts the plain forme first — the whole point of the ranking", () => {
    // "pika" used to offer sixteen Pikachus; the costumes are out of the list
    // entirely now, so there is exactly one thing it can mean.
    expect(names("pika")).toEqual(["Pikachu"]);
    expect(names("charizard")[0]).toBe("Charizard");
    // Mega-Z is a real forme family in this dex (Absol, Garchomp, Lucario).
    expect(names("garchomp")).toEqual([
      "Garchomp",
      "Garchomp-Mega",
      "Garchomp-Mega-Z",
    ]);
  });

  it("matches a partial name from the start", () => {
    expect(names("aerod")).toContain("Aerodactyl");
    expect(names("tyranit")).toContain("Tyranitar");
  });

  it("matches across spaces and punctuation", () => {
    expect(names("iron h")[0]).toBe("Iron Hands");
    expect(names("mr m")).toContain("Mr. Mime");
    expect(names("flabebe")[0]).toBe("Flabébé");
  });

  it("finds a forme by its own word", () => {
    expect(names("dusk", 20)).toContain("Lycanroc-Dusk");
    expect(names("hisui", 20)).toContain("Zorua-Hisui");
  });

  it("ranks exact over prefix over forme-word over substring", () => {
    const ranked = searchSpecies("mega", 30);
    expect(ranked[0].rank).toBeLessThanOrEqual(ranked[ranked.length - 1].rank);
    // "Meganium" is a name prefix; "Absol-Mega" only matches on its forme word.
    const meganium = ranked.find((m) => m.name === "Meganium");
    const absol = ranked.find((m) => m.name === "Absol-Mega");
    if (meganium && absol) expect(meganium.rank).toBeLessThan(absol.rank);
  });

  it("is empty for an empty or punctuation-only query", () => {
    expect(searchSpecies("")).toEqual([]);
    expect(searchSpecies("   ")).toEqual([]);
    expect(searchSpecies("-")).toEqual([]);
  });

  it("returns nothing rather than guessing at a name that isn't there", () => {
    expect(searchSpecies("pikablu")).toEqual([]);
    expect(searchSpecies("zzzz")).toEqual([]);
  });

  it("carries what a Showdown-style row needs to render", () => {
    expect(searchSpecies("blastoisemega")[0]).toEqual({
      name: "Blastoise-Mega",
      base: "Blastoise",
      forme: "Mega",
      types: ["Water"],
      rank: 0,
    });
    const gholdengo = searchSpecies("gholdengo")[0];
    expect(gholdengo.types).toEqual(["Steel", "Ghost"]);
    expect(gholdengo.forme).toBe("");
    // A hyphen in a base species name is not a forme boundary.
    expect(searchSpecies("ting-lu")[0]).toMatchObject({
      name: "Ting-Lu",
      base: "Ting-Lu",
      forme: "",
    });
    // Multi-word formes survive the round trip through `base|forme|types`.
    expect(searchSpecies("taurospaldeaaqua")[0]).toMatchObject({
      name: "Tauros-Paldea-Aqua",
      base: "Tauros",
      forme: "Paldea-Aqua",
    });
  });

  it("honours the limit", () => {
    expect(searchSpecies("a", 3)).toHaveLength(3);
    expect(searchSpecies("char", 2)).toHaveLength(2);
    // …and returns fewer than the limit rather than padding it.
    expect(searchSpecies("pika", 5)).toHaveLength(1);
  });
});

describe("the list itself", () => {
  it("covers the Champions-era Megas the samples use", () => {
    for (const name of [
      "Staraptor-Mega",
      "Delphox-Mega",
      "Froslass-Mega",
      "Scovillain-Mega",
      "Tyranitar-Mega",
      "Aerodactyl-Mega",
      "Charizard-Mega-Y",
      "Maushold-Four",
    ])
      expect(isNamedSpecies(name)).toBe(true);
  });

  it("drops what a doubles preview can never show", () => {
    expect(isNamedSpecies("Charizard-Gmax")).toBe(false);
    expect(isNamedSpecies("Raticate-Alola-Totem")).toBe(false);
    expect(isNamedSpecies("MissingNo.")).toBe(false);
  });

  it("drops paint jobs — same Pokémon, different look", () => {
    for (const name of [
      "Pikachu-Libre",
      "Pikachu-Alola",
      "Unown-B",
      "Alcremie-Ruby-Cream",
      "Furfrou-Star",
      "Vivillon-Marine",
    ])
      expect(isNamedSpecies(name)).toBe(false);
  });

  it("keeps formes that are a different Pokémon to play against", () => {
    // The line is what the dex itself calls cosmetic, not what looks similar:
    // Maushold-Four and Vivillon-Fancy are `otherFormes` and stay.
    for (const name of [
      "Maushold-Four",
      "Squawkabilly-Blue",
      "Vivillon-Fancy",
      "Minior-Meteor",
      "Genesect-Douse",
      "Basculegion-F",
      "Indeedee-F",
      "Toxtricity-Low-Key",
    ])
      expect(isNamedSpecies(name)).toBe(true);
  });

  it("has no duplicate names", () => {
    expect(new Set(SPECIES_NAMES).size).toBe(SPECIES_NAMES.length);
  });

  it("canonicalises a loosely typed name", () => {
    expect(canonicalSpecies("pikachu")).toBe("Pikachu");
    expect(canonicalSpecies("IRONHANDS")).toBe("Iron Hands");
    expect(canonicalSpecies("garchompmega")).toBe("Garchomp-Mega");
    expect(canonicalSpecies("Pikablu")).toBeNull();
  });
});
