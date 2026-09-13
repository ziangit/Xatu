"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackLink, HeaderNav, LegalFooter, NavLink, Wordmark } from "../nav";
import { useLang, useT } from "../i18n/provider";
import { InlineConfirm, InlineRename } from "../ui";
import { importTeamText } from "@/lib/team";
import { ImportPanel, ImportedBadge, MonIcon, TeamPanel } from "./components";
import { deleteCloudMatchup, upsertCloudMatchup } from "./cloud";
import { SAMPLE_TEAMS } from "./demo-data";
import { FORMATS } from "./formats";
import {
  deleteMatchup,
  groupByMyTeam,
  isKeptApart,
  loadMatchups,
  loadSavedTeams,
  loadSetup,
  renameTeam,
  rememberTeam,
  saveSetup,
  setActiveMatchupId,
  upsertMatchup,
  type SavedMatchup,
  type StoredTeam,
} from "./storage";

// Page 1 of the matchup builder (per the xatu.png reference sketch): one of
// MY teams against MANY opposing teams. Pick your team once, line up as many
// opponents as you like (each becomes its own board), then plan them one by
// one on the sim page.

// The built-in teams offered before you've imported any of your own. They are
// exactly SAMPLE_TEAMS — a preset is a real pasted team, not a special kind of
// one, so nothing here may diverge from what an import would produce.
const PRESETS: StoredTeam[] = SAMPLE_TEAMS.map((s, i) => ({
  id: `preset-${i}`,
  name: s.label,
  // Each sample states its own regulation. NOT `FORMATS[0]` — that is whichever
  // regulation is current, so when the ladder rotates this would silently
  // relabel real M-B pastes as the new one. It is also what the list filters on.
  format: s.format,
  exportText: s.text,
  parsed: importTeamText(s.text)?.parsed ?? [],
}));

/** Regulations the built-in samples actually span, newest first. Derived, not
 * hard-coded: adding a sample from a new regulation must not need a second edit
 * here, and a regulation nothing is tagged with must not appear as a dead tab. */
const SAMPLE_REGULATIONS = FORMATS.filter((f) =>
  PRESETS.some((p) => p.format === f),
);

/**
 * The "use existing" list — your saved teams, then the built-in samples.
 *
 * One component because it was two copies of the same markup (My Team and
 * Opposing Teams), and the regulation filter would otherwise have been a third.
 *
 * The filter scopes **only the samples**. Your own teams are few, they are
 * yours, and hiding them behind a regulation tab is how someone concludes their
 * work is gone. Putting the tabs on the samples divider makes that scope
 * self-evident without a sentence explaining it.
 */
function ExistingTeamList({
  teams,
  onPick,
  onImport,
  importLabel,
  emptyNote,
}: {
  teams: StoredTeam[];
  onPick: (team: StoredTeam) => void;
  onImport: () => void;
  importLabel: string;
  emptyNote?: string;
}) {
  const t = useT();
  // Defaults to the current regulation rather than "all": the common case is
  // planning for what is being played now, and 18 rows is a scroll.
  const [reg, setReg] = useState<string>(SAMPLE_REGULATIONS[0] ?? "");
  const mine = teams.filter((tm) => !tm.id.startsWith("preset-"));
  const samples = teams.filter(
    (tm) => tm.id.startsWith("preset-") && (reg === "" || tm.format === reg),
  );

  const row = (tm: StoredTeam) => (
    <button
      key={tm.id}
      onClick={() => onPick(tm)}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-stone-50"
    >
      <TeamSprites team={tm} scale={0.45} />
      <span className="min-w-0 truncate text-xs font-medium text-stone-700">
        {tm.name}
      </span>
      <span className="ml-auto shrink-0 text-[10px] text-stone-400">
        {tm.id.startsWith("preset-")
          ? t("sample")
          : isKeptApart(tm)
            ? t("imported")
            : t("saved")}
      </span>
    </button>
  );

  return (
    <div className="grow-in rounded-lg border border-stone-200 bg-white py-1">
      {teams.length === 0 && emptyNote && (
        <p className="px-3 py-2 text-xs text-stone-400">{emptyNote}</p>
      )}
      {mine.map(row)}
      {SAMPLE_REGULATIONS.length > 0 && (
        <div className="mt-1 flex items-center gap-2 border-t border-stone-100 px-3 pb-1 pt-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
            {t("samples")}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {[...SAMPLE_REGULATIONS, ""].map((f) => (
              <button
                key={f || "all"}
                type="button"
                onClick={() => setReg(f)}
                aria-pressed={reg === f}
                // The bracketed generation prefix is noise in a 40px chip; the
                // full string stays in `title` and on the team's own badge.
                title={f || t("samples from every regulation")}
                className={`cursor-pointer rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                  reg === f
                    ? "bg-stone-200 text-stone-700"
                    : "text-stone-400 hover:text-stone-700"
                }`}
              >
                {f ? f.replace(/^.*\bReg\s*/, "") : t("all")}
              </button>
            ))}
          </span>
        </div>
      )}
      {samples.map(row)}
      <button
        onClick={onImport}
        className="w-full px-3 py-1.5 text-left text-xs text-stone-400 hover:bg-stone-50"
      >
        {importLabel}
      </button>
    </div>
  );
}

type SlotChoice = "closed" | "choice" | "import" | "existing";

/**
 * The teams offered by "use existing": everything the browser remembers, plus
 * the built-in presets — each team once. Presets need the dedupe because
 * picking one writes it into the saved-teams library under its own preset id
 * (`rememberTeam` canonicalises by roster), so a naive concat listed it twice
 * *and* collided on the React key.
 */
function existingTeams(exclude: (team: StoredTeam) => boolean): StoredTeam[] {
  const seen = new Set<string>();
  const out: StoredTeam[] = [];
  const saved = loadSavedTeams();
  // Teams built here come first, so that when a pasted guide names the same six
  // Pokémon as a team of mine, the dedupe below drops *its* row and not mine.
  // Both groups still exist; this only decides which one this list offers.
  const mine = saved.filter((t) => !isKeptApart(t));
  const pasted = saved.filter((t) => isKeptApart(t));
  for (const team of [...mine, ...pasted, ...PRESETS]) {
    const key = team.parsed.map((m) => m.species).join("|");
    if (seen.has(team.id) || seen.has(key) || exclude(team)) continue;
    seen.add(team.id);
    seen.add(key);
    out.push(team);
  }
  return out;
}

/** Compact sprite row, used for both sides everywhere on this page. */
function TeamSprites({
  team,
  scale = 0.6,
}: {
  team: StoredTeam;
  scale?: number;
}) {
  return (
    <span className="flex shrink-0">
      {team.parsed.slice(0, 6).map((m, i) => (
        <MonIcon key={`${m.species}-${i}`} species={m.species} scale={scale} />
      ))}
    </span>
  );
}

/** The author's own team — exactly one, replaceable. */
function MyTeamSlot({
  team,
  onPick,
  onRename,
  autoImport = false,
}: {
  team: StoredTeam | null;
  onPick: (team: StoredTeam) => void;
  onRename: (teamId: string, name: string) => void;
  /** Arrived to start a new matchup (`?new=1`) — skip the choice box and open
   * the import panel, which is the only thing that box leads to from empty. */
  autoImport?: boolean;
}) {
  const t = useT();
  const [mode, setMode] = useState<SlotChoice>(
    autoImport ? "import" : "closed",
  );
  const [existing, setExisting] = useState<StoredTeam[]>([]);

  const openExisting = () => {
    // localStorage is browser-only; read on interaction, not at render.
    setExisting(existingTeams(() => false));
    setMode("existing");
  };

  const pick = (t: StoredTeam) => {
    onPick(t);
    setMode("closed");
  };

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
          {t("My Team")}
        </h2>
        {/* Two different "back"s would meet in this row, so they're kept
            distinct: the page-level one is a button that never moves, the
            section's own way out of an open panel is a "cancel" text link. */}
        <span className="flex items-center gap-2">
          <BackLink
            fallback="/"
            className="rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
          />
          {mode !== "closed" ? (
            <button
              onClick={() => setMode("closed")}
              className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              {t("cancel")}
            </button>
          ) : (
            team && (
              <>
                <button
                  onClick={() => setMode("import")}
                  className="rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
                >
                  {t("＋ new team")}
                </button>
                <button
                  onClick={openExisting}
                  className="rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
                >
                  {t("switch team")}
                </button>
              </>
            )
          )}
        </span>
      </div>

      <div className="mt-2 space-y-3">
        {team && (
          <TeamPanel
            team={team}
            collapsed={mode !== "closed"}
            onRename={(name) => onRename(team.id, name)}
          />
        )}
        {((!team && mode === "closed") || mode === "choice") && (
          <div className="grow-in flex h-32 items-center justify-center gap-3 rounded-lg border border-dashed border-stone-300">
            <button
              onClick={() => setMode("import")}
              className="rounded-md bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:opacity-80"
            >
              {t("New team")}
            </button>
            <button
              onClick={openExisting}
              className="rounded-md border border-stone-300 bg-white px-4 py-1.5 text-xs text-stone-600 hover:border-stone-500"
            >
              {t("Use existing")}
            </button>
          </div>
        )}

        {mode === "import" && (
          <ImportPanel
            label={t("My Team")}
            onImport={([t]) => {
              if (!t) return;
              // A paste the user just typed is the truth about this team —
              // see `rememberTeam`'s `authoritative`.
              pick(
                rememberTeam(
                  { ...t, id: crypto.randomUUID() },
                  { authoritative: true },
                ),
              );
            }}
            onCancel={() => setMode("closed")}
          />
        )}

        {mode === "existing" && (
          <ExistingTeamList
            teams={existing}
            onPick={pick}
            onImport={() => setMode("import")}
            importLabel={t("+ import a new one instead")}
          />
        )}
      </div>
    </section>
  );
}

/** The opposing side — a list, because one team is planned against many. */
function OpponentList({
  myTeam,
  boards,
  autoOpen = false,
  onAdd,
  onOpen,
  onRemove,
  onRename,
}: {
  myTeam: StoredTeam;
  boards: SavedMatchup[];
  /** Arrived here to add opponents (`?add=1`) — start on the choice box. */
  autoOpen?: boolean;
  onAdd: (teams: StoredTeam[]) => void;
  onOpen: (board: SavedMatchup) => void;
  onRemove: (board: SavedMatchup) => void;
  onRename: (teamId: string, name: string) => void;
}) {
  const { t, n } = useLang();
  const [mode, setMode] = useState<SlotChoice>(autoOpen ? "choice" : "closed");
  const [existing, setExisting] = useState<StoredTeam[]>([]);
  /** Row awaiting its in-place remove confirmation (never window.confirm). */
  const [confirmId, setConfirmId] = useState<string | null>(null);
  /** Row whose name is being edited in place (never window.prompt either). */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const alreadyIn = new Set(boards.map((b) => b.setup.opp.id));

  const openExisting = () => {
    setExisting(
      existingTeams((t) => t.id === myTeam.id || alreadyIn.has(t.id)),
    );
    setMode("existing");
  };

  const add = (teams: StoredTeam[]) => {
    onAdd(teams);
    setMode("closed");
  };

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
          {t("Opposing teams")}{" "}
          {boards.length > 0 && (
            <span className="text-stone-300">({boards.length})</span>
          )}
        </h2>
        {mode !== "closed" ? (
          <button
            onClick={() => setMode("closed")}
            className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
          >
            {t("panel|← back")}
          </button>
        ) : (
          boards.length > 0 && (
            <span className="flex items-center gap-2">
              <button
                onClick={() => setMode("import")}
                className="rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
              >
                {t("＋ new team")}
              </button>
              <button
                onClick={openExisting}
                className="rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
              >
                {t("use existing")}
              </button>
            </span>
          )
        )}
      </div>

      <div className="mt-2 space-y-3">
        {boards.length > 0 && (
          <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
            {boards.map((board) => (
              <div key={board.id} className="flex items-center gap-3 px-3 py-2">
                {renamingId === board.setup.opp.id ? (
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <TeamSprites team={board.setup.opp} scale={0.5} />
                    <InlineRename
                      value={board.setup.opp.name}
                      label={t("rename {team}", {
                        team: board.setup.opp.name,
                      })}
                      onRename={(next) => {
                        setRenamingId(null);
                        onRename(board.setup.opp.id, next);
                      }}
                      onCancel={() => setRenamingId(null)}
                      className="flex-1"
                    />
                  </span>
                ) : (
                  <button
                    onClick={() => onOpen(board)}
                    title={t("plan {team}", { team: board.setup.opp.name })}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left hover:opacity-75"
                  >
                    <TeamSprites team={board.setup.opp} scale={0.5} />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-700">
                      {board.setup.opp.name}
                    </span>
                  </button>
                )}
                {confirmId === board.id ? (
                  <InlineConfirm
                    question={
                      board.nodes.length > 0
                        ? t("Remove with its plan?")
                        : t("Remove?")
                    }
                    confirmLabel={t("Remove")}
                    onConfirm={() => {
                      setConfirmId(null);
                      onRemove(board);
                    }}
                    onCancel={() => setConfirmId(null)}
                  />
                ) : (
                  <>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                        board.nodes.length > 0
                          ? "bg-stone-100 text-stone-500"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {board.nodes.length > 0
                        ? n(board.nodes.length, "state", "states")
                        : t("no plan yet")}
                    </span>
                    <button
                      onClick={() => setRenamingId(board.setup.opp.id)}
                      className="shrink-0 text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
                    >
                      {t("rename")}
                    </button>
                    <button
                      onClick={() => onOpen(board)}
                      className="shrink-0 text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
                    >
                      {board.nodes.length > 0 ? t("open") : t("plan")}
                    </button>
                    <button
                      onClick={() => setConfirmId(board.id)}
                      title={t("remove {team}", { team: board.setup.opp.name })}
                      className="shrink-0 rounded px-1 py-0.5 text-[11px] text-stone-300 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {((boards.length === 0 && mode === "closed") || mode === "choice") && (
          <div className="grow-in flex h-32 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-stone-300">
            <div className="flex gap-3">
              {/* "New team", not "Import": the panel behind it now also builds
                  a team by typing names, so naming the paste would hide half
                  of what the button does. */}
              <button
                onClick={() => setMode("import")}
                className="rounded-md bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:opacity-80"
              >
                {t("New team")}
              </button>
              <button
                onClick={openExisting}
                className="rounded-md border border-stone-300 bg-white px-4 py-1.5 text-xs text-stone-600 hover:border-stone-500"
              >
                {t("Use existing")}
              </button>
            </div>
            <p className="text-[11px] text-stone-400">
              {t(
                "type the six, or paste several teams at once — one matchup each",
              )}
            </p>
          </div>
        )}

        {mode === "import" && (
          <ImportPanel
            label={t("Opposing teams")}
            multi
            onImport={(teams) =>
              add(
                teams.map((t) =>
                  rememberTeam(
                    { ...t, id: crypto.randomUUID() },
                    { authoritative: true },
                  ),
                ),
              )
            }
            onCancel={() => setMode("closed")}
          />
        )}

        {mode === "existing" && (
          <ExistingTeamList
            teams={existing}
            onPick={(tm) => add([tm])}
            onImport={() => setMode("import")}
            importLabel={t("+ import new ones instead")}
            emptyNote={t("No other saved teams yet — import one.")}
          />
        )}
      </div>
    </section>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const { t, n } = useLang();
  const [my, setMy] = useState<StoredTeam | null>(null);
  /** Came in via `?new=1`: open My Team's import panel rather than the choice box. */
  const [startFresh, setStartFresh] = useState(false);
  const [library, setLibrary] = useState<SavedMatchup[]>([]);
  const [autoOpen, setAutoOpen] = useState(false);

  useEffect(() => {
    // localStorage is browser-only; defer the read past the effect body.
    // Intent arrives in the query string (read from `location` rather than
    // useSearchParams, which would force a Suspense boundary here):
    //   ?new=1              start a new matchup — show the team picker
    //   ?team=<id>          plan with this team of mine
    //   ?team=<id>&add=1    …and open the add-opponents box right away
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const saved = loadMatchups();
      setLibrary(saved);
      const params = new URLSearchParams(window.location.search);
      const groups = groupByMyTeam(saved);
      if (params.get("new")) {
        setMy(null);
        setStartFresh(true);
        return;
      }
      const wanted = params.get("team");
      if (wanted) {
        const team =
          groups.find((g) => g.teamId === wanted)?.team ??
          loadSavedTeams().find((t) => t.id === wanted) ??
          null;
        setMy(team);
        setAutoOpen(Boolean(team && params.get("add")));
        return;
      }
      // Otherwise resume the team whose boards were touched most recently,
      // falling back to the last pair that was simulated.
      setMy(groups[0]?.team ?? loadSetup()?.my ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = groupByMyTeam(library);
  const boards = my
    ? (groups.find((g) => g.teamId === my.id)?.matchups ?? [])
    : [];
  const otherGroups = groups.filter((g) => g.teamId !== my?.id);

  /** Lining an opponent up creates its board immediately, unplanned
   * (`nodes: []`) — the group is the only record of "my team vs these". */
  const addOpponents = (teams: StoredTeam[]) => {
    if (!my) return;
    const existing = new Set(boards.map((b) => b.setup.opp.id));
    const now = new Date().toISOString();
    const created: SavedMatchup[] = [];
    for (const opp of teams) {
      if (opp.id === my.id || existing.has(opp.id)) continue;
      existing.add(opp.id);
      const entry: SavedMatchup = {
        id: crypto.randomUUID(),
        name: `${my.name} vs ${opp.name}`,
        setup: { my, opp },
        nodes: [],
        savedAt: now,
      };
      upsertMatchup(entry);
      created.push(entry);
    }
    setLibrary(loadMatchups());
    // Signed in → the pairing itself is worth syncing, before any plan exists.
    // A failure is not surfaced here: /matchups still shows the row as
    // browser-only with an upload button, which is the honest signal.
    for (const entry of created) void upsertCloudMatchup(entry);
  };

  const openBoard = (board: SavedMatchup) => {
    saveSetup(board.setup);
    setActiveMatchupId(board.id);
    router.push("/demo/sim");
  };

  /** Confirmation happens in the row itself (see InlineConfirm). */
  const removeBoard = (board: SavedMatchup) => {
    deleteMatchup(board.id);
    setLibrary(loadMatchups());
    // Remove the account copy too, or it would reappear on /matchups.
    void deleteCloudMatchup(board.id);
  };

  /**
   * Renaming touches the team library, every saved board that references the
   * team, and the in-progress setup — `renameTeam` does all three — so the page
   * re-reads both after it. A no-op rename (blank, or unchanged) returns null
   * and nothing is re-read.
   */
  const renameAndRefresh = (teamId: string, name: string) => {
    const renamed = renameTeam(teamId, name);
    if (!renamed) return;
    // Opponent rows come from `library`; My Team is its own state.
    setLibrary(loadMatchups());
    if (my?.id === renamed.id) setMy(renamed);
  };

  const nextUnplanned = boards.find((b) => b.nodes.length === 0) ?? boards[0];

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <header className="flex items-baseline justify-between border-b border-stone-200 pb-4">
          <div>
            <Wordmark tag={t("matchup builder")} />
            <p className="text-xs text-stone-400">
              {t(
                "your team, then every team you expect to face — one plan each",
              )}
            </p>
          </div>
          <HeaderNav>
            <NavLink href="/matchups">{t("matchups")}</NavLink>
          </HeaderNav>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* `key` remounts the slot when the query-string intent resolves.
              The intent is read in an effect (localStorage is browser-only), so
              it lands *after* the slot has already chosen its initial mode —
              without this the panel would stay closed on `?new=1`. */}
          <MyTeamSlot
            key={startFresh ? "fresh" : "resume"}
            team={my}
            onPick={setMy}
            onRename={renameAndRefresh}
            autoImport={startFresh}
          />
          {my ? (
            <OpponentList
              myTeam={my}
              boards={boards}
              autoOpen={autoOpen}
              onAdd={addOpponents}
              onOpen={openBoard}
              onRemove={removeBoard}
              onRename={renameAndRefresh}
            />
          ) : (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                {t("Opposing teams")}
              </h2>
              <div className="mt-2 flex h-32 items-center justify-center rounded-lg border border-dashed border-stone-200 px-6 text-center text-xs leading-relaxed text-stone-400">
                {t(
                  "Set your team first, then add as many opponents as you want to plan against.",
                )}
              </div>
            </section>
          )}
        </div>

        {nextUnplanned && (
          <div className="mt-10 flex flex-col items-center gap-2">
            <button
              onClick={() => openBoard(nextUnplanned)}
              className="rounded-md bg-[#e5484d] px-8 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:opacity-85 active:scale-[0.98]"
            >
              {nextUnplanned.nodes.length > 0 ? t("Open board") : t("Simulate")}
            </button>
            <p className="text-[11px] text-stone-400">
              {boards.length > 1
                ? t("vs. {team} · switch opponents from the board", {
                    team: nextUnplanned.setup.opp.name,
                  })
                : t("vs. {team}", { team: nextUnplanned.setup.opp.name })}
            </p>
          </div>
        )}

        {my && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMy(null);
                setAutoOpen(false);
              }}
              className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              {t("＋ new matchup with a different team")}
            </button>
          </div>
        )}

        {otherGroups.length > 0 && (
          <section className="mt-12">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                {t("Your other teams")}
              </h2>
              <Link
                href="/matchups"
                className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
              >
                {t("all matchups (incl. account) →")}
              </Link>
            </div>
            <div className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
              {otherGroups.map((group) => (
                <button
                  key={group.teamId}
                  onClick={() => setMy(group.team)}
                  title={t("switch to {team}", { team: group.team.name })}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-stone-50"
                >
                  <TeamSprites team={group.team} scale={0.5} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-700">
                    {group.team.name}
                  </span>
                  <ImportedBadge team={group.team} />
                  <span className="shrink-0 text-[10px] text-stone-400">
                    {n(group.matchups.length, "matchup", "matchups")}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <LegalFooter />
      </main>
    </div>
  );
}
