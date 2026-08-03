import type { Plan } from "./guide";

/** Case/whitespace-insensitive species comparison key. */
export function speciesKey(species: string): string {
  return species.trim().toLowerCase();
}

/**
 * The full set brought to the game. `lead` ⊆ bring holds by construction —
 * this is derived, not stored, so the constraint is unrepresentable.
 */
export function bringOf(plan: Pick<Plan, "lead" | "back">): string[] {
  return [...plan.lead, ...plan.back];
}

/**
 * Pick the active plan for an observed opponent team (their six species at
 * preview).
 *
 * Semantics — by specificity, NOT array index:
 *  1. A guarded plan is satisfied when EVERY `hasSpecies` guard matches.
 *  2. Among satisfied guarded plans, the one with the most predicates wins;
 *     ties resolve to the earliest in array order (stable).
 *  3. The unguarded plan (at most one exists, anywhere in the array) is the
 *     fallback when no guarded plan is satisfied.
 *  4. `undefined` when nothing applies — a matchup may have only guarded
 *     plans and no general answer.
 */
export function selectPlan<P extends Pick<Plan, "when">>(
  observedSpecies: string[],
  plans: P[],
): P | undefined {
  const observed = new Set(observedSpecies.map(speciesKey));

  const satisfied = plans.filter(
    (p) => p.when && p.when.every((g) => observed.has(speciesKey(g.species))),
  );
  if (satisfied.length > 0) {
    // Array.prototype.sort is stable, so equal-specificity ties keep order.
    return [...satisfied].sort((a, b) => b.when!.length - a.when!.length)[0];
  }
  return plans.find((p) => !p.when);
}
