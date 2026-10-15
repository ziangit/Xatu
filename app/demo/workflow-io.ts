import { Icons } from "@pkmn/img";
import { translate, type Lang, type Params } from "../i18n/translate";
import type { SideState, SimSetup, StoredTeam, TurnNode } from "./storage";

/**
 * A warning is emitted as a key plus its parameters, never as a finished
 * sentence: the collector in `decodeWorkflowGroup` is the only place that
 * renders one, which is what lets the label prefix, its colon and the
 * multi-board "vs X —" wrapper all be translated rather than concatenated.
 */
type Warn = (key: string, params?: Params) => void;

/**
 * Compact workflow codec — the copy/paste artifact for the sim board.
 *
 * **One team vs. one or many opponents is the same document** (v3, 2026-08-12).
 * A group is one of the author's teams plus N boards, so the payload states `my`
 * once and lists the opponents; a single board is just N = 1. Everything written
 * from now on is v3, so there is one format to copy, paste and reason about —
 * v2 (a bare pair) and v1 (verbose) are still *read*, never written.
 *
 * A board needs only: two rosters (name + six species) and the node tree.
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
 * wrong. Import accepts v3, v2 and the legacy verbose form; with several
 * opponents, each warning names the board it came from.
 */

interface CompactTeam {
  n: string; // name
  f: string; // format label
  s: string[]; // six species
}

/** [parentIndex, myState, oppState, note?] — note omitted when empty. */
/**
 * `[parentIndex, myState, oppState, note?, calcs?]`.
 *
 * `calcs` (v4) is the opt-in calculator's output, keyed `my:Species`. It is an
 * object rather than a group inside the side string because a calculation
 * contains `:` — the move separator — and because free text has always lived
 * at node level for exactly that reason (`note`). Trailing elements stay
 * optional, so every v3 document reads unchanged and a board with no
 * calculations still encodes byte-identically to before.
 */
type CompactCalcs = Record<string, { text: string; print: string }>;
type CompactNode =
  | [number, string, string]
  | [number, string, string, string]
  | [number, string, string, string, CompactCalcs];

/** Legacy: one pair per document. Still read, no longer written. */
export interface CompactWorkflow {
  v: 2;
  my: CompactTeam;
  op: CompactTeam;
  t: CompactNode[];
}

/** One of the author's teams against N opponents — the current format. */
export interface CompactGroup {
  /**
   * 4 only when some node carries a calculation; 3 otherwise.
   *
   * This function is also the board's dirty-check fingerprint, so bumping the
   * version unconditionally would have made **every existing board differ from
   * its stored copy** and re-uploaded the lot. A board with no calculations
   * encodes exactly as it did before the calculator existed.
   */
  v: 3 | 4;
  /**
   * Which group this document *is* — the sharer's own team id, stable across
   * their edits. It answers the one question the rosters can't: a re-paste of
   * this document should update the group it came from, while a stranger's
   * document about the same six Pokémon must land beside mine, not on top of
   * it.
   *
   * Optional, and additive rather than a version bump: v3 documents written
   * before 2026-08-14 don't carry it, and a reader that ignores it still reads
   * everything else. Written only by the copy buttons — see `encodeGroup`.
   */
  g?: string;
  my: CompactTeam;
  /** One entry per opposing team: its roster and its turn tree. */
  b: { op: CompactTeam; t: CompactNode[] }[];
}

/** One opposing team and the plan against it. */
export interface DecodedBoard {
  opp: StoredTeam;
  nodes: TurnNode[];
}

export type DecodeResult =
  | { ok: true; setup: SimSetup; nodes: TurnNode[]; warnings: string[] }
  | { ok: false; error: string };

export type GroupDecodeResult =
  | {
      ok: true;
      /** Shared by every board, so they group under one team on import. */
      my: StoredTeam;
      boards: DecodedBoard[];
      /** The document's `g` stamp; null on v2, legacy and pre-2026-08-14 v3
       * documents, which carry no identity of their own. */
      docId: string | null;
      warnings: string[];
    }
  | { ok: false; error: string };

/** The `ok` half of a decode, for callers that have already checked. */
export type DecodedGroup = Extract<GroupDecodeResult, { ok: true }>;

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

const compactTeam = (team: StoredTeam, roster: string[]): CompactTeam => ({
  n: team.name,
  f: team.format,
  s: roster,
});

function encodeTree(
  nodes: TurnNode[],
  myRoster: string[],
  opRoster: string[],
): CompactNode[] {
  const index = new Map(nodes.map((n, i) => [n.id, i + 1]));
  return nodes.map((n): CompactNode => {
    const base: CompactNode = [
      n.parentId ? (index.get(n.parentId) ?? 0) : 0,
      encodeSide(n.my, myRoster, opRoster, n.opp.front),
      encodeSide(n.opp, opRoster, myRoster, n.my.front),
    ];
    const note = n.note?.trim() ?? "";
    const calcs = n.calcs && Object.keys(n.calcs).length > 0 ? n.calcs : null;
    // `note` is emitted as "" when there are calculations but no note, because
    // positions are the only thing holding the two apart.
    if (calcs) return [...base, note, calcs];
    return note ? [...base, note] : base;
  });
}

/**
 * One team against N opponents. `my` is stated once, so a group of six costs
 * about one roster more than a single board rather than six times as much.
 *
 * `docId` is written only when asked for, because this function is also the
 * board's dirty-check fingerprint and that has to stay id-free: two copies of
 * the same board must encode identically even when their `StoredTeam` objects
 * don't share an id. The copy buttons pass it; `hasUnsavedWork` doesn't.
 */
export function encodeGroup(
  my: StoredTeam,
  boards: DecodedBoard[],
  { docId }: { docId?: string } = {},
): string {
  const myRoster = my.parsed.map((m) => m.species);
  const hasCalcs = boards.some((b) =>
    b.nodes.some((n) => n.calcs && Object.keys(n.calcs).length > 0),
  );
  const group: CompactGroup = {
    v: hasCalcs ? 4 : 3,
    ...(docId ? { g: docId } : {}),
    my: compactTeam(my, myRoster),
    b: boards.map((board) => {
      const opRoster = board.opp.parsed.map((m) => m.species);
      return {
        op: compactTeam(board.opp, opRoster),
        t: encodeTree(board.nodes, myRoster, opRoster),
      };
    }),
  };
  return JSON.stringify(group);
}

/**
 * One board — the same v3 document with a single opponent, so what the board's
 * Copy JSON produces and what a group's copy produces are the same format.
 *
 * Also used as an id-free structural fingerprint for the board's dirty check,
 * so it must stay deterministic for a given (setup, nodes).
 */
export function encodeWorkflow(setup: SimSetup, nodes: TurnNode[]): string {
  return encodeGroup(setup.my, [{ opp: setup.opp, nodes }]);
}

/** The icon sheet doubles as a dex: unknown species fall back to index 0. */
function isKnownSpecies(species: string): boolean {
  const { css } = Icons.getPokemon(species);
  return !/scroll 0px 0px/.test(css.background ?? "");
}

function unknownSpeciesError(
  rosters: string[][],
  lang: Lang = "en",
): string | null {
  const unknown = rosters.flat().filter((s) => !isKnownSpecies(s));
  if (unknown.length === 0) return null;
  // The names themselves are data and stay as the author wrote them; only the
  // sentence around them is translated.
  return translate(lang, "Unknown Pokémon: {names} — not importing.", {
    names: [...new Set(unknown)].join(", "),
  });
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
  warn: Warn,
): SideState {
  const [f = "", b = "", ft = "", mv = "", mg = ""] = code.split("|");
  const seen = new Set<string>();
  const list = (digits: string, cap: number, group: string) => {
    const out: string[] = [];
    for (const c of digits) {
      const species = roster[Number(c)];
      if (!species) {
        warn('{label}: reference "{c}" is off the roster — dropped.', {
          label,
          c,
        });
        continue;
      }
      if (seen.has(species)) {
        warn(
          "{label}: {species} was placed twice — kept its first placement.",
          {
            label,
            species,
          },
        );
        continue;
      }
      if (out.length >= cap) {
        warn(
          "{label}: {group} had more than {cap} — {species} moved to the bench.",
          { label, group, cap, species },
        );
        continue;
      }
      seen.add(species);
      out.push(species);
    }
    return out;
  };
  // The group names are keys, not prose — `warn` translates them in place.
  const side: SideState = {
    front: list(f, 2, "slot|front"),
    back: list(b, 2, "slot|back"),
    fainted: list(ft, 6, "slot|fainted"),
  };
  if (mv) {
    const moves: Record<string, string> = {};
    const targets: Record<string, string> = {};
    for (const entry of mv.split(",")) {
      const [head, targetPart] = entry.split(">");
      const match = /^(\d):(.+)$/.exec(head);
      if (!match) {
        warn('{label}: unreadable move entry "{entry}" — dropped.', {
          label,
          entry,
        });
        continue;
      }
      const species = roster[Number(match[1])];
      if (!species) {
        warn("{label}: a move points off the roster — dropped.", { label });
        continue;
      }
      if (!side.front.includes(species)) {
        warn(
          "{label}: {species} has a move but isn't in front — move dropped.",
          {
            label,
            species,
          },
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
          warn("{label}: {species}'s move target is unreadable — dropped.", {
            label,
            species,
          });
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
      warn("{label}: the recorded Mega points off the roster — dropped.", {
        label,
      });
    } else if (!side.front.includes(species)) {
      warn("{label}: {species} Megas but isn't in front — dropped.", {
        label,
        species,
      });
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
  warn: Warn,
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
      warn("{label}: {attacker}'s move target isn't on the field — dropped.", {
        label,
        attacker,
      });
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

const validTeam = (t: CompactTeam | undefined) =>
  Boolean(
    t &&
    Array.isArray(t.s) &&
    t.s.length > 0 &&
    t.s.every((s) => typeof s === "string"),
  );

/** Shape-check only: the text is opaque and is never parsed. */
const validCalcs = (v: unknown): v is CompactCalcs =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.values(v as Record<string, unknown>).every(
    (n) =>
      !!n &&
      typeof n === "object" &&
      typeof (n as { text?: unknown }).text === "string" &&
      typeof (n as { print?: unknown }).print === "string",
  );

const validNode = (el: unknown): el is CompactNode =>
  Array.isArray(el) &&
  typeof el[0] === "number" &&
  typeof el[1] === "string" &&
  typeof el[2] === "string";

/** One opponent's turn tree. The author's roster is shared by every board. */
function decodeTree(
  t: CompactNode[],
  myRoster: string[],
  opRoster: string[],
  warn: Warn,
  lang: Lang,
): TurnNode[] {
  const ids = t.map(() => crypto.randomUUID());
  const turns: number[] = [];
  return t.map(([parent, myCode, opCode, note, calcs], i) => {
    let parentIdx = -1;
    if (parent > 0 && parent <= i) {
      parentIdx = parent - 1;
    } else if (parent !== 0) {
      warn(
        "Card {n}: invalid parent reference — treated as an alternate turn 1.",
        { n: i + 1 },
      );
    }
    turns[i] = parentIdx >= 0 ? turns[parentIdx] + 1 : 1;
    // Display numbering starts at turn 0 — the team-preview node. The label is
    // built here, translated, and handed to the leaves as a parameter, so the
    // punctuation joining it to a warning belongs to the language too.
    const cardLabel = translate(lang, "Card {n} (turn {t})", {
      n: i + 1,
      t: turns[i] - 1,
    });
    const label = cardLabel;
    const my = decodeSide(
      myCode,
      myRoster,
      opRoster,
      translate(lang, "{label}, my side", { label }),
      warn,
    );
    const opp = decodeSide(
      opCode,
      opRoster,
      myRoster,
      translate(lang, "{label}, opposing side", { label }),
      warn,
    );
    if (turns[i] === 1) {
      // Turn 0 is team preview: positions only, no declared moves.
      for (const side of [my, opp]) {
        if (side.moves) {
          warn("{label}: moves aren't recorded at team preview — dropped.", {
            label,
          });
          delete side.moves;
          delete side.targets;
        }
      }
    }
    validateTargets(
      my,
      opp,
      translate(lang, "{label}, my side", { label }),
      warn,
    );
    validateTargets(
      opp,
      my,
      translate(lang, "{label}, opposing side", { label }),
      warn,
    );
    return {
      id: ids[i],
      turn: turns[i],
      parentId: parentIdx >= 0 ? ids[parentIdx] : null,
      my,
      opp,
      ...(typeof note === "string" && note ? { note } : {}),
      // Calculations are carried verbatim and never re-derived. They are the
      // author's accepted sentence, and a published page is a snapshot — a
      // later change to the maths must not move numbers under its readers.
      ...(validCalcs(calcs) ? { calcs } : {}),
    };
  });
}

/**
 * The one import path: a v3 group (1..N opponents), a v2 pair, or the legacy
 * verbose form all come back as "one of my teams + a list of boards", so every
 * caller handles many opponents by handling one.
 *
 * Unknown species reject the whole paste, including a group where only one
 * opponent is unreadable — a half-imported set of matchups is worse than a
 * refusal that names what's wrong.
 */
export function decodeWorkflowGroup(
  text: string,
  lang: Lang = "en",
): GroupDecodeResult {
  const fail = (key: string, params?: Params): GroupDecodeResult => ({
    ok: false,
    error: translate(lang, key, params),
  });
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail("That isn't valid JSON.");
  }
  if (typeof data !== "object" || data === null) {
    return fail("That isn't a workflow document.");
  }

  // Legacy verbose form — validate species, then pass through.
  const legacy = data as {
    version?: number;
    setup?: SimSetup;
    nodes?: TurnNode[];
  };
  if (legacy.version === 1 && legacy.setup && Array.isArray(legacy.nodes)) {
    if (!legacy.setup.my?.parsed || !legacy.setup.opp?.parsed) {
      return fail("The workflow's teams are malformed.");
    }
    const speciesError = unknownSpeciesError(
      [
        legacy.setup.my.parsed.map((m) => m.species),
        legacy.setup.opp.parsed.map((m) => m.species),
      ],
      lang,
    );
    if (speciesError) return { ok: false, error: speciesError };
    return {
      ok: true,
      my: legacy.setup.my,
      boards: [{ opp: legacy.setup.opp, nodes: legacy.nodes }],
      docId: null,
      warnings: [],
    };
  }

  // A v2 pair is a group of one — normalized here so there's a single path.
  const versioned = data as Partial<CompactGroup> & Partial<CompactWorkflow>;
  let entries: { op: CompactTeam; t: CompactNode[] }[];
  if (versioned.v === 3 || versioned.v === 4) {
    if (!Array.isArray(versioned.b)) {
      return fail("That isn't a workflow document.");
    }
    if (versioned.b.length === 0) {
      return fail("The document has no opposing teams.");
    }
    entries = versioned.b;
  } else if (versioned.v === 2) {
    if (!versioned.op || !Array.isArray(versioned.t)) {
      return fail("That isn't a workflow document.");
    }
    entries = [{ op: versioned.op, t: versioned.t }];
  } else {
    return fail("That isn't a workflow document.");
  }

  if (!validTeam(versioned.my)) {
    return fail("The workflow's teams are malformed.");
  }
  for (const entry of entries) {
    if (!entry || !validTeam(entry.op) || !Array.isArray(entry.t)) {
      return fail("The workflow's teams are malformed.");
    }
    if (!entry.t.every(validNode)) {
      return fail("The workflow's turn list is malformed.");
    }
    // An empty turn list is legal and means "lined up, not planned yet" — the
    // same thing `nodes: []` means in storage. Sharing a group has to be able
    // to carry the opponents the author hasn't got to yet.
  }

  const myCompact = versioned.my!;
  const myRoster = myCompact.s.slice(0, 6);
  const speciesError = unknownSpeciesError(
    [myRoster, ...entries.map((e) => e.op.s.slice(0, 6))],
    lang,
  );
  if (speciesError) return { ok: false, error: speciesError };

  const warnings: string[] = [];
  const my = teamFromCompact(myCompact);
  const boards = entries.map((entry) => {
    const opp = teamFromCompact(entry.op);
    // With several opponents, a warning has to say which board it came from.
    // Rendering happens here and only here: the leaves emit a key and its
    // parameters, so the prefix — and the dash and colon joining it on — are
    // the translator's to place.
    const warn: Warn = (key, params) => {
      const message = translate(lang, key, params);
      const line =
        entries.length > 1
          ? translate(lang, "vs {opp} — {warning}", {
              opp: opp.name,
              warning: message,
            })
          : message;
      if (!warnings.includes(line)) warnings.push(line);
    };
    return {
      opp,
      nodes: decodeTree(
        entry.t,
        myRoster,
        opp.parsed.map((m) => m.species),
        warn,
        lang,
      ),
    };
  });
  return {
    ok: true,
    my,
    boards,
    docId: typeof versioned.g === "string" && versioned.g ? versioned.g : null,
    warnings,
  };
}

/**
 * The single-board view of the same document, for callers that work on one
 * board (the sim page's own board state). A multi-opponent paste yields its
 * first board here; use `decodeWorkflowGroup` to keep the rest.
 */
export function decodeWorkflow(text: string, lang: Lang = "en"): DecodeResult {
  const result = decodeWorkflowGroup(text, lang);
  if (!result.ok) return result;
  const [first] = result.boards;
  return {
    ok: true,
    setup: { my: result.my, opp: first.opp },
    nodes: first.nodes,
    warnings: result.warnings,
  };
}
