import { rosterCode } from "@/lib/match";
import type { ParsedMon } from "@/lib/schema";

/**
 * Browser-side persistence for the demo: imported teams and the saved matchup
 * workflow. localStorage only ("may support account save later" — sketch).
 */

export interface StoredTeam {
  id: string;
  name: string;
  format: string;
  exportText: string;
  parsed: ParsedMon[];
}

export interface SideState {
  front: string[]; // species, ≤2
  back: string[]; // species, ≤2
  fainted: string[];
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

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full/unavailable — demo tolerates silently
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
const speciesKey = (team: StoredTeam) =>
  rosterCode(team.parsed.map((m) => m.species));

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
 *    match a team imported from a full Showdown export. When they do match,
 *    whichever copy has the longer export text wins, so pasting a roster over
 *    a team that has real sets doesn't throw the sets away.
 */
export function rememberTeam(team: StoredTeam): StoredTeam {
  const teams = loadSavedTeams();
  const pool = [
    ...teams,
    ...loadMatchups().flatMap((m) => [m.setup.my, m.setup.opp]),
  ];
  const match =
    pool.find((t) => t.exportText === team.exportText) ??
    pool.find((t) => speciesKey(t) === speciesKey(team));
  const fuller =
    match && match.exportText.length > team.exportText.length ? match : team;
  const canonical = match ? { ...fuller, id: match.id, name: team.name } : team;
  write(
    KEYS.teams,
    [canonical, ...teams.filter((t) => t.id !== canonical.id)].slice(0, 40),
  );
  return canonical;
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

export function upsertMatchup(matchup: SavedMatchup) {
  const rest = loadMatchups().filter((m) => m.id !== matchup.id);
  write(KEYS.matchups, [matchup, ...rest]);
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

/** Which library entry the sim page is editing (null = a fresh board). */
export const loadActiveMatchupId = () => read<string>(KEYS.activeMatchup);
export function setActiveMatchupId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) write(KEYS.activeMatchup, id);
  else window.localStorage.removeItem(KEYS.activeMatchup);
}
