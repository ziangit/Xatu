import { describe, expect, it } from "vitest";
import {
  formeCandidates,
  matchKey,
  matchSpecies,
  rosterCode,
  sharedSpecies,
} from "../roster";

const SAND = [
  "Tyranitar",
  "Excadrill",
  "Milotic",
  "Gholdengo",
  "Sinistcha",
  "Staraptor",
];

describe("matchKey", () => {
  it("is tolerant of case, spacing and punctuation", () => {
    expect(matchKey("  Tyranitar ")).toBe("tyranitar");
    expect(matchKey("Ting-Lu")).toBe("ting-lu");
    expect(matchKey("Farigiraf")).toBe(matchKey("farigiraf"));
  });

  it("collapses Mega formes, which team preview never shows", () => {
    // 23 distinct Mega-named species appear in the VGCPastes corpus; a reader
    // sees Garchomp at preview, so the stored key has to say Garchomp.
    expect(matchKey("Garchomp-Mega")).toBe("garchomp");
    expect(matchKey("Charizard-Mega-Y")).toBe("charizard");
    expect(matchKey("Raichu-Mega-X")).toBe("raichu");
    // Mega-Z exists too (Absol, Garchomp, Lucario) — no corpus team runs one,
    // but the species type-ahead offers them, so they must collapse as well.
    expect(matchKey("Garchomp-Mega-Z")).toBe("garchomp");
  });

  it("keeps formes that ARE visible at preview", () => {
    // The corpus holds Floette-Eternal *and* Floette-Mega — blanket
    // hyphen-stripping would merge them.
    expect(matchKey("Floette-Eternal")).toBe("floette-eternal");
    expect(matchKey("Floette-Mega")).toBe("floette");
    expect(matchKey("Ninetales-Alola")).toBe("ninetales-alola");
    expect(matchKey("Tauros-Paldea-Aqua")).toBe("tauros-paldea-aqua");
    expect(matchKey("Rotom-Wash")).toBe("rotom-wash");
    expect(matchKey("Urshifu-Rapid-Strike")).toBe("urshifu-rapid-strike");
  });

  it("never strips a name down to nothing", () => {
    expect(matchKey("Mega")).toBe("mega");
  });
});

describe("rosterCode", () => {
  it("is order-independent — the same six is the same code", () => {
    const shuffled = [...SAND].reverse();
    expect(rosterCode(shuffled)).toBe(rosterCode(SAND));
    // 108 of the 712 catalogue teams differ from another only in paste order.
    expect(rosterCode(SAND).split("|")).toHaveLength(6);
  });

  it("normalises before comparing, so a Mega paste matches its base", () => {
    const mega = SAND.map((s) => (s === "Tyranitar" ? "Tyranitar-Mega" : s));
    expect(rosterCode(mega)).toBe(rosterCode(SAND));
  });

  it("dedupes, so a doubled species doesn't change identity", () => {
    expect(rosterCode(["Milotic", "Milotic", "Tyranitar"])).toBe(
      "milotic|tyranitar",
    );
  });

  it("distinguishes teams that differ by one Pokémon", () => {
    const swapped = [...SAND.slice(0, 5), "Incineroar"];
    expect(rosterCode(swapped)).not.toBe(rosterCode(SAND));
  });

  it("uses a separator no species key can contain", () => {
    // Keys are [a-z0-9-] only, so "|" can always be split back apart.
    expect(matchSpecies(SAND).every((k) => /^[a-z0-9-]+$/.test(k))).toBe(true);
    expect(rosterCode(SAND).split("|")).toEqual(matchSpecies(SAND));
  });

  it("is empty for an empty roster", () => {
    expect(rosterCode([])).toBe("");
    expect(matchSpecies([])).toEqual([]);
  });
});

describe("sharedSpecies", () => {
  it("counts the overlap a partial search ranks by", () => {
    const fourShared = [...SAND.slice(0, 4), "Incineroar", "Rillaboom"];
    expect(sharedSpecies(SAND, fourShared)).toBe(4);
    expect(sharedSpecies(SAND, SAND)).toBe(6);
    expect(sharedSpecies(SAND, ["Torkoal", "Ursaluna"])).toBe(0);
  });

  it("counts through normalisation and order", () => {
    const mega = ["Ursaluna", "Tyranitar-Mega", "Excadrill"].reverse();
    expect(sharedSpecies(SAND, mega)).toBe(2);
  });
});

describe("formeCandidates", () => {
  it("stays broader than matchKey — it generates possibilities", () => {
    expect(formeCandidates("Urshifu-Rapid-Strike")).toEqual([
      "urshifu-rapid-strike",
      "urshifu-rapid",
      "urshifu",
    ]);
    // matchKey keeps the distinction; candidates offer the base as well.
    expect(matchKey("Urshifu-Rapid-Strike")).toBe("urshifu-rapid-strike");
  });
});
