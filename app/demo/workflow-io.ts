import { Icons } from "@pkmn/img";
import type { SideState, SimSetup, StoredTeam, TurnNode } from "./storage";

/**
 * Compact workflow codec — the copy/paste artifact for the sim board.
 *
 * The graph needs only: two rosters (name + six species) and the node tree.
 * Everything else in the verbose form is redundant for reproducing it:
 * - turn numbers are tree depth (a child is always parent.turn + 1; an
 *   alternate shares its sibling's parent, so depth still works);
 * - Pokémon are indexed 0–5 into their roster, so a side state packs into
 *   "front|back|fainted|moves|mega" digit groups, e.g. "01|23" or "0|23|1";
 *   trailing empty groups are stripped, so older 4-group payloads still read;
 * - node ids are array positions; a node is [parentIndex (1-based, 0 = root),
 *   myState, oppState, note?]. Parents always precede children.
 *
 * Import policy (dev phase): structurally broken payloads and unknown Pokémon
 * are REJECTED with an error; rule-breaking but readable states (overstuffed
 * front, duplicate placements, bad parent refs) are imported after
 * sanitization, each fix reported as a WARNING so the author sees what was
 * wrong. Import accepts both this and the legacy verbose form.
 */

interface CompactTeam {
  n: string; // name
  f: string; // format label
  s: string[]; // six species
}

/** [parentIndex, myState, oppState, note?] — note omitted when empty. */
type CompactNode = [number, string, string] | [number, string, string, string];

export interface CompactWorkflow {
  v: 2;
  my: CompactTeam;
  op: CompactTeam;
  t: CompactNode[];
}

export type DecodeResult =
  | { ok: true; setup: SimSetup; nodes: TurnNode[]; warnings: string[] }
  | { ok: false; error: string };

/** "ally:Species" / "foe:Species" → its parts, or null if malformed. */
export function parseTargetRef(
  ref: string,
): { kind: "ally" | "foe"; species: string } | null {
  if (ref.startsWith("ally:")) return { kind: "ally", species: ref.slice(5) };
  if (ref.startsWith("foe:")) return { kind: "foe", species: ref.slice(4) };
  return null;
}

function encodeSide(
  side: SideState,
  roster: string[],
  foeRoster: string[],
  foeFront: string[],
): string {
  const group = (xs: string[]) =>
    xs
      .map((s) => roster.indexOf(s))
      .filter((i) => i >= 0)
      .join("");
  // Declared moves ride in a 4th group as digit:MoveName pairs, optionally
  // suffixed with a target (">a0" ally / ">f1" foe roster digit) — only for
  // front Pokémon, only when set, so unused moves cost zero bytes.
  const moves = side.moves
    ? Object.entries(side.moves)
        .filter(([sp]) => side.front.includes(sp) && roster.indexOf(sp) >= 0)
        .map(([sp, mv]) => {
          let entry = `${roster.indexOf(sp)}:${mv}`;
          const parsed = side.targets?.[sp]
            ? parseTargetRef(side.targets[sp])
            : null;
          if (parsed) {
            const onField =
              parsed.kind === "ally"
                ? side.front.includes(parsed.species)
                : foeFront.includes(parsed.species);
            const digit = (parsed.kind === "ally" ? roster : foeRoster).indexOf(
              parsed.species,
            );
            if (onField && digit >= 0) {
              entry += `>${parsed.kind === "ally" ? "a" : "f"}${digit}`;
            }
          }
          return entry;
        })
        .join(",")
    : "";
  // A recorded Mega rides in a 5th group as the front Pokémon's roster digit.
  const mega =
    side.mega &&
    side.front.includes(side.mega) &&
    roster.indexOf(side.mega) >= 0
      ? String(roster.indexOf(side.mega))
      : "";
  return [group(side.front), group(side.back), group(side.fainted), moves, mega]
    .join("|")
    .replace(/\|+$/, "");
}

export function encodeWorkflow(setup: SimSetup, nodes: TurnNode[]): string {
  const myRoster = setup.my.parsed.map((m) => m.species);
  const opRoster = setup.opp.parsed.map((m) => m.species);
  const index = new Map(nodes.map((n, i) => [n.id, i + 1]));
  const compact: CompactWorkflow = {
    v: 2,
    my: { n: setup.my.name, f: setup.my.format, s: myRoster },
    op: { n: setup.opp.name, f: setup.opp.format, s: opRoster },
    t: nodes.map((n): CompactNode => {
      const base: CompactNode = [
        n.parentId ? (index.get(n.parentId) ?? 0) : 0,
        encodeSide(n.my, myRoster, opRoster, n.opp.front),
        encodeSide(n.opp, opRoster, myRoster, n.my.front),
      ];
      return n.note?.trim() ? [...base, n.note.trim()] : base;
    }),
  };
  return JSON.stringify(compact);
}

/** The icon sheet doubles as a dex: unknown species fall back to index 0. */
function isKnownSpecies(species: string): boolean {
  const { css } = Icons.getPokemon(species);
  return !/scroll 0px 0px/.test(css.background ?? "");
}

function unknownSpeciesError(rosters: string[][]): string | null {
  const unknown = rosters.flat().filter((s) => !isKnownSpecies(s));
  if (unknown.length === 0) return null;
  return `Unknown Pokémon: ${[...new Set(unknown)].join(", ")} — not importing.`;
}

/**
 * Sanitizes rather than rejects, reporting each fix: unknown digits are
 * dropped, a Pokémon appearing in two groups keeps its first placement, and
 * front/back overflow beyond two is dropped to the bench.
 */
function decodeSide(
  code: string,
  roster: string[],
  foeRoster: string[],
  label: string,
  warn: (msg: string) => void,
): SideState {
  const [f = "", b = "", ft = "", mv = "", mg = ""] = code.split("|");
  const seen = new Set<string>();
  const list = (digits: string, cap: number, group: string) => {
    const out: string[] = [];
    for (const c of digits) {
      const species = roster[Number(c)];
      if (!species) {
        warn(`${label}: reference "${c}" is off the roster — dropped.`);
        continue;
      }
      if (seen.has(species)) {
        warn(
          `${label}: ${species} was placed twice — kept its first placement.`,
        );
        continue;
      }
      if (out.length >= cap) {
        warn(
          `${label}: ${group} had more than ${cap} — ${species} moved to the bench.`,
        );
        continue;
      }
      seen.add(species);
      out.push(species);
    }
    return out;
  };
  const side: SideState = {
    front: list(f, 2, "front"),
    back: list(b, 2, "back"),
    fainted: list(ft, 6, "fainted"),
  };
  if (mv) {
    const moves: Record<string, string> = {};
    const targets: Record<string, string> = {};
    for (const entry of mv.split(",")) {
      const [head, targetPart] = entry.split(">");
      const match = /^(\d):(.+)$/.exec(head);
      if (!match) {
        warn(`${label}: unreadable move entry "${entry}" — dropped.`);
        continue;
      }
      const species = roster[Number(match[1])];
      if (!species) {
        warn(`${label}: a move points off the roster — dropped.`);
        continue;
      }
      if (!side.front.includes(species)) {
        warn(
          `${label}: ${species} has a move but isn't in front — move dropped.`,
        );
        continue;
      }
      moves[species] = match[2];
      if (targetPart) {
        const target = /^([af])(\d)$/.exec(targetPart);
        const targetSpecies = target
          ? (target[1] === "a" ? roster : foeRoster)[Number(target[2])]
          : undefined;
        if (!targetSpecies) {
          warn(`${label}: ${species}'s move target is unreadable — dropped.`);
        } else {
          targets[species] =
            `${target![1] === "a" ? "ally" : "foe"}:${targetSpecies}`;
        }
      }
    }
    if (Object.keys(moves).length > 0) side.moves = moves;
    if (Object.keys(targets).length > 0) side.targets = targets;
  }
  if (mg) {
    const species = roster[Number(mg)];
    if (!species) {
      warn(`${label}: the recorded Mega points off the roster — dropped.`);
    } else if (!side.front.includes(species)) {
      warn(`${label}: ${species} Megas but isn't in front — dropped.`);
    } else {
      side.mega = species;
    }
  }
  return side;
}

/** Targets must point at one of the four on-field Pokémon; the foe side is
 * only known once both sides are decoded, so this runs per node afterward. */
function validateTargets(
  side: SideState,
  foe: SideState,
  label: string,
  warn: (msg: string) => void,
) {
  if (!side.targets) return;
  for (const [attacker, ref] of Object.entries(side.targets)) {
    const parsed = parseTargetRef(ref);
    const onField =
      parsed &&
      (parsed.kind === "ally" ? side.front : foe.front).includes(
        parsed.species,
      );
    if (!side.moves?.[attacker] || !onField) {
      warn(`${label}: ${attacker}'s move target isn't on the field — dropped.`);
      delete side.targets[attacker];
    }
  }
  if (Object.keys(side.targets).length === 0) delete side.targets;
}

function teamFromCompact(t: CompactTeam): StoredTeam {
  const species = t.s.slice(0, 6);
  return {
    id: crypto.randomUUID(),
    name: typeof t.n === "string" && t.n ? t.n : "Imported team",
    format: typeof t.f === "string" ? t.f : "",
    exportText: species.join("\n\n"),
    parsed: species.map((s) => ({ species: s, moves: [] })),
  };
}

export function decodeWorkflow(text: string): DecodeResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That isn't valid JSON." };
  }
  if (typeof data !== "object" || data === null) {
    return { ok: false, error: "That isn't a workflow document." };
  }

  // Legacy verbose form — validate species, then pass through.
  const legacy = data as {
    version?: number;
    setup?: SimSetup;
    nodes?: TurnNode[];
  };
  if (legacy.version === 1 && legacy.setup && Array.isArray(legacy.nodes)) {
    if (!legacy.setup.my?.parsed || !legacy.setup.opp?.parsed) {
      return { ok: false, error: "The workflow's teams are malformed." };
    }
    const speciesError = unknownSpeciesError([
      legacy.setup.my.parsed.map((m) => m.species),
      legacy.setup.opp.parsed.map((m) => m.species),
    ]);
    if (speciesError) return { ok: false, error: speciesError };
    return { ok: true, setup: legacy.setup, nodes: legacy.nodes, warnings: [] };
  }

  const compact = data as Partial<CompactWorkflow>;
  if (
    compact.v !== 2 ||
    !compact.my ||
    !compact.op ||
    !Array.isArray(compact.t)
  ) {
    return { ok: false, error: "That isn't a workflow document." };
  }
  const validTeam = (t: CompactTeam | undefined) =>
    t &&
    Array.isArray(t.s) &&
    t.s.length > 0 &&
    t.s.every((s) => typeof s === "string");
  if (!validTeam(compact.my) || !validTeam(compact.op)) {
    return { ok: false, error: "The workflow's teams are malformed." };
  }
  const validNode = (el: unknown): el is CompactNode =>
    Array.isArray(el) &&
    typeof el[0] === "number" &&
    typeof el[1] === "string" &&
    typeof el[2] === "string";
  if (!compact.t.every(validNode)) {
    return { ok: false, error: "The workflow's turn list is malformed." };
  }
  if (compact.t.length === 0) {
    return { ok: false, error: "The workflow has no turns." };
  }

  const myRoster = compact.my.s.slice(0, 6);
  const opRoster = compact.op.s.slice(0, 6);
  const speciesError = unknownSpeciesError([myRoster, opRoster]);
  if (speciesError) return { ok: false, error: speciesError };

  const warnings: string[] = [];
  const warn = (msg: string) => {
    if (!warnings.includes(msg)) warnings.push(msg);
  };
  const setup: SimSetup = {
    my: teamFromCompact(compact.my),
    opp: teamFromCompact(compact.op),
  };
  const ids = compact.t.map(() => crypto.randomUUID());
  const turns: number[] = [];
  const nodes: TurnNode[] = compact.t.map(
    ([parent, myCode, opCode, note], i) => {
      let parentIdx = -1;
      if (parent > 0 && parent <= i) {
        parentIdx = parent - 1;
      } else if (parent !== 0) {
        warn(
          `Card ${i + 1}: invalid parent reference — treated as an alternate turn 1.`,
        );
      }
      turns[i] = parentIdx >= 0 ? turns[parentIdx] + 1 : 1;
      // Display numbering starts at turn 0 — the team-preview node.
      const label = `Card ${i + 1} (turn ${turns[i] - 1})`;
      const my = decodeSide(
        myCode,
        myRoster,
        opRoster,
        `${label}, my side`,
        warn,
      );
      const opp = decodeSide(
        opCode,
        opRoster,
        myRoster,
        `${label}, opposing side`,
        warn,
      );
      if (turns[i] === 1) {
        // Turn 0 is team preview: positions only, no declared moves.
        for (const side of [my, opp]) {
          if (side.moves) {
            warn(`${label}: moves aren't recorded at team preview — dropped.`);
            delete side.moves;
            delete side.targets;
          }
        }
      }
      validateTargets(my, opp, `${label}, my side`, warn);
      validateTargets(opp, my, `${label}, opposing side`, warn);
      return {
        id: ids[i],
        turn: turns[i],
        parentId: parentIdx >= 0 ? ids[parentIdx] : null,
        my,
        opp,
        ...(typeof note === "string" && note ? { note } : {}),
      };
    },
  );
  return { ok: true, setup, nodes, warnings };
}
