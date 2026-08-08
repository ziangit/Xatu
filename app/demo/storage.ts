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

/** One saved matchup board — a team pair plus its turn tree. The browser
 * keeps a library of these; a future account sync maps each to a DB row. */
export interface SavedMatchup {
  id: string;
  name: string;
  setup: SimSetup;
  nodes: TurnNode[];
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
export function rememberTeam(team: StoredTeam) {
  const teams = loadSavedTeams().filter(
    (t) => t.exportText !== team.exportText,
  );
  write(KEYS.teams, [team, ...teams].slice(0, 12));
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
