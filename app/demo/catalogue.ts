"use client";

import {
  matchSpecies,
  rankCatalogueMatches,
  type CatalogueMatch,
  type CatalogueRow,
} from "@/lib/match";
import { getSupabase } from "../auth/client";

/**
 * "Which published teams share four or more of these?" — a read of the
 * `community_teams` catalogue (712 Champions teams from VGCPastes).
 *
 * The table is world-readable through the anon key, so this needs no session;
 * it is also entirely optional. With Supabase unconfigured, the table absent, or
 * the network down, the answer is "off" and the picker simply doesn't offer the
 * lookup — the local-first flow never depends on a cloud read.
 *
 * The overlap prefilter runs in Postgres (GIN index on `match_species`); the
 * counting and grouping happen in `lib/match/catalogue.ts` so the arithmetic is
 * pure, testable and shareable with the extension. Only the query lives here.
 */

export type CatalogueResult =
  | { state: "off" } // no Supabase configured
  | { state: "ok"; matches: CatalogueMatch[]; scanned: number }
  | { state: "error"; message: string };

/**
 * Deliberately lean: no `export_text`. The catalogue's exports are ~1KB each and
 * a broad overlap can return hundreds of rows, so the payload would be megabytes
 * for data a read-only result row never shows.
 */
const COLUMNS =
  "match_species,roster_code,species,name,author,paste_url,featured,category";

export async function findCatalogueTeams(
  species: string[],
  regulation: string,
  { min = 4, limit = 20 }: { min?: number; limit?: number } = {},
): Promise<CatalogueResult> {
  const supabase = getSupabase();
  if (!supabase) return { state: "off" };

  // Always the NORMALISED array: a paste naming "Garchomp-Mega" has to find a
  // team that named "Garchomp", and that only holds if both sides went through
  // matchKey — which is exactly what the stored `match_species` column is.
  const keys = matchSpecies(species);
  if (keys.length < min) return { state: "ok", matches: [], scanned: 0 };

  const query = supabase
    .from("community_teams")
    .select(COLUMNS)
    // A Reg M-A team sharing five species is not an M-B opponent.
    .eq("regulation", regulation);

  // When exactly `min` species are named, "shares at least min" *is* "contains
  // all of them" — an exact containment query, not an approximation, and the
  // difference is real: 13 rows instead of 481 on the measured corpus. Above
  // that, overlap (&&) prefilters and the ranking narrows; ~36KB gzipped for a
  // whole-corpus sweep is a fine price for one deliberate click, and beats the
  // C(6,4) subset gymnastics that would avoid it.
  const { data, error } =
    keys.length === min
      ? await query.contains("match_species", keys)
      : await query.overlaps("match_species", keys);

  if (error) return { state: "error", message: error.message };

  const rows = (data ?? []) as unknown as CatalogueRow[];
  return {
    state: "ok",
    matches: rankCatalogueMatches(species, rows, { min, limit }),
    scanned: rows.length,
  };
}
