import type { ParsedMon } from "../schema";
import { importTeamText, type ImportedTeam } from "./import";

/**
 * Flexible and multi-team paste handling, for authors lining up one of their
 * teams against many opposing teams. Pure and framework-free: the same rules
 * the future extension would need.
 *
 * Recognised inputs, in order:
 *  - `=== [format] name ===` delimited exports (pokepaste folders, Showdown
 *    teambuilder backups) — several teams, names taken from the headers
 *  - several comma-separated species lists, one team per line
 *  - a single Showdown export, or a single comma-separated species list
 *
 * Nothing here is a legality check and nothing is computed from the sets;
 * unknown species pass through verbatim.
 */

export interface NamedTeam extends ImportedTeam {
  /** From a `=== … ===` header, or the first two species as a fallback. */
  name?: string;
}

/** A species list is a single line of names — no set syntax anywhere in it. */
const SPECIES_LIST_RE = /^[^@,]{1,30}$/;

/** `=== [gen9vgc] Aero + Zard ===` — the format tag is deliberately dropped:
 * the caller's own format field stays the authority. */
const TEAM_HEADER_RE = /^===\s*(?:\[[^\]]*\]\s*)?(.*?)\s*===$/;

/** Showdown export, or a bare comma-separated species list. Surrounding
 * whitespace is trimmed; the export text is otherwise verbatim. */
export function importFlexibleTeam(text: string): ImportedTeam | null {
  const input = text.trim();
  if (!input) return null;
  if (!input.includes("\n") && input.includes(",")) {
    const names = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    if (names.length > 0 && names.every((n) => SPECIES_LIST_RE.test(n))) {
      return {
        exportText: names.join("\n\n"),
        parsed: names.map((species) => ({ species, moves: [] })),
      };
    }
  }
  return importTeamText(input);
}

/** How people name opposing archetypes anyway: the first two species. */
export function teamLabel(parsed: ParsedMon[]): string {
  return parsed.slice(0, 2).map((m) => m.species).join(" + ");
}

function splitByHeaders(text: string) {
  const sections: { name?: string; body: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const header = TEAM_HEADER_RE.exec(line.trim());
    if (header) sections.push({ name: header[1] || undefined, body: "" });
    else if (sections.length > 0)
      sections[sections.length - 1].body += `${line}\n`;
  }
  return sections;
}

const looksLikeSpeciesList = (line: string) =>
  line.includes(",") &&
  !line.includes("@") &&
  !line.includes(":") &&
  !line.startsWith("-");

/** One paste → one or more teams. Empty when nothing parses. */
export function importTeams(text: string): NamedTeam[] {
  const input = text.trim();
  if (!input) return [];

  const sections = splitByHeaders(input);
  if (sections.length > 0) {
    return sections.flatMap(({ name, body }) => {
      const team = importFlexibleTeam(body);
      if (!team) return [];
      return [{ ...team, name: name ?? (teamLabel(team.parsed) || undefined) }];
    });
  }

  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1 && lines.every(looksLikeSpeciesList)) {
    return lines.flatMap((line) => {
      const team = importFlexibleTeam(line);
      if (!team) return [];
      return [{ ...team, name: teamLabel(team.parsed) || undefined }];
    });
  }

  const single = importFlexibleTeam(input);
  return single ? [single] : [];
}
