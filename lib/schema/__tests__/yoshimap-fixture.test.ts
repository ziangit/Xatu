import { describe, expect, it } from "vitest";
import { GuideSchema } from "../guide";
import { selectPlan } from "../plan";
import { guideWarnings } from "../warnings";
import { yoshimapGuide } from "../fixtures/yoshimap-sand-staraptor";

/**
 * Phase 1 acceptance gate: the model must hold two real matchups from the
 * yoshimap Reg M-B article (sections ② and ⑥) without contortion.
 */
describe("acceptance gate — yoshimap sections ② and ⑥", () => {
  it("the hand-encoded guide validates against the strict schema", () => {
    const result = GuideSchema.safeParse(yoshimapGuide);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("is internally consistent (no advisory warnings)", () => {
    expect(guideWarnings(yoshimapGuide)).toEqual([]);
  });

  describe("② the tier trap: 'if they lead Aero + Sylveon, lead Gholdengo'", () => {
    const matchup = yoshimapGuide.matchups.find((m) => m.id === "mu-aero-zard")!;

    it("encodes as a preview-tier species-presence guard, selected from the six at preview", () => {
      const observed = ["Aerodactyl", "Charizard", "Sylveon", "Garchomp", "Kingambit", "Dragonite"];
      const selected = selectPlan(observed, matchup.plans);
      expect(selected?.id).toBe("plan-sylveon");
      expect(selected?.lead).toContain("Gholdengo");
    });

    it("falls back to the default plan when Sylveon is absent", () => {
      const observed = ["Aerodactyl", "Charizard", "Garchomp", "Kingambit", "Dragonite", "Amoonguss"];
      expect(selectPlan(observed, matchup.plans)?.id).toBe("plan-default");
    });

    it("keeps turn-tier 'they lead X + Y' branches as rules that pick actions, not leads", () => {
      const defaultPlan = matchup.plans.find((p) => !p.when)!;
      const zardChomp = defaultPlan.rules.find((r) => r.id === "r-lead-zard-chomp")!;
      expect(zardChomp.conditions).toHaveLength(2);
      expect(zardChomp.actions.map((a) => a.species).sort()).toEqual(["Gholdengo", "Milotic"]);
    });
  });

  describe("⑥ several turn-tier branches share one plan without duplication", () => {
    const matchup = yoshimapGuide.matchups.find((m) => m.id === "mu-hard-tr")!;

    it("has exactly one plan carrying all branches", () => {
      expect(matchup.plans).toHaveLength(1);
      expect(matchup.plans[0].rules.length).toBeGreaterThanOrEqual(2);
    });

    it("branches key actions on species, so a partly-specified turn is legal", () => {
      const incineroar = matchup.plans[0].rules.find((r) => r.id === "r-tr-incineroar")!;
      // Only Tyranitar's action is specified; Milotic (about to be Faked Out)
      // is simply absent — no sentinel needed.
      expect(incineroar.actions).toHaveLength(1);
      expect(incineroar.actions[0].species).toBe("Tyranitar");
    });
  });
});
