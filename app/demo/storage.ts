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

export interface SavedWorkflow {
  version: 1;
  setup: SimSetup;
  nodes: TurnNode[];
  savedAt: string;
}

const KEYS = {
  setup: "xatu-demo:setup",
  teams: "xatu-demo:teams",
  workflow: "xatu-demo:workflow",
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

export const loadWorkflow = () => read<SavedWorkflow>(KEYS.workflow);
export const saveWorkflow = (wf: SavedWorkflow) => write(KEYS.workflow, wf);
export const clearWorkflow = () => {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEYS.workflow);
};
