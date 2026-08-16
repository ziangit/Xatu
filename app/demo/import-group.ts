import { rosterCode } from "@/lib/match";
import { count, translate, type Lang, type Params } from "../i18n/translate";
import { encodeGroup, type DecodedGroup } from "./workflow-io";
import {
  findPairMatchup,
  groupDocId,
  knownTeams,
  loadMatchups,
  rememberTeam,
  speciesKey,
  upsertMatchup,
  type SavedMatchup,
  type StoredTeam,
  type TeamOrigin,
  type TurnNode,
} from "./storage";

/**
 * Where a pasted document lands — the one place both import buttons go through,
 * so `/matchups` and the board can't disagree about it again (they used to:
 * one overwrote the plan you already had for an opponent, the other quietly
 * saved a second entry for the same pair).
 *
 * **An import adds; it never overwrites work that isn't the document's own**
 * (user, 2026-08-14). Someone else's guide for the same archetype is a second
 * group sitting beside mine, badged with where it came from. If the author
 * decides one of them is redundant, they delete it themselves — nothing here
 * merges, and nothing here asks.
 *
 * The one thing that *is* allowed to replace is the document's own group coming
 * back: my own copy pasted into a fresh browser, or a newer copy of a guide I
 * already imported. That's an update, not a collision, and it's what the `g`
 * stamp identifies.
 */

/**
 * Identity for a document with no `g` stamp (v2, legacy, and v3 written before
 * 2026-08-14). Roster plus name is the most that can be recovered, and it is
 * stable, so pasting the same old document twice still doesn't fork a group.
 */
export const fallbackDocId = (my: StoredTeam) =>
  `paste:${rosterCode(my.parsed.map((m) => m.species))}:${my.name}`;

export interface ImportPlan {
  docId: string;
  /** The team already here that heads this document's group, if we know it. */
  existing: StoredTeam | null;
  /** Set when the document's team has to be kept apart from one already here. */
  origin: TeamOrigin | null;
}

/**
 * Pure decision: is this document a group we already have, a newcomer that
 * collides with a team we have, or simply new?
 *
 * The document's id is **always** recorded on a team that arrived in one, even
 * with nothing to collide with — otherwise the same document pasted twice has
 * nothing to recognise itself by and forks a second group the second time.
 * (That is exactly what shipped first and what the user hit.) What a collision
 * decides is `keptApart`, which badges the group and stops it merging with the
 * team it sits beside — and only that, so an uncollided paste still behaves
 * like a team of mine.
 */
export function planImport(
  my: StoredTeam,
  docId: string,
  known: StoredTeam[],
  now: string,
): ImportPlan {
  const existing = known.find((t) => groupDocId(t) === docId) ?? null;
  // A team built here whose id the document carries is my own group coming
  // home; it has no provenance and must not acquire one.
  if (existing) return { docId, existing, origin: existing.origin ?? null };
  return {
    docId,
    existing: null,
    origin: {
      docId,
      label: my.name,
      importedAt: now,
      keptApart: known.some((t) => speciesKey(t) === speciesKey(my)),
    },
  };
}

export interface AppliedImport {
  /** The canonical team the imported boards ended up under. */
  my: StoredTeam;
  /** Every board of the document, in document order, as saved library entries. */
  entries: SavedMatchup[];
  /** The subset that was actually created or changed — what's worth mirroring
   * to the account, and what makes this import more than a no-op. */
  written: SavedMatchup[];
  /** Pairings this browser didn't have. */
  added: number;
  /** Pairings it had, whose plan the document changed. */
  updated: number;
  /** Pairings already byte-identical to the document: left exactly alone, not
   * even re-stamped with a new `savedAt`. */
  unchanged: number;
  /** True when the document's group was here and the document renames it. */
  renamed: boolean;
  /** Plans for these same six Pokémon in *another* group, left as they were. */
  untouched: number;
  /** True when the document had to be kept apart from a team already here. */
  keptApart: boolean;
}

/**
 * The board's content, id-free — the same fingerprint the board page's dirty
 * check uses, so "identical" means the same thing in both places.
 */
const boardPrint = (my: StoredTeam, opp: StoredTeam, nodes: TurnNode[]) =>
  encodeGroup(my, [{ opp, nodes }]);

/**
 * Writes the document into the library and reports what it did. Every board is
 * saved, including the first — the board page used to leave that one unsaved
 * and mint a fresh id on Save, which is how the same pair ended up with two
 * entries.
 *
 * A board identical to the one already stored is **not** rewritten: re-pasting
 * a document you already have should be a no-op, not a fresh `savedAt` that
 * reorders your list and re-uploads rows that didn't change.
 */
export function applyGroupImport(doc: DecodedGroup): AppliedImport {
  const now = new Date().toISOString();
  const before = loadMatchups();
  const plan = planImport(
    doc.my,
    doc.docId ?? fallbackDocId(doc.my),
    knownTeams(),
    now,
  );
  const my = rememberTeam({
    ...doc.my,
    ...(plan.existing ? { id: plan.existing.id } : {}),
    ...(plan.origin ? { origin: plan.origin } : {}),
  });

  const written: SavedMatchup[] = [];
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  const entries = doc.boards.map((board) => {
    // Opposing teams are shared freely across groups: they carry no plan (the
    // plan hangs off the pair), so reusing one keeps the library tidy and is
    // safe now that `my.id` is what separates two authors' work. `keepName`
    // stops the document from renaming an opponent already here.
    const opp = rememberTeam(board.opp, { keepName: true });
    const existing = findPairMatchup(loadMatchups(), my.id, opp.id);
    if (
      existing &&
      boardPrint(my, existing.setup.opp, existing.nodes) ===
        boardPrint(my, opp, board.nodes)
    ) {
      unchanged += 1;
      return existing;
    }
    const entry: SavedMatchup = {
      id: existing?.id ?? crypto.randomUUID(),
      name: existing?.name ?? `${my.name} vs ${opp.name}`,
      setup: { my, opp },
      nodes: board.nodes,
      savedAt: now,
    };
    if (existing) updated += 1;
    else added += 1;
    upsertMatchup(entry);
    written.push(entry);
    return entry;
  });

  return {
    my,
    entries,
    written,
    added,
    updated,
    unchanged,
    renamed: Boolean(plan.existing && plan.existing.name !== my.name),
    untouched: before.filter(
      (m) =>
        m.setup.my.id !== my.id && speciesKey(m.setup.my) === speciesKey(my),
    ).length,
    keptApart: Boolean(plan.origin?.keptApart),
  };
}

/**
 * The line an import panel shows: what arrived, what changed, and what was left
 * alone. "Imported 3 matchups" when three identical rows were already there is
 * a lie the author can act on, so a no-op says so plainly.
 */
export function importSummary(
  applied: AppliedImport,
  lang: Lang = "en",
): string {
  const { added, updated, unchanged, untouched, my } = applied;
  const total = applied.entries.length;
  const t = (key: string, params?: Params) => translate(lang, key, params);
  const counted = (k: number) => count(lang, k, "matchup", "matchups");

  if (applied.written.length === 0) {
    // Branch on the number, never on the rendered text. This used to compare
    // `count === "1 matchup"`, which the moment a translation existed would
    // have been false in every language including a reworded English one.
    if (applied.renamed) {
      return total === 1
        ? t(
            "Already had this matchup — no plan changed; the set is now called “{team}”.",
            { team: my.name },
          )
        : t(
            "Already had these {count} — no plan changed; the set is now called “{team}”.",
            { count: counted(total), team: my.name },
          );
    }
    return total === 1
      ? t(
          "Nothing to import — you already have this exact matchup for {team}.",
          { team: my.name },
        )
      : t(
          "Nothing to import — you already have these exact {count} for {team}.",
          { count: counted(total), team: my.name },
        );
  }

  const parts = [
    added > 0 ? t("{n} new", { n: added }) : "",
    updated > 0 ? t("{n} updated", { n: updated }) : "",
    unchanged > 0 ? t("{n} already identical", { n: unchanged }) : "",
  ].filter(Boolean);
  // A single part is already stated by the sentence itself; only a mix needs
  // spelling out.
  const detail =
    parts.length > 1
      ? t("detail| — {parts}", { parts: parts.join(t("list|, ")) })
      : "";

  if (applied.keptApart) {
    const head = t("Imported {count} as a separate set for {team}{detail}", {
      count: counted(total),
      team: my.name,
      detail,
    });
    if (untouched === 0) return t("sentence|{head}.", { head });
    const tail =
      untouched === 1
        ? t("your 1 for this team was left alone.")
        : t("your {n} for this team were left alone.", { n: untouched });
    return detail
      ? t("clause|{head}; {tail}", { head, tail })
      : t("clause|{head} — {tail}", { head, tail });
  }
  return t("Imported {count} for {team}{detail}.", {
    count: counted(total),
    team: my.name,
    detail,
  });
}
