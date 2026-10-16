import { describe, expect, it } from "vitest";
import {
  flattenReportText,
  isEmptyReport,
  orderLikePublished,
  parseReportBlocks,
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

describe("orderLikePublished", () => {
  const key = (x: { k: string }) => x.k;
  it("keeps the published order even when a board was re-saved since", () => {
    // Newest-saved first, as groupByMyTeam hands them over.
    const resaved = [{ k: "c" }, { k: "a" }, { k: "b" }];
    expect(orderLikePublished(resaved, key, ["a", "b", "c"])).toEqual([
      { k: "a" },
      { k: "b" },
      { k: "c" },
    ]);
  });
  it("appends a new matchup after the ones already on the page", () => {
    expect(
      orderLikePublished([{ k: "new" }, { k: "b" }, { k: "a" }], key, [
        "a",
        "b",
      ]),
    ).toEqual([{ k: "a" }, { k: "b" }, { k: "new" }]);
  });
  it("drops nothing when a published opponent has since been deleted", () => {
    expect(orderLikePublished([{ k: "b" }], key, ["a", "b"])).toEqual([
      { k: "b" },
    ]);
  });
  it("is the identity for a first publish", () => {
    const first = [{ k: "y" }, { k: "x" }];
    expect(orderLikePublished(first, key, [])).toEqual(first);
  });
});

describe("report blocks", () => {
  const SET = [
    "Salamence @ Salamencite",
    "Ability: Intimidate",
    "EVs: 2 HP / 32 SpA / 32 Spe",
    "Timid Nature",
    "- Hyper Voice",
    "- Protect",
  ].join("\n");

  it("sets a pasted Showdown export apart from the prose around it", () => {
    const blocks = parseReportBlocks(
      `Here is the lead.\n\n${SET}\n\nIt hits hard.`,
    );
    expect(blocks.map((b) => b.kind)).toEqual(["prose", "set", "prose"]);
    // Verbatim: the block is a rendering decision, never a rewrite.
    expect(blocks[1]).toEqual({ kind: "set", lines: SET.split("\n") });
  });

  it("leaves a bullet list as prose", () => {
    // Every line matches the "- move" shape, so only the absence of a line
    // that *only* a set has keeps this out of a monospace block.
    const blocks = parseReportBlocks("- lead hard\n- keep Protect\n- win");
    expect(blocks.map((b) => b.kind)).toEqual(["prose"]);
  });

  it("needs more than one line to call something a set", () => {
    expect(parseReportBlocks("Timid Nature").map((b) => b.kind)).toEqual([
      "prose",
    ]);
  });

  it("lifts a sprite that is alone on its line out of the text flow", () => {
    const blocks = parseReportBlocks(`:Salamence:\n${SET}`);
    expect(blocks).toEqual([
      { kind: "art", species: "Salamence" },
      { kind: "set", lines: SET.split("\n") },
    ]);
  });

  it("keeps a sprite inside the sentence it was written in", () => {
    const blocks = parseReportBlocks("Lead :Incineroar: here");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("prose");
  });

  it("drops nothing: every line reaches some block", () => {
    const text = `intro\n\n:Salamence:\n${SET}\n\n- a\n- b\n\noutro`;
    const seen = parseReportBlocks(text)
      .flatMap((b) =>
        b.kind === "set"
          ? b.lines
          : b.kind === "art"
            ? []
            : b.segments.map((s) => (s.kind === "mon" ? s.species : s.text)),
      )
      .join("\n");
    for (const line of ["intro", "Ability: Intimidate", "- a", "outro"])
      expect(seen).toContain(line);
  });
});
