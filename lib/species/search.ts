import { SPECIES_ROWS } from "./names";

/**
 * Species name resolution for the type-ahead — pure, framework-free, and shared
 * with whatever needs to turn "pika" into "Pikachu" (the extension will).
 *
 * Deliberately not fuzzy. Prefix and substring matching only, ranked so the
 * plain forme wins: an author typing "pika" wants Pikachu, not Pikachu-Libre,
 * and a matcher that guesses at typos would put a wrong species one Enter key
 * away. Nothing here is a legality check — the list spans every generation.
 */

/**
 * Lowercase alphanumerics, accents folded. Makes "Flabébé" reachable by typing
 * "flabebe", "Farfetch'd" by "farfetchd", and "Iron Hands" by "iron h".
 */
export function speciesKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export interface SpeciesMatch {
  /** The full name, e.g. "Blastoise-Mega". This is what gets stored. */
  name: string;
  /** "Blastoise" — typeset first, the way Showdown's teambuilder does. */
  base: string;
  /** "Mega", or "" for a base species. Typeset after the base, dimmed. */
  forme: string;
  /** One or two, e.g. ["Steel", "Ghost"]. */
  types: string[];
  /** Lower is better. 0 exact · 1 name prefix · 2 forme-word prefix · 3 substring. */
  rank: number;
}

interface Indexed {
  name: string;
  base: string;
  forme: string;
  types: string[];
  key: string;
  /** Keys of the hyphenated parts after the first — "Lycanroc-Dusk" → ["dusk"]. */
  formeKeys: string[];
  formes: number;
}

const INDEX: Indexed[] = SPECIES_ROWS.map((row) => {
  const [base, forme, types] = row.split("|");
  const name = forme ? `${base}-${forme}` : base;
  const parts = name.split("-");
  return {
    name,
    base,
    forme,
    types: types ? types.split("/") : [],
    key: speciesKey(name),
    formeKeys: parts.slice(1).map(speciesKey).filter(Boolean),
    formes: parts.length - 1,
  };
});

/** Every name in the list, for callers that only need the strings. */
export const SPECIES_NAMES: readonly string[] = INDEX.map((e) => e.name);

function rankOf(entry: Indexed, query: string): number | null {
  if (entry.key === query) return 0;
  if (entry.key.startsWith(query)) return 1;
  if (entry.formeKeys.some((f) => f.startsWith(query))) return 2;
  if (entry.key.includes(query)) return 3;
  return null;
}

/**
 * Best matches for a partial name, best first. Empty for an empty query — the
 * caller decides whether "no input" means "show nothing" or "show everything".
 */
export function searchSpecies(query: string, limit = 8): SpeciesMatch[] {
  const q = speciesKey(query);
  if (!q) return [];

  const hits: { entry: Indexed; rank: number }[] = [];
  for (const entry of INDEX) {
    const rank = rankOf(entry, q);
    if (rank !== null) hits.push({ entry, rank });
  }
  hits.sort(
    (a, b) =>
      a.rank - b.rank ||
      // Base forme before its variants, then the shorter name: "pika" should
      // land on Pikachu with Pikachu-Alola behind it, not the other way round.
      a.entry.formes - b.entry.formes ||
      a.entry.name.length - b.entry.name.length ||
      a.entry.name.localeCompare(b.entry.name),
  );
  return hits.slice(0, limit).map(({ entry, rank }) => ({
    name: entry.name,
    base: entry.base,
    forme: entry.forme,
    types: entry.types,
    rank,
  }));
}

/** True when the name is one the icon sheet can draw (see scripts/gen-species.mjs). */
export function isNamedSpecies(name: string): boolean {
  const key = speciesKey(name);
  return INDEX.some((entry) => entry.key === key);
}

/** The list's own spelling of a name, or null — "pikachu" → "Pikachu". */
export function canonicalSpecies(name: string): string | null {
  const key = speciesKey(name);
  return INDEX.find((entry) => entry.key === key)?.name ?? null;
}
