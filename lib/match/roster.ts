/**
 * Roster normalization — turning "the six Pokémon on a team" into something two
 * different sources can compare.
 *
 * Deliberately self-contained (no relative imports): the ingest script runs this
 * file directly through Node, so what lands in the database is computed by the
 * same code the app and the future extension use. A canonical form that only one
 * side of a comparison knows about is worse than none.
 *
 * Two levels, because they answer different questions:
 * - `rosterCode` is *identity*: same six, any order → same string. Use it to
 *   dedupe teams, to link a pasted team to a catalogue row, to notice that one
 *   roster appears thirty times.
 * - `matchSpecies` is the sorted key set behind it, which is what a partial
 *   ("4 of 6") search needs. A single code can never answer that — hashes of
 *   two sets that differ by one element are unrelated strings — so the code is
 *   the prerequisite for subset search, not the mechanism.
 */

/** Lowercase, alphanumerics and hyphens only — tolerant of spacing and case. */
export function looseKey(species: string): string {
  return species
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Formes a Pokémon takes **during** a battle, which therefore aren't visible at
 * team preview. A team whose paste says "Garchomp-Mega" shows Garchomp at
 * preview, so a key that keeps the suffix can never match what a reader
 * observes — 23 distinct Mega-named species appear in the VGCPastes corpus.
 *
 * Only these are stripped. Formes that *are* distinguishable at preview stay
 * distinct, which is why this isn't blanket hyphen-stripping: the same corpus
 * holds both `Floette-Eternal` and `Floette-Mega`, and collapsing the first to
 * "floette" would throw away a real difference.
 */
const IN_BATTLE_FORME = /-mega(-[xy])?$/;

/** One species → the key both sides of a comparison agree on. */
export function matchKey(species: string): string {
  const key = looseKey(species);
  const base = key.replace(IN_BATTLE_FORME, "");
  // Never strip away the whole name ("Mega" alone isn't a forme suffix).
  return base || key;
}

/**
 * The team's keys, deduped and sorted — order is meaningless for identity, and
 * 108 of the 712 catalogue teams differ from another team only in paste order.
 */
export function matchSpecies(species: string[]): string[] {
  return [...new Set(species.map(matchKey).filter(Boolean))].sort();
}

/**
 * The team's identity as one string. Joined with `|`, which no species key can
 * contain (keys are `[a-z0-9-]` only), so the code is unambiguous and can be
 * split back into its species.
 */
export function rosterCode(species: string[]): string {
  return matchSpecies(species).join("|");
}

/**
 * How many species two rosters share — the quantity a "4 of 6" search ranks by.
 * Kept here so the threshold lives in the caller and not in the definition.
 */
export function sharedSpecies(a: string[], b: string[]): number {
  const keys = new Set(matchSpecies(a));
  return matchSpecies(b).filter((key) => keys.has(key)).length;
}

/**
 * A pasted species often carries forme suffixes the author didn't write
 * ("Charizard-Mega-Y" vs. "Charizard"). Candidates are the key with trailing
 * hyphen segments progressively stripped, so forme names match their base.
 *
 * Broader than `matchKey` on purpose: this generates *possibilities* for the
 * observed side of a match, where over-matching is cheap. `matchKey` is a
 * stored canonical form, where over-collapsing loses information.
 */
export function formeCandidates(species: string): string[] {
  const candidates = [looseKey(species)];
  let key = candidates[0];
  while (key.includes("-")) {
    key = key.slice(0, key.lastIndexOf("-"));
    candidates.push(key);
  }
  return candidates;
}
