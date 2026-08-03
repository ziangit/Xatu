import type { Guide } from "./guide";
import { bringOf, speciesKey } from "./plan";

/**
 * Advisory, NON-BLOCKING consistency warnings. Lenient validation is a hard
 * constraint: unknown species/moves must never reject a document — dex data
 * lags Champions-era regulations and the author is the authority. These
 * warnings surface likely typos (an action for a species not on the team, a
 * move the parsed set doesn't list) for the editor UI to display; they are
 * never enforced at parse, publish, or import time.
 */
export function guideWarnings(guide: Guide): string[] {
  const warnings: string[] = [];
  const team = new Set(guide.ownTeam.parsed.map((m) => speciesKey(m.species)));
  const movesBySpecies = new Map(
    guide.ownTeam.parsed.map((m) => [speciesKey(m.species), new Set(m.moves.map(speciesKey))]),
  );
  const onTeam = (species: string) => team.size === 0 || team.has(speciesKey(species));

  for (const mu of guide.matchups) {
    for (const plan of mu.plans) {
      for (const species of bringOf(plan)) {
        if (!onTeam(species)) {
          warnings.push(`${mu.name}: "${species}" in bring/lead is not on your team`);
        }
      }
      for (const rule of plan.rules) {
        for (const { species, action } of rule.actions) {
          if (!onTeam(species)) {
            warnings.push(`${mu.name}: rule action for "${species}", which is not on your team`);
            continue;
          }
          if ("switchTo" in action && !onTeam(action.switchTo)) {
            warnings.push(`${mu.name}: switch to "${action.switchTo}", which is not on your team`);
          }
          if ("move" in action) {
            const known = movesBySpecies.get(speciesKey(species));
            if (known && known.size > 0 && !known.has(speciesKey(action.move))) {
              warnings.push(`${mu.name}: ${species} doesn't list the move "${action.move}"`);
            }
          }
        }
      }
    }
  }
  return warnings;
}
