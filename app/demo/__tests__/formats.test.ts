import { describe, expect, it } from "vitest";
import { FORMATS } from "../formats";
import { SAMPLE_FORMAT } from "../demo-data";

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

describe("the sample teams' regulation", () => {
  /**
   * The regression this guards. `PRESETS` used to take `FORMATS[0]`, so the
   * eight built-in teams claimed whichever regulation was current — the moment
   * M-C shipped, eight real M-B pastes would have relabelled themselves. A
   * sample's regulation describes the paste, so it moves only when the sample
   * set is replaced.
   */
  it("is stated independently of whatever regulation is current", () => {
    expect(SAMPLE_FORMAT).toBe("[Gen 9 Champions] VGC 2026 Reg M-B");
    expect(SAMPLE_FORMAT).not.toBe(FORMATS[0]);
  });

  it("is one the format dropdown can still show", () => {
    expect(FORMATS).toContain(SAMPLE_FORMAT);
  });
});
