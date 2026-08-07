import { Team } from "@pkmn/sets";
import type { ParsedMon } from "../schema";

/**
 * Lenient Showdown-export import. The export text is the source of truth and
 * is retained verbatim (`exportText` must round-trip losslessly); `parsed` is
 * a derived view for UI use only. Unknown species/moves pass through as-is —
 * xatu is not a legality checker.
 */

export interface ImportedTeam {
  /** The input, verbatim. */
  exportText: string;
  parsed: ParsedMon[];
}

/** `null` when the text isn't parseable as a Showdown export at all. */
export function importTeamText(text: string): ImportedTeam | null {
  const team = Team.import(text);
  if (!team || team.team.length === 0) return null;

  const parsed: ParsedMon[] = [];
  for (const set of team.team.slice(0, 6)) {
    const species = (set.species || set.name || "").trim();
    if (!species) continue;
    parsed.push({
      species,
      nickname:
        set.name && set.name !== set.species ? set.name : undefined,
      item: set.item || undefined,
      ability: set.ability || undefined,
      teraType: set.teraType || undefined,
      moves: (set.moves ?? []).slice(0, 4),
    });
  }
  if (parsed.length === 0) return null;
  return { exportText: text, parsed };
}
