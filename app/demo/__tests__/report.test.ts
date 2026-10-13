import { describe, expect, it } from "vitest";
import {
  flattenReportText,
  isEmptyReport,
  parseReportText,
  pruneReport,
  reportKey,
} from "../report";

describe("report prose", () => {
  it("turns a known species token into a sprite segment", () => {
    expect(parseReportText("Lead :Incineroar: here")).toEqual([
      { kind: "text", text: "Lead " },
      { kind: "mon", species: "Incineroar" },
      { kind: "text", text: " here" },
    ]);
  });

  it("handles names with spaces and hyphens", () => {
    for (const name of ["Flutter Mane", "Urshifu-Rapid-Strike"]) {
      expect(parseReportText(`:${name}:`)).toEqual([
        { kind: "mon", species: name },
      ]);
    }
  });

  it("leaves ordinary colons alone, so there is no escape syntax", () => {
    // The whole reason tokens resolve against the dex rather than by shape:
    // people write prose with colons in it.
    const prose = "Note: bring Incineroar: it walls them.";
    expect(parseReportText(prose)).toEqual([{ kind: "text", text: prose }]);
  });

  it("is case-insensitive about the species, like the rest of the app", () => {
    expect(parseReportText(":incineroar:")).toEqual([
      { kind: "mon", species: "Incineroar" },
    ]);
  });

  it("never loses characters", () => {
    const prose = "a :Incineroar: b :nonsense: c";
    expect(flattenReportText(prose)).toBe("a Incineroar b :nonsense: c");
  });
});

describe("reportKey", () => {
  it("is the roster, so it survives publishing", () => {
    // Publishing round-trips through `encodeGroup`, and decoding mints a new
    // uuid per team — so a team id keyed report renders nowhere. The six
    // species do survive.
    const six = [
      "Incineroar",
      "Rillaboom",
      "Urshifu",
      "Amoonguss",
      "Chi-Yu",
      "Flutter Mane",
    ];
    const a = { parsed: six.map((species) => ({ species })) };
    const b = { parsed: [...six].reverse().map((species) => ({ species })) };
    expect(reportKey(a)).toBe(reportKey(b));
    expect(reportKey(a)).not.toBe(
      reportKey({ parsed: [{ species: "Pikachu" }] }),
    );
  });
});

describe("pruneReport", () => {
  it("drops text whose matchup is gone", () => {
    const report = { before: { keep: "stays", gone: "dropped" } };
    expect(pruneReport(report, ["keep"])).toEqual({
      before: { keep: "stays" },
    });
  });

  it("drops blank slots rather than storing empty strings", () => {
    expect(
      pruneReport({ before: { a: "   " }, outro: "\n" }, ["a"]),
    ).toBeNull();
  });

  it("returns null when nothing would render, so the column stays null", () => {
    expect(pruneReport(null, ["a"])).toBeNull();
    expect(pruneReport({}, ["a"])).toBeNull();
    expect(isEmptyReport({ before: {}, outro: "" })).toBe(true);
  });

  it("keeps an outro with no matchup text", () => {
    expect(pruneReport({ outro: "thanks for reading" }, [])).toEqual({
      outro: "thanks for reading",
    });
  });
});
