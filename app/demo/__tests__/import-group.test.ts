import { describe, expect, it } from "vitest";
import { fallbackDocId, importSummary, planImport } from "../import-group";
import type { StoredTeam } from "../storage";

// `planImport` is the whole of the "keep both" decision, and it is pure so it
// can be tested without a browser: given what this browser already knows, is a
// pasted document an update of a group it has, a newcomer that collides with
// one, or simply new?

const SAND = [
  "Tyranitar",
  "Excadrill",
  "Milotic",
  "Gholdengo",
  "Sinistcha",
  "Staraptor",
];
const ZARD = [
  "Aerodactyl",
  "Charizard",
  "Garchomp",
  "Sylveon",
  "Kingambit",
  "Dragonite",
];

const NOW = "2026-08-14T00:00:00.000Z";

const team = (
  id: string,
  name: string,
  species: string[],
  origin?: StoredTeam["origin"],
): StoredTeam => ({
  id,
  name,
  format: "[Gen 9 Champions] VGC 2026 Reg M-B",
  exportText: species.join("\n\n"),
  parsed: species.map((s) => ({ species: s, moves: [] })),
  ...(origin ? { origin } : {}),
});

describe("planImport", () => {
  it("keeps a stranger's guide apart from my team with the same six", () => {
    const mine = team("mine", "My sand", SAND);
    const theirs = team("fresh", "Sand + Mega Staraptor", SAND);
    const plan = planImport(theirs, "their-team-id", [mine], NOW);
    expect(plan.existing).toBeNull();
    expect(plan.origin).toEqual({
      docId: "their-team-id",
      label: "Sand + Mega Staraptor",
      importedAt: NOW,
      keptApart: true,
    });
  });

  it("updates the group a document actually came from", () => {
    const mine = team("mine", "My sand", SAND);
    // My own document, pasted back into this browser: `g` is my team's id.
    const plan = planImport(
      team("fresh", "My sand", SAND),
      "mine",
      [mine],
      NOW,
    );
    expect(plan.existing?.id).toBe("mine");
    expect(plan.origin).toBeNull();
  });

  it("updates an imported group in place when the sharer sends a newer copy", () => {
    const origin = {
      docId: "their-team-id",
      label: "Sand",
      importedAt: NOW,
      keptApart: true,
    };
    const imported = team("local-id", "Sand", SAND, origin);
    const mine = team("mine", "My sand", SAND);
    const plan = planImport(
      team("fresh", "Sand v2", SAND),
      "their-team-id",
      [mine, imported],
      "2026-09-01T00:00:00.000Z",
    );
    // The same group, so it keeps its id *and* its provenance — a second
    // import must not turn their guide into mine, or fork a third group.
    expect(plan.existing?.id).toBe("local-id");
    expect(plan.origin).toEqual(origin);
  });

  it("keeps nothing apart when there is nothing to keep it apart from", () => {
    // Restoring your own backup into an empty browser, or a guide for a team I
    // don't have. `keptApart` false is what makes it behave like a team of
    // mine: no badge, and it still merges with the full Showdown export pasted
    // in next.
    expect(planImport(team("fresh", "Sand", SAND), "gone", [], NOW)).toEqual({
      docId: "gone",
      existing: null,
      origin: {
        docId: "gone",
        label: "Sand",
        importedAt: NOW,
        keptApart: false,
      },
    });
    const mine = team("mine", "Zard", ZARD);
    expect(
      planImport(team("fresh", "Sand", SAND), "x", [mine], NOW).origin
        ?.keptApart,
    ).toBe(false);
  });

  it("recognises its own document the second time, collision or not", () => {
    // The bug the first cut shipped: an uncollided import recorded no docId, so
    // pasting the very same document again found nothing to update, saw its own
    // first import as a collision, and forked a second group.
    const doc = team("fresh", "Miraidon Balance", ZARD);
    const first = planImport(doc, "kenta-guide", [], NOW);
    const landed = {
      ...team("local", "Miraidon Balance", ZARD),
      origin: first.origin!,
    };
    const second = planImport(doc, "kenta-guide", [landed], NOW);
    expect(second.existing?.id).toBe("local");
    expect(second.origin?.keptApart).toBe(false);
  });

  it("counts a team known only through a saved board", () => {
    // An opposing team I plan against is still a team this browser has, so a
    // guide built with it is kept separate rather than merged into it.
    const opponent = team("opp", "Zard", ZARD);
    const plan = planImport(
      team("fresh", "Zard", ZARD),
      "theirs",
      [opponent],
      NOW,
    );
    expect(plan.origin?.docId).toBe("theirs");
  });

  it("matches by roster, not by paste order or Mega forme", () => {
    const mine = team("mine", "My sand", SAND);
    const shuffled = [...SAND].reverse();
    shuffled[shuffled.indexOf("Tyranitar")] = "Tyranitar-Mega";
    expect(
      planImport(team("fresh", "Sand", shuffled), "theirs", [mine], NOW).origin,
    ).not.toBeNull();
  });
});

describe("fallbackDocId", () => {
  it("is stable for the same unstamped document, so re-pasting it doesn't fork", () => {
    const a = team("a", "Sand", SAND);
    const b = team("b", "Sand", [...SAND].reverse());
    expect(fallbackDocId(a)).toBe(fallbackDocId(b));
  });

  it("separates documents that name their team differently", () => {
    expect(fallbackDocId(team("a", "Sand", SAND))).not.toBe(
      fallbackDocId(team("b", "Sand v2", SAND)),
    );
  });
});

describe("importSummary", () => {
  const base = {
    my: team("mine", "Aero + Zard", ZARD),
    entries: [] as never[],
    written: [] as never[],
    added: 0,
    updated: 0,
    unchanged: 0,
    renamed: false,
    untouched: 0,
    keptApart: false,
  };
  const rows = (n: number) => Array.from({ length: n }, () => ({}) as never);

  it("says nothing happened when nothing was written", () => {
    expect(importSummary({ ...base, entries: rows(3), unchanged: 3 })).toBe(
      "Nothing to import — you already have these exact 3 matchups for Aero + Zard.",
    );
    expect(importSummary({ ...base, entries: rows(1), unchanged: 1 })).toBe(
      "Nothing to import — you already have this exact matchup for Aero + Zard.",
    );
  });

  it("names a rename as the only change", () => {
    expect(
      importSummary({
        ...base,
        entries: rows(2),
        unchanged: 2,
        renamed: true,
      }),
    ).toContain("no plan changed");
  });

  it("breaks down a mixed import, and stays quiet when it isn't mixed", () => {
    expect(
      importSummary({
        ...base,
        entries: rows(3),
        written: rows(2),
        added: 1,
        updated: 1,
        unchanged: 1,
      }),
    ).toBe(
      "Imported 3 matchups for Aero + Zard — 1 new, 1 updated, 1 already identical.",
    );
    expect(
      importSummary({ ...base, entries: rows(2), written: rows(2), added: 2 }),
    ).toBe("Imported 2 matchups for Aero + Zard.");
  });

  it("always reports what it left alone when it kept the set apart", () => {
    expect(
      importSummary({
        ...base,
        entries: rows(2),
        written: rows(2),
        added: 2,
        keptApart: true,
        untouched: 2,
      }),
    ).toBe(
      "Imported 2 matchups as a separate set for Aero + Zard — your 2 for this team were left alone.",
    );
  });
  /**
   * The bug this guards: the no-op branch used to pick singular vs plural by
   * comparing its own rendered text (`count === "1 matchup"`). That is false in
   * every language once a translation exists — including a reworded English —
   * so it silently took the plural branch for a single matchup.
   */
  it("picks singular by the number, not by its own rendered text", () => {
    expect(
      importSummary({ ...base, entries: rows(1), unchanged: 1 }, "zh"),
    ).toBe("没有要导入的内容——Aero + Zard 的这个对阵你已经有了，且完全相同。");
    expect(
      importSummary({ ...base, entries: rows(3), unchanged: 3 }, "zh"),
    ).toBe(
      "没有要导入的内容——Aero + Zard 的这 3 个对阵你已经有了，且完全相同。",
    );
    expect(
      importSummary({ ...base, entries: rows(1), unchanged: 1 }, "ja"),
    ).toBe(
      "読み込むものはありません——Aero + Zard のこのマッチアップは、まったく同じ内容ですでにあります。",
    );
    expect(
      importSummary({ ...base, entries: rows(3), unchanged: 3 }, "ja"),
    ).toBe(
      "読み込むものはありません——Aero + Zard のこの 3 件のマッチアップは、まったく同じ内容ですでにあります。",
    );
  });

  it("reads as one Chinese sentence when several things happened", () => {
    expect(
      importSummary(
        {
          ...base,
          entries: rows(3),
          written: rows(2),
          added: 1,
          updated: 1,
          unchanged: 1,
        },
        "zh",
      ),
    ).toBe(
      "已为 Aero + Zard 导入 3 个对阵——1 个新增、1 个更新、1 个完全相同。",
    );
  });

  it("says what it left alone, in Chinese, when it kept the set apart", () => {
    expect(
      importSummary(
        {
          ...base,
          entries: rows(2),
          written: rows(2),
          added: 2,
          keptApart: true,
          untouched: 2,
        },
        "zh",
      ),
    ).toBe(
      "已把 2 个对阵作为 Aero + Zard 的独立一组导入——你自己给这支队伍写的 2 个原封不动。",
    );
  });

  it("reads as one Japanese sentence when several things happened", () => {
    expect(
      importSummary(
        {
          ...base,
          entries: rows(3),
          written: rows(2),
          added: 1,
          updated: 1,
          unchanged: 1,
        },
        "ja",
      ),
    ).toBe(
      "Aero + Zard に 3 件のマッチアップを読み込みました——1 件を新規追加、1 件を更新、1 件は同一。",
    );
  });

  /**
   * Japanese ends the head clause outright instead of joining with "; ", so
   * this is also the check that `clause|…` really is a translatable unit
   * rather than punctuation frozen into the builder.
   */
  it("says what it left alone, in Japanese, when it kept the set apart", () => {
    expect(
      importSummary(
        {
          ...base,
          entries: rows(2),
          written: rows(2),
          added: 2,
          keptApart: true,
          untouched: 2,
        },
        "ja",
      ),
    ).toBe(
      "2 件のマッチアップを Aero + Zard の別グループとして読み込みました。このパーティ用に自分で作った 2 件はそのままです。",
    );
  });
});
