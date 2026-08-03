import { describe, expect, it } from "vitest";
import { GuideDraftSchema, validateDraft } from "../draft";
import { exportGuideText, importGuideText } from "../io";
import { yoshimapGuide } from "../fixtures/yoshimap-sand-staraptor";

describe("guide JSON round-trip (paste-first sharing)", () => {
  it("export → import yields an identical document", () => {
    const text = exportGuideText(yoshimapGuide);
    const result = importGuideText(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.guide).toEqual(yoshimapGuide);
  });

  it("the pasteable text carries schemaVersion", () => {
    expect(JSON.parse(exportGuideText(yoshimapGuide)).schemaVersion).toBe(1);
  });

  it("rejects non-JSON with a human-readable error", () => {
    const result = importGuideText("Milotic @ Sitrus Berry");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/JSON/);
  });

  it("rejects documents without schemaVersion", () => {
    const result = importGuideText(JSON.stringify({ title: "not a guide" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/schemaVersion/);
  });

  it("branches on schemaVersion: an unknown future version fails clearly, not structurally", () => {
    const future = { ...yoshimapGuide, schemaVersion: 99 };
    const result = importGuideText(JSON.stringify(future));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/schemaVersion 99/);
  });
});

describe("draft vs published boundary", () => {
  it("an incomplete draft is saveable but fails publish validation", () => {
    const draft = GuideDraftSchema.parse({
      id: "d1",
      schemaVersion: 1,
      createdAt: "2026-08-03T00:00:00.000Z",
      updatedAt: "2026-08-03T00:00:00.000Z",
      matchups: [
        {
          id: "m1",
          plans: [{ id: "p1", lead: ["Milotic"] }], // one lead, no title/team yet
        },
      ],
    });
    // Saveable: the draft schema accepted it and filled defaults.
    expect(draft.ownTeam.exportText).toBe("");
    expect(draft.matchups[0].plans[0].rules).toEqual([]);

    // Not publishable: strict validation reports the gaps.
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.issues.map((i) => i.path).join("\n");
      expect(paths).toMatch(/title/);
      expect(paths).toMatch(/lead/);
    }
  });

  it("a complete guide passes the same gate unchanged", () => {
    const draft = GuideDraftSchema.parse(yoshimapGuide);
    const result = validateDraft(draft);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.guide).toEqual(yoshimapGuide);
  });
});
