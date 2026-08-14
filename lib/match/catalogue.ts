import { matchKey, matchSpecies } from "./roster";

/**
 * Ranking partial matches against a catalogue of known teams — "which published
 * teams share four or more of these six?".
 *
 * Pure and framework-free, over rows the caller has already fetched: the SQL
 * belongs to the app, the arithmetic belongs here, and the future extension can
 * reuse it. Set arithmetic on species names only — no usage statistics, no
 * threat scoring, no claim about who wins. (CLAUDE.md: no battle computation.)
 */

/** The columns a ranking needs. The caller may select more; this ignores them. */
export interface CatalogueRow {
  /** Normalised, deduped, sorted — the same `matchSpecies` the DB column holds. */
  match_species: string[];
  /** `match_species` joined by "|": the team's identity. */
  roster_code: string;
  /** As pasted, in paste order — what a reader should see. */
  species: string[];
  name?: string | null;
  author?: string | null;
  paste_url?: string | null;
  featured?: boolean | null;
  category?: string | null;
}

export interface CatalogueMatch {
  /** How many of the observed species this team runs. */
  shared: number;
  /** Of how many observed species — so a row can read "4/6". */
  observed: number;
  /** Distinct pastes of this same six. 30 for the most-copied roster. */
  pastes: number;
  rosterCode: string;
  /** The representative paste: featured first, else the first by name. */
  team: CatalogueRow;
  /** Every species of the matched team, in paste order, for the sprite row. */
  species: string[];
  /** Which of those the observer already named — for highlighting. */
  matched: string[];
}

/**
 * One row per *roster*, not per paste. 712 catalogue teams are 567 distinct
 * rosters and the most-copied one appears 30 times, so an ungrouped list lets a
 * popular archetype crowd out everything else. `pastes` keeps that signal.
 */
function pickRepresentative(rows: CatalogueRow[]): CatalogueRow {
  return (
    rows.find((r) => r.featured) ??
    [...rows].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))[0]
  );
}

/**
 * Rank catalogue rows by how many of `observed` they run, best first.
 *
 * `min` is the caller's threshold, deliberately not baked in here — the UI asks
 * for 4+, a different surface may want 5+. Results are ranked, never cut to one
 * "answer": the reader sees 6/6 above 5/6 above 4/6 and decides.
 */
export function rankCatalogueMatches(
  observed: string[],
  rows: CatalogueRow[],
  { min = 4, limit = 20 }: { min?: number; limit?: number } = {},
): CatalogueMatch[] {
  const keys = new Set(matchSpecies(observed));
  if (keys.size === 0) return [];

  const byRoster = new Map<string, { rows: CatalogueRow[]; shared: number }>();
  for (const row of rows) {
    const shared = row.match_species.filter((s) => keys.has(s)).length;
    if (shared < min) continue;
    const group = byRoster.get(row.roster_code);
    if (group) group.rows.push(row);
    else byRoster.set(row.roster_code, { rows: [row], shared });
  }

  return [...byRoster.entries()]
    .map(([rosterCode, { rows: group, shared }]) => {
      const team = pickRepresentative(group);
      return {
        shared,
        observed: keys.size,
        pastes: group.length,
        rosterCode,
        team,
        species: team.species,
        matched: team.species.filter((s) => keys.has(matchKey(s))),
      };
    })
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        // A roster twelve people copied is a likelier read than a one-off.
        b.pastes - a.pastes ||
        (a.team.name ?? "").localeCompare(b.team.name ?? ""),
    )
    .slice(0, limit);
}
