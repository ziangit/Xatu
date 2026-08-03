import { describe, expect, it } from "vitest";
import { MatchupSchema, type Plan } from "../guide";
import { bringOf, selectPlan } from "../plan";

const plan = (id: string, when: string[] | undefined, lead: [string, string]): Plan => ({
  id,
  when: when?.map((species) => ({ kind: "hasSpecies" as const, species })),
  lead,
  back: [],
  gameplan: "",
  rules: [],
});

describe("selectPlan — specificity semantics, not array order", () => {
  const unguarded = plan("unguarded", undefined, ["A", "B"]);
  const oneGuard = plan("one", ["Swampert"], ["C", "D"]);
  const twoGuards = plan("two", ["Swampert", "Politoed"], ["E", "F"]);

  it("a satisfied guarded plan beats an unguarded plan listed earlier", () => {
    const result = selectPlan(["Swampert", "Incineroar"], [unguarded, oneGuard]);
    expect(result?.id).toBe("one");
  });

  it("more predicates win among satisfied guards, regardless of position", () => {
    // Most-specific plan listed LAST — order must not matter.
    const result = selectPlan(
      ["Swampert", "Politoed", "Incineroar"],
      [unguarded, oneGuard, twoGuards],
    );
    expect(result?.id).toBe("two");
  });

  it("falls back to the unguarded plan even when it is listed last", () => {
    const result = selectPlan(["Incineroar", "Rillaboom"], [oneGuard, twoGuards, unguarded]);
    expect(result?.id).toBe("unguarded");
  });

  it("a partially satisfied guard does not fire", () => {
    // Politoed absent → twoGuards unsatisfied, oneGuard satisfied.
    const result = selectPlan(["Swampert"], [twoGuards, oneGuard]);
    expect(result?.id).toBe("one");
  });

  it("returns undefined when only guarded plans exist and none match", () => {
    expect(selectPlan(["Incineroar"], [oneGuard, twoGuards])).toBeUndefined();
  });

  it("equal-specificity ties resolve to array order (stable)", () => {
    const a = plan("tie-a", ["Swampert"], ["A", "B"]);
    const b = plan("tie-b", ["Incineroar"], ["C", "D"]);
    expect(selectPlan(["Swampert", "Incineroar"], [a, b])?.id).toBe("tie-a");
    expect(selectPlan(["Swampert", "Incineroar"], [b, a])?.id).toBe("tie-b");
  });

  it("matches species case- and whitespace-insensitively", () => {
    expect(selectPlan(["swampert "], [oneGuard])?.id).toBe("one");
  });
});

describe("bringOf", () => {
  it("derives bring as lead + back, so lead ⊆ bring by construction", () => {
    const p = { lead: ["Milotic", "Gholdengo"] as [string, string], back: ["Tyranitar"] };
    expect(bringOf(p)).toEqual(["Milotic", "Gholdengo", "Tyranitar"]);
  });
});

describe("matchup plan constraints", () => {
  const base = { id: "m", name: "vs X", opponentSpecies: [] };

  it("rejects two unguarded plans", () => {
    const result = MatchupSchema.safeParse({
      ...base,
      plans: [plan("p1", undefined, ["A", "B"]), plan("p2", undefined, ["C", "D"])],
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero unguarded plans — an author may only care about the guarded case", () => {
    const result = MatchupSchema.safeParse({ ...base, plans: [plan("p1", ["Swampert"], ["A", "B"])] });
    expect(result.success).toBe(true);
  });
});
