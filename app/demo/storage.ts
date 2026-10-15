import { rosterCode } from "@/lib/match";
import type { ParsedMon } from "@/lib/schema";

/**
 * Browser-side persistence for the demo: imported teams and the saved matchup
 * workflow. localStorage only ("may support account save later" — sketch).
 */

/**
 * Where a team came from, when it didn't come from this browser. Absent means
 * "mine" — pasted or typed in here.
 *
 * This is the second half of a team's identity; the roster is the first half,
 * and the roster alone *used* to be the whole of it. That made someone else's
 * shared guide for the same archetype indistinguishable from my own team, so
 * importing it overwrote my plans opponent by opponent. Two authors' plans for
 * the same six Pokémon are two different things and both are kept
 * (user, 2026-08-14); deduplicating them is a delete the author performs, not
 * something an import decides.
 */
export interface TeamOrigin {
  /** The document's `g` stamp — stable across the sharer's edits, so their
   * updated guide updates this group instead of forking a third one.
   * **Always recorded on import**, collision or not: without it a document
   * pasted twice has nothing to recognise itself by and forks a second group. */
  docId: string;
  /** What the document called the team when it arrived. */
  label: string;
  importedAt: string;
  /**
   * True when a team with these same six was already here, so this one is a
   * *parallel* group rather than simply a new one. It is the only flag that
   * changes behaviour: it badges the group, and it scopes `rememberTeam` so the
   * two never merge. False means "arrived in a paste, but nothing to keep it
   * apart from" — a guide for a team I don't own, or my own group restored into
   * an empty browser, both of which should behave like any team of mine.
   */
  keptApart: boolean;
}

export interface StoredTeam {
  id: string;
  name: string;
  format: string;
  exportText: string;
  parsed: ParsedMon[];
  /** Set only on a team that arrived in a pasted document (see TeamOrigin). */
  origin?: TeamOrigin;
}

export interface SideState {
  front: string[]; // species, ≤2
  back: string[]; // species, ≤2
  fainted: string[];
  /**
   * Stat stages per species, −6..+6 — author-stated, never inferred. xatu does
   * not apply Intimidate for you: reading a stat change off an ability would
   * be deciding what happened, which is the line this project holds.
   */
  boosts?: Record<string, import("./calc").Boosts>;
  /** Front species whose declared move is a critical hit. */
  crit?: string[];
  /** Declared move per FRONT species — optional; recording only, never computed. */
  moves?: Record<string, string>;
  /** Optional move target per attacker: "ally:Species" | "foe:Species",
   * one of the four Pokémon on the field. Only meaningful with a move. */
  targets?: Record<string, string>;
  /** The Pokémon that is Mega Evolved on this side as of this card — declared
   * on the turn it happens (a Mega and a move share the same turn) and carried
   * forward, since a Mega-Evolved Pokémon stays Mega. Recording only: xatu
   * never reasons about what the forme does, and the game's one-per-battle
   * limit is the author's business, not ours. */
  mega?: string;
}

export interface TurnNode {
  id: string;
  turn: number;
  parentId: string | null;
  my: SideState;
  opp: SideState;
  /** Optional author note for this state — why this line, what to watch for. */
  note?: string;
  /**
   * Damage calculations, keyed `my:Species` / `opp:Species` — see
   * `app/demo/calc.ts`. Present only while the calculator is on and only while
   * the stored fingerprint still matches the sets; `pruneCalcs` drops the rest
   * before anything is written, so a stored calculation is always true for the
   * board it ships with. Nothing reads the text back as data.
   */
  calcs?: Record<string, import("./calc").CalcNote>;
  /**
   * Weather, terrain and screens on this turn — author-stated, never inferred,
   * exactly like the Mega marker. It belongs to the card because that is what
   * it describes: if it is raining this turn it is raining for every attack on
   * it. The calculator reads it; nothing else does.
   */
  field?: import("./calc").FieldState;
}

export interface SimSetup {
  my: StoredTeam;
  opp: StoredTeam;
}

/**
 * One saved matchup board — a team pair plus its turn tree. The browser keeps
 * a library of these and each maps 1:1 to a `matchups` row in the account.
 *
 * "One team vs many teams" is expressed by GROUPING, not nesting: every entry
 * sharing the same `setup.my.id` is one group (see `groupByMyTeam`). An entry
 * with `nodes: []` is a pairing the author has lined up but not planned yet —
 * the sim page seeds a fresh board for it on open.
 */
export interface SavedMatchup {
  id: string;
  name: string;
  setup: SimSetup;
  nodes: TurnNode[];
  savedAt: string;
}

/** All the boards built with one of the author's teams, newest first. */
export interface MatchupGroup {
  /** `setup.my.id` — stable across re-imports of the same export text. */
  teamId: string;
  /** The freshest copy of the team as saved on one of its boards. */
  team: StoredTeam;
  matchups: SavedMatchup[];
  /** Most recent `savedAt` in the group. */
  savedAt: string;
}

/** Legacy single-slot save (pre-library). Migrated on first read. */
interface LegacyWorkflow {
  version: 1;
  setup: SimSetup;
  nodes: TurnNode[];
  savedAt: string;
}

const KEYS = {
  setup: "xatu-demo:setup",
  teams: "xatu-demo:teams",
  workflow: "xatu-demo:workflow", // legacy — migrated into `matchups`
  matchups: "xatu-demo:matchups",
  activeMatchup: "xatu-demo:active-matchup",
  calculator: "xatu-demo:calculator",
};

/**
 * The damage calculator switch — a per-browser preference about the editor,
 * never a property of a guide. See `app/demo/calc.ts`.
 */
export const loadCalcOn = (): boolean => {
  try {
    return window.localStorage.getItem(KEYS.calculator) === "on";
  } catch {
    return false;
  }
};
export const saveCalcOn = (on: boolean) => {
  try {
    window.localStorage.setItem(KEYS.calculator, on ? "on" : "off");
  } catch {
    // A browser with storage blocked still gets a working calculator, it just
    // forgets the choice — same tolerance as everything else that reads here.
  }
};

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Write, and **say whether it worked**.
 *
 * This used to swallow the failure, which is the worst thing it could do: a
 * browser with full storage loses a board and says nothing. The quota is a
 * real ceiling (a few MB per origin), and the symptom of hitting it is silent
 * data loss, not an error anyone sees.
 */
function write(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadSetup = () => read<SimSetup>(KEYS.setup);
export const saveSetup = (setup: SimSetup) => write(KEYS.setup, setup);

export const loadSavedTeams = () => read<StoredTeam[]>(KEYS.teams) ?? [];

/**
 * A team's identity: the same six Pokémon in any order, with in-battle formes
 * collapsed. Shared with the catalogue and the matcher (lib/match/roster), and
 * order-independent on purpose — comparing paste order made the same team
 * imported twice into two teams, splitting its group.
 */
export const speciesKey = (team: StoredTeam) =>
  rosterCode(team.parsed.map((m) => m.species));

/**
 * Is this team a parallel group standing beside one of mine?
 *
 * Tolerant of an `origin` written before `keptApart` existed (a build from
 * 2026-08-14 that only stamped provenance on a collision): absent means it was
 * a collision, which is the safe reading — the alternative silently merges two
 * authors' groups on the next paste.
 */
export const isKeptApart = (team: StoredTeam) =>
  Boolean(team.origin) && team.origin!.keptApart !== false;

/**
 * Teams only merge with teams of the same provenance — and only a team that had
 * to be *kept apart* has a provenance of its own. A pasted team with nothing to
 * collide with pools with mine, so pasting the full Showdown export for it
 * afterwards enriches that team instead of starting a second one.
 */
const originKey = (team: StoredTeam) =>
  isKeptApart(team) ? team.origin!.docId : "";

/**
 * The identity of the group a team heads: its own id when the team is mine,
 * the document's when it arrived in one. Stamped into copied documents so a
 * re-paste finds its way back to the same group.
 */
export const groupDocId = (team: StoredTeam) => team.origin?.docId ?? team.id;

/** Every team this browser knows about, including ones only a board references. */
export function knownTeams(): StoredTeam[] {
  return [
    ...loadSavedTeams(),
    ...loadMatchups().flatMap((m) => [m.setup.my, m.setup.opp]),
  ];
}

/**
 * Remembers a team and returns the canonical copy — the same team imported
 * twice keeps one id, so its boards keep grouping together.
 *
 * Identity is checked against the team library *and* the teams referenced by
 * saved boards: a board pulled down from the account (or one whose team fell
 * off the 40-team cap) still counts as having that team, and a paste for it
 * must not start a second group.
 *
 * Two ways to match, in order:
 * 1. identical export text — unambiguously the same team;
 * 2. the same six species in the same order — a pasted matchup carries only
 *    rosters (the compact codec has no sets), so it would otherwise never
 *    match a team imported from a full Showdown export.
 *
 * When two copies match, which one's sets survive depends on where this one
 * came from, and **the caller has to say** — `authoritative`:
 *
 * - A paste the user just typed into the import panel is the truth. It wins
 *   outright, even when it is *shorter* than what is stored. Without this the
 *   only tie-break is export length, and editing "High Horsepower" down to
 *   "Superpower" makes the stored copy longer and therefore the winner — the
 *   edit is silently discarded, and re-importing never fixes it.
 * - A team arriving inside a shared document is not. The compact codec has no
 *   sets, so its teams are bare rosters; length is the right guard there,
 *   because a 72-byte roster must not overwrite a 948-byte set.
 *
 * Both are scoped to one provenance (see TeamOrigin): my teams merge with my
 * teams, and a team from a shared document merges only with the same document.
 * `keepName` protects a team already here from being renamed by a document
 * that happens to name the same six Pokémon differently.
 */
export function rememberTeam(
  team: StoredTeam,
  {
    keepName = false,
    authoritative = false,
  }: { keepName?: boolean; authoritative?: boolean } = {},
): StoredTeam {
  const teams = loadSavedTeams();
  const pool = knownTeams().filter((t) => originKey(t) === originKey(team));
  const match =
    pool.find((t) => t.exportText === team.exportText) ??
    pool.find((t) => speciesKey(t) === speciesKey(team));
  const fuller =
    !authoritative && match && match.exportText.length > team.exportText.length
      ? match
      : team;
  const canonical = match
    ? {
        ...fuller,
        id: match.id,
        name: keepName ? match.name : team.name,
        // Provenance belongs to the team that's here unless the caller brought
        // one: a full Showdown export pasted over a team that arrived in a
        // document must not cost that group the id it is known by.
        ...((team.origin ?? match.origin)
          ? { origin: team.origin ?? match.origin }
          : {}),
      }
    : team;
  write(
    KEYS.teams,
    [canonical, ...teams.filter((t) => t.id !== canonical.id)].slice(0, 40),
  );
  // A board stores its own copy of both teams, so updating the library alone
  // leaves every existing board showing the sets it was saved with. Only an
  // authoritative paste may rewrite them — a document must never reach in and
  // replace real sets with its bare rosters.
  if (authoritative && match) syncTeamIntoBoards(canonical);
  return canonical;
}

/**
 * Replace this team wherever the browser keeps a copy: every saved board's
 * `setup`, and the in-progress setup. Matched by id, so it only ever touches
 * boards that already meant this team.
 *
 * Plans are untouched. A move recorded on a card is a record of what you
 * intended that turn — if the set no longer has it, that is for you to change,
 * not for an import to erase.
 *
 * Safe for the dirty-check: `encodeWorkflow` covers species and the plan, and
 * sets are in neither. Renaming does move the fingerprint, since a team's name
 * is encoded — the board simply reads as edited, which it is.
 */
function syncTeamIntoBoards(team: StoredTeam): void {
  const matchups = loadMatchups();
  let touched = false;
  const next = matchups.map((m) => {
    const my = m.setup.my.id === team.id ? team : m.setup.my;
    const opp = m.setup.opp.id === team.id ? team : m.setup.opp;
    if (my === m.setup.my && opp === m.setup.opp) return m;
    touched = true;
    return { ...m, setup: { my, opp } };
  });
  if (touched) write(KEYS.matchups, next);

  const setup = loadSetup();
  if (!setup) return;
  if (setup.my.id === team.id) saveSetup({ ...setup, my: team });
  else if (setup.opp.id === team.id) saveSetup({ ...setup, opp: team });
}

/**
 * Rename a team everywhere it is known. Names are shown from the team object
 * (board title, group header, opponent rows), so this is all the UI needs —
 * `SavedMatchup.name` is data written once at creation and deliberately left
 * as it was.
 */
export function renameTeam(id: string, name: string): StoredTeam | null {
  const trimmed = name.trim();
  const current = knownTeams().find((t) => t.id === id);
  if (!current || !trimmed || trimmed === current.name) return null;
  const renamed = { ...current, name: trimmed };
  const teams = loadSavedTeams();
  write(
    KEYS.teams,
    [renamed, ...teams.filter((t) => t.id !== id)].slice(0, 40),
  );
  syncTeamIntoBoards(renamed);
  return renamed;
}

/** The matchup library, newest first. Migrates the legacy single-slot save
 * into the list the first time it's read. */
export function loadMatchups(): SavedMatchup[] {
  const matchups = read<SavedMatchup[]>(KEYS.matchups) ?? [];
  const legacy = read<LegacyWorkflow>(KEYS.workflow);
  if (!legacy?.setup || !Array.isArray(legacy.nodes)) return matchups;
  const migrated: SavedMatchup = {
    id: crypto.randomUUID(),
    name: `${legacy.setup.my.name} vs ${legacy.setup.opp.name}`,
    setup: legacy.setup,
    nodes: legacy.nodes,
    savedAt: legacy.savedAt,
  };
  const all = [migrated, ...matchups];
  write(KEYS.matchups, all);
  window.localStorage.removeItem(KEYS.workflow);
  return all;
}

/**
 * How many matchups one browser will hold.
 *
 * A ceiling against runaway storage, never a product limit. localStorage is a
 * few megabytes per origin, and the largest board measured is 7.7KB — so 300
 * is about 2.2MB worst case, with room to spare for teams and settings. For
 * scale, the heaviest real account holds **20**. Nobody planning real teams
 * will meet this; a loop that forks a set a thousand times will.
 */
export const MAX_MATCHUPS = 300;

export type SaveResult =
  | { ok: true }
  /** The browser refused the write — almost always a full quota. */
  | { ok: false; reason: "full" }
  /** This browser already holds `MAX_MATCHUPS`, and this one is new. */
  | { ok: false; reason: "limit" };

/**
 * Store a matchup, replacing any entry with the same id.
 *
 * **An existing matchup is always allowed through**, cap or no cap: the limit
 * exists to stop storage running away, and refusing to save work already in
 * progress would make it cost exactly what it was meant to protect. Only a
 * *new* matchup can be turned away.
 */
export function upsertMatchup(matchup: SavedMatchup): SaveResult {
  const all = loadMatchups();
  const existing = all.some((m) => m.id === matchup.id);
  if (!existing && all.length >= MAX_MATCHUPS)
    return { ok: false, reason: "limit" };
  const rest = all.filter((m) => m.id !== matchup.id);
  return write(KEYS.matchups, [matchup, ...rest])
    ? { ok: true }
    : { ok: false, reason: "full" };
}

/**
 * One team vs many: bucket boards by the author's team. Purely derived — no
 * separate group record to keep in sync, so boards saved before grouping
 * existed (and boards pulled down from the account) group themselves.
 */
export function groupByMyTeam(matchups: SavedMatchup[]): MatchupGroup[] {
  const groups = new Map<string, MatchupGroup>();
  for (const m of matchups) {
    const teamId = m.setup.my.id;
    const group = groups.get(teamId);
    if (!group) {
      groups.set(teamId, {
        teamId,
        team: m.setup.my,
        matchups: [m],
        savedAt: m.savedAt,
      });
      continue;
    }
    group.matchups.push(m);
    if (m.savedAt > group.savedAt) {
      group.savedAt = m.savedAt;
      group.team = m.setup.my;
    }
  }
  for (const group of groups.values()) {
    group.matchups.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }
  return [...groups.values()].sort((a, b) =>
    b.savedAt.localeCompare(a.savedAt),
  );
}

/** The board for a team pair, if the author already has one. */
export function findPairMatchup(
  matchups: SavedMatchup[],
  myId: string,
  oppId: string,
): SavedMatchup | undefined {
  const pair = matchups.filter(
    (m) => m.setup.my.id === myId && m.setup.opp.id === oppId,
  );
  return pair.find((m) => m.nodes.length > 0) ?? pair[0];
}

export function deleteMatchup(id: string) {
  write(
    KEYS.matchups,
    loadMatchups().filter((m) => m.id !== id),
  );
  if (loadActiveMatchupId() === id) setActiveMatchupId(null);
}

/**
 * Drop teams that nothing points at any more — called after deleting a whole
 * set, so a group you threw away stops being offered by "use existing" (and,
 * for an imported one, stops answering to its document id).
 *
 * Only the ids handed in are even considered, and only when no remaining board
 * and no in-progress setup still names them: a team you imported but haven't
 * paired with anyone yet is referenced by neither, and must survive.
 */
export function forgetTeams(ids: string[]) {
  if (ids.length === 0) return;
  const live = new Set<string>();
  for (const m of loadMatchups()) {
    live.add(m.setup.my.id);
    live.add(m.setup.opp.id);
  }
  const setup = loadSetup();
  if (setup) {
    live.add(setup.my.id);
    live.add(setup.opp.id);
  }
  const doomed = new Set(ids.filter((id) => !live.has(id)));
  if (doomed.size === 0) return;
  write(
    KEYS.teams,
    loadSavedTeams().filter((t) => !doomed.has(t.id)),
  );
}

/** Which library entry the sim page is editing (null = a fresh board). */
export const loadActiveMatchupId = () => read<string>(KEYS.activeMatchup);
export function setActiveMatchupId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) write(KEYS.activeMatchup, id);
  else window.localStorage.removeItem(KEYS.activeMatchup);
}
