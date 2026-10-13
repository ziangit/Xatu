import { rosterCode } from "@/lib/match";
import { canonicalSpecies } from "@/lib/species";

/**
 * The prose around a published set — a minimal team report.
 *
 * Deliberately *not* a block list. The user asked for one thing: text between
 * two matchups. So the shape is a text slot keyed by the matchup it sits
 * above, plus one at the end. There is nothing to reorder, nothing to
 * reconcile when a matchup is added or removed, and no drag.
 *
 * It lives in its own `report` column rather than inside the `encodeGroup`
 * document, because that string is simultaneously the storage format, the
 * paste format, the board's dirty-check fingerprint and the future extension's
 * input. Page furniture in there would mark every board dirty on a wording
 * change and give the extension layout it does not care about.
 *
 * Absent (or empty) means the page reads exactly as it did before reports
 * existed: description, then every matchup in document order.
 */
export interface Report {
  /**
   * Text shown immediately above a matchup, keyed by the opponent's **roster
   * code**, not by its team id.
   *
   * A team id cannot be used: publishing round-trips the set through
   * `encodeGroup`, and `teamFromCompact` mints a fresh `crypto.randomUUID()`
   * for every team it decodes — so the reader never sees the id the composer
   * wrote. The roster code is derived from the six species, which *are*
   * stored, so it survives. (Found the hard way: the prose published fine and
   * then rendered nowhere.)
   */
  before?: Record<string, string>;
  /** Text after the last matchup. */
  outro?: string;
}

/** True when a report would change nothing, so it is stored as null. */
export function isEmptyReport(report: Report | null | undefined): boolean {
  if (!report) return true;
  if (report.outro?.trim()) return false;
  return !Object.values(report.before ?? {}).some((t) => t.trim());
}

/** The key a matchup's prose is filed under. Same on both sides of publish. */
export const reportKey = (opponent: {
  parsed: readonly { species: string }[];
}) => rosterCode(opponent.parsed.map((m) => m.species));

/**
 * Drop slots whose matchup is gone and blank entries, so the stored report
 * cannot accumulate text nobody can see. Pure, so it is tested.
 */
export function pruneReport(
  report: Report | null | undefined,
  liveKeys: readonly string[],
): Report | null {
  const live = new Set(liveKeys);
  const before: Record<string, string> = {};
  for (const [id, text] of Object.entries(report?.before ?? {})) {
    if (live.has(id) && text.trim()) before[id] = text;
  }
  const outro = report?.outro?.trim() ? report.outro : undefined;
  const next: Report = {
    ...(Object.keys(before).length ? { before } : {}),
    ...(outro ? { outro } : {}),
  };
  return isEmptyReport(next) ? null : next;
}

/** A run of plain text, or one Pokémon to draw as a sprite. */
export type Segment =
  { kind: "text"; text: string } | { kind: "mon"; species: string };

/** `:Species:` — spaces and hyphens allowed, so `:Flutter Mane:` works. */
const TOKEN = /:([^:\n]{1,30}):/g;

/**
 * Split report prose into text and sprite segments.
 *
 * There is no markdown and no HTML: this is a public page on a site with no
 * moderation tooling, and rendering author-supplied markup there is an XSS
 * surface nobody is watching. The only markup is a species token, and a token
 * that is not a real species stays literal text — so `Note: see below:` is
 * never mangled and there is no escape syntax to learn.
 */
export function parseReportText(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const species = canonicalSpecies(m[1]);
    if (!species) continue;
    if (m.index > last)
      out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push({ kind: "mon", species });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** The same text with tokens flattened to names, for places that cannot draw
 * a sprite — the Open Graph card, the feed listing, a `title` attribute. */
export const flattenReportText = (text: string) =>
  parseReportText(text)
    .map((s) => (s.kind === "mon" ? s.species : s.text))
    .join("");
