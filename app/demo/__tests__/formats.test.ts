import { describe, expect, it } from "vitest";
import { FORMATS } from "../formats";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { importTeamText } from "@/lib/team";
import { SAMPLE_TEAMS } from "../demo-data";

/**
 * These strings are lookup keys, not labels: `catalogue.ts` filters
 * `.eq("regulation", …)` on them and the VGCPastes ingest writes rows under
 * them. A drifted one doesn't throw — it returns nothing, quietly, forever.
 * (`scripts/vgcpastes/ingest.mjs` imports this same list and refuses to run if
 * its own tables name a regulation that isn't here.)
 */
describe("FORMATS", () => {
  it("lists each regulation once", () => {
    expect(new Set(FORMATS).size).toBe(FORMATS.length);
  });

  it("is verbatim Showdown format names", () => {
    // "[Gen 9 Champions] VGC 2026 Reg M-C" — copied from Showdown's own format
    // list, never typed from memory, because the ingest matches on them.
    for (const f of FORMATS) expect(f).toMatch(/^\[Gen \d[^\]]*\] .+/);
  });

  it("leads with the current regulation — FORMATS[0] is the import default", () => {
    expect(FORMATS[0]).toBe("[Gen 9 Champions] VGC 2026 Reg M-C");
  });

  it("keeps regulations that have left the ladder", () => {
    // Saved teams and published guides reference them; dropping one would
    // orphan every team tagged with it.
    expect(FORMATS).toContain("[Gen 9 Champions] VGC 2026 Reg M-B");
    expect(FORMATS).toContain("[Gen 9] SV VGC Reg I");
  });
});

describe("the sample teams", () => {
  /**
   * The regression this guards. `PRESETS` used to take `FORMATS[0]`, so the
   * built-in teams claimed whichever regulation was current — the moment M-C
   * shipped, eight real M-B pastes would have relabelled themselves M-C with
   * nothing to notice.
   *
   * The samples happen to be M-C right now, so no comparison of *values* can
   * tell a stated regulation from an inherited one. The rule is about wiring,
   * so it is checked as wiring: the page must not reach for `FORMATS[0]`.
   */
  it("are not wired to whatever regulation is current", () => {
    // `PRESETS` moved to `team-picker.tsx` when the builder merged into
    // /matchups; the rule travelled with it.
    const page = readFileSync(
      join(import.meta.dirname, "..", "team-picker.tsx"),
      "utf8",
    );
    // Comments stripped first: the rule is about what the code does, and the
    // comment explaining the rule naturally names the thing it forbids.
    const code = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/FORMATS\s*\[\s*0\s*\]/);
  });

  it("each state a regulation the format dropdown can show", () => {
    // A sample tagged with a regulation `FORMATS` has dropped would render a
    // team the picker cannot represent — and, since the list's tabs are derived
    // from `FORMATS`, would be unreachable behind every one of them.
    for (const sample of SAMPLE_TEAMS) {
      expect(FORMATS, sample.label).toContain(sample.format);
    }
  });

  it("span more than one regulation", () => {
    // The whole point of the picker's regulation tabs: a rotation does not make
    // the previous regulation's teams worthless, so both sets stay available.
    const regs = new Set(SAMPLE_TEAMS.map((s) => s.format));
    expect(regs.size).toBeGreaterThan(1);
    for (const reg of regs) {
      expect(
        SAMPLE_TEAMS.filter((s) => s.format === reg).length,
        `${reg} has no samples`,
      ).toBeGreaterThan(0);
    }
  });

  /**
   * The load-bearing rule for a sample: it is a real pasted team, stored as the
   * verbatim export, so picking one is indistinguishable from pasting the same
   * link. Hand-trimming EVs or the trailing whitespace Showdown emits breaks
   * that silently — the team still works, it just stops being the paste.
   */
  it("are verbatim pastes: six Pokémon, byte-identical on re-export", () => {
    expect(SAMPLE_TEAMS.length).toBeGreaterThan(0);
    for (const sample of SAMPLE_TEAMS) {
      const parsed = importTeamText(sample.text);
      expect(parsed, `${sample.label} does not parse`).toBeTruthy();
      expect(
        parsed!.parsed.map((m) => m.species),
        sample.label,
      ).toHaveLength(6);
      expect(parsed!.exportText, `${sample.label} re-exports differently`).toBe(
        sample.text,
      );
    }
  });

  /**
   * Provenance is a comment, which means nothing type-checks it and a scripted
   * edit can silently detach one — that happened: inserting a team between the
   * next entry's comments and its object left one team carrying two titles and
   * the following team carrying none. Comments are the only record of where a
   * paste came from, so they get checked.
   */
  it("each carry exactly one title and pokepaste URL above them", () => {
    const src = readFileSync(
      join(import.meta.dirname, "..", "demo-data.ts"),
      "utf8",
    ).split("\n");
    const labels = src
      .map((line, i) => (/^\s+label: "/.test(line) ? i : -1))
      .filter((i) => i >= 0);
    expect(labels).toHaveLength(SAMPLE_TEAMS.length);
    for (const i of labels) {
      const name = /label: "([^"]+)"/.exec(src[i])![1];
      const comments: string[] = [];
      for (let c = i - 2; c >= 0 && src[c].trim().startsWith("//"); c--) {
        comments.unshift(src[c].trim());
      }
      expect(
        comments,
        `${name}: expected a title line and a URL line`,
      ).toHaveLength(2);
      expect(
        comments.filter((l) => l.includes("pokepast.es")),
        `${name}: expected exactly one pokepaste URL`,
      ).toHaveLength(1);
    }
  });

  it("have a label short enough for a picker row", () => {
    for (const sample of SAMPLE_TEAMS) {
      expect(sample.label.length, sample.label).toBeLessThanOrEqual(28);
    }
  });
});
