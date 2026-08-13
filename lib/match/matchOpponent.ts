import type { Matchup } from "../schema";
import { formeCandidates, matchKey } from "./roster";

export { formeCandidates, looseKey, matchKey } from "./roster";

/**
 * `matchOpponent` — given the six species observed at team preview, rank the
 * guide's matchups by how well they fit. The future browser extension's core
 * dependency; pure and framework-free.
 *
 * Fuzzy by design: ~4-of-6 overlap should surface the right matchup. Species
 * are weighted by inverse document frequency **within the guide's own matchup
 * library** — a species listed in every matchup (an Incineroar-alike) carries
 * little signal; a species unique to one matchup carries a lot. The author's
 * `required` tag is a large manual multiplier on top (hand-calibrated IDF);
 * `optional` is discounted.
 *
 * Returns the top 3 with scores, best first. Never asserts a single confident
 * answer — callers show candidates, not a verdict.
 */

export interface MatchResult {
  matchup: Matchup;
  /** 0–1: the fraction of the matchup's weighted species mass observed. */
  score: number;
}

const TAG_MULTIPLIER = { required: 3, common: 1, optional: 0.5 } as const;
const TOP_N = 3;

export function matchOpponent(
  observedSpecies: string[],
  matchups: Matchup[],
): MatchResult[] {
  // Both sides go through the same normalisation. Observed species also expand
  // to forme candidates (over-matching is cheap on the observed side); the
  // stored side is reduced to its canonical key.
  const observed = new Set([
    ...observedSpecies.flatMap(formeCandidates),
    ...observedSpecies.map(matchKey),
  ]);

  // Document frequency of each species key across the matchup library.
  const df = new Map<string, number>();
  for (const mu of matchups) {
    for (const key of new Set(
      mu.opponentSpecies.map((o) => matchKey(o.species)),
    )) {
      df.set(key, (df.get(key) ?? 0) + 1);
    }
  }
  const idf = (key: string) =>
    Math.log(1 + matchups.length / (df.get(key) ?? 1));

  const results: MatchResult[] = matchups.map((matchup) => {
    let total = 0;
    let matched = 0;
    for (const o of matchup.opponentSpecies) {
      const key = matchKey(o.species);
      const weight = idf(key) * TAG_MULTIPLIER[o.tag];
      total += weight;
      if (observed.has(key)) matched += weight;
    }
    return { matchup, score: total > 0 ? matched / total : 0 };
  });

  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);
}
