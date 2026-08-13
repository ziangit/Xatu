"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackLink, HeaderNav, NavLink, Wordmark } from "../nav";
import { InlineConfirm } from "../ui";
import { yoshimapGuide } from "@/lib/schema/fixtures/yoshimap-sand-staraptor";
import { importTeamText } from "@/lib/team";
import { ImportPanel, MonIcon, TeamPanel, FORMATS } from "./components";
import { deleteCloudMatchup, upsertCloudMatchup } from "./cloud";
import { SAMPLE_TEAMS } from "./demo-data";
import {
  deleteMatchup,
  groupByMyTeam,
  loadMatchups,
  loadSavedTeams,
  loadSetup,
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

const PRESETS: StoredTeam[] = [
  {
    id: "preset-sand",
    name: yoshimapGuide.title,
    format: FORMATS[0],
    exportText: yoshimapGuide.ownTeam.exportText,
    parsed: yoshimapGuide.ownTeam.parsed,
  },
  ...SAMPLE_TEAMS.map((s, i) => ({
    id: `preset-${i}`,
    name: s.label,
    format: FORMATS[0],
    exportText: s.text,
    parsed: importTeamText(s.text)?.parsed ?? [],
  })),
];

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
  for (const team of [...loadSavedTeams(), ...PRESETS]) {
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
}: {
  team: StoredTeam | null;
  onPick: (team: StoredTeam) => void;
}) {
  const [mode, setMode] = useState<SlotChoice>("closed");
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
          My Team
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
              cancel
            </button>
          ) : (
            team && (
              <>
                <button
                  onClick={() => setMode("import")}
                  className="rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
                >
                  ＋ import
                </button>
                <button
                  onClick={openExisting}
                  className="rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
                >
                  switch team
                </button>
              </>
            )
          )}
        </span>
      </div>

      <div className="mt-2 space-y-3">
        {team && <TeamPanel team={team} collapsed={mode !== "closed"} />}
        {((!team && mode === "closed") || mode === "choice") && (
          <div className="grow-in flex h-32 items-center justify-center gap-3 rounded-lg border border-dashed border-stone-300">
            <button
              onClick={() => setMode("import")}
              className="rounded-md bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:opacity-80"
            >
              Import a team
            </button>
            <button
              onClick={openExisting}
              className="rounded-md border border-stone-300 bg-white px-4 py-1.5 text-xs text-stone-600 hover:border-stone-500"
            >
              Use existing
            </button>
          </div>
        )}

        {mode === "import" && (
          <ImportPanel
            label="My Team"
            onImport={([t]) => {
              if (!t) return;
              pick(rememberTeam({ ...t, id: crypto.randomUUID() }));
            }}
            onCancel={() => setMode("closed")}
          />
        )}

        {mode === "existing" && (
          <div className="grow-in rounded-lg border border-stone-200 bg-white py-1">
            {existing.map((t) => (
              <button
                key={t.id}
                onClick={() => pick(t)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-stone-50"
              >
                <TeamSprites team={t} scale={0.45} />
                <span className="min-w-0 truncate text-xs font-medium text-stone-700">
                  {t.name}
                </span>
                <span className="ml-auto shrink-0 text-[10px] text-stone-400">
                  {t.id.startsWith("preset-") ? "sample" : "saved"}
                </span>
              </button>
            ))}
            <button
              onClick={() => setMode("import")}
              className="w-full px-3 py-1.5 text-left text-xs text-stone-400 hover:bg-stone-50"
            >
              + import a new one instead
            </button>
          </div>
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
}: {
  myTeam: StoredTeam;
  boards: SavedMatchup[];
  /** Arrived here to add opponents (`?add=1`) — start on the choice box. */
  autoOpen?: boolean;
  onAdd: (teams: StoredTeam[]) => void;
  onOpen: (board: SavedMatchup) => void;
  onRemove: (board: SavedMatchup) => void;
}) {
  const [mode, setMode] = useState<SlotChoice>(autoOpen ? "choice" : "closed");
  const [existing, setExisting] = useState<StoredTeam[]>([]);
  /** Row awaiting its in-place remove confirmation (never window.confirm). */
  const [confirmId, setConfirmId] = useState<string | null>(null);
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
          Opposing teams{" "}
          {boards.length > 0 && (
            <span className="text-stone-300">({boards.length})</span>
          )}
        </h2>
        {mode !== "closed" ? (
          <button
            onClick={() => setMode("closed")}
            className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
          >
            ← back
          </button>
        ) : (
          boards.length > 0 && (
            <span className="flex items-center gap-2">
              <button
                onClick={() => setMode("import")}
                className="rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
              >
                ＋ import
              </button>
              <button
                onClick={openExisting}
                className="rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
              >
                use existing
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
                <button
                  onClick={() => onOpen(board)}
                  title={`plan ${board.setup.opp.name}`}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left hover:opacity-75"
                >
                  <TeamSprites team={board.setup.opp} scale={0.5} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-700">
                    {board.setup.opp.name}
                  </span>
                </button>
                {confirmId === board.id ? (
                  <InlineConfirm
                    question={
                      board.nodes.length > 0
                        ? "Remove with its plan?"
                        : "Remove?"
                    }
                    confirmLabel="Remove"
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
                        ? `${board.nodes.length} state${board.nodes.length === 1 ? "" : "s"}`
                        : "no plan yet"}
                    </span>
                    <button
                      onClick={() => onOpen(board)}
                      className="shrink-0 text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
                    >
                      {board.nodes.length > 0 ? "open" : "plan"}
                    </button>
                    <button
                      onClick={() => setConfirmId(board.id)}
                      title={`remove ${board.setup.opp.name}`}
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
              <button
                onClick={() => setMode("import")}
                className="rounded-md bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:opacity-80"
              >
                Import teams
              </button>
              <button
                onClick={openExisting}
                className="rounded-md border border-stone-300 bg-white px-4 py-1.5 text-xs text-stone-600 hover:border-stone-500"
              >
                Use existing
              </button>
            </div>
            <p className="text-[11px] text-stone-400">
              paste several at once — one matchup each
            </p>
          </div>
        )}

        {mode === "import" && (
          <ImportPanel
            label="Opposing teams"
            multi
            onImport={(teams) =>
              add(
                teams.map((t) =>
                  rememberTeam({ ...t, id: crypto.randomUUID() }),
                ),
              )
            }
            onCancel={() => setMode("closed")}
          />
        )}

        {mode === "existing" && (
          <div className="rounded-lg border border-stone-200 bg-white py-1">
            {existing.length === 0 && (
              <p className="px-3 py-2 text-xs text-stone-400">
                No other saved teams yet — import one.
              </p>
            )}
            {existing.map((t) => (
              <button
                key={t.id}
                onClick={() => add([t])}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-stone-50"
              >
                <TeamSprites team={t} scale={0.45} />
                <span className="min-w-0 truncate text-xs font-medium text-stone-700">
                  {t.name}
                </span>
                <span className="ml-auto shrink-0 text-[10px] text-stone-400">
                  {t.id.startsWith("preset-") ? "sample" : "saved"}
                </span>
              </button>
            ))}
            <button
              onClick={() => setMode("import")}
              className="w-full px-3 py-1.5 text-left text-xs text-stone-400 hover:bg-stone-50"
            >
              + import new ones instead
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [my, setMy] = useState<StoredTeam | null>(null);
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

  const nextUnplanned = boards.find((b) => b.nodes.length === 0) ?? boards[0];

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <header className="flex items-baseline justify-between border-b border-stone-200 pb-4">
          <div>
            <Wordmark tag="matchup builder" />
            <p className="text-xs text-stone-400">
              your team, then every team you expect to face — one plan each
            </p>
          </div>
          <HeaderNav>
            <NavLink href="/matchups">matchups</NavLink>
          </HeaderNav>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          <MyTeamSlot team={my} onPick={setMy} />
          {my ? (
            <OpponentList
              myTeam={my}
              boards={boards}
              autoOpen={autoOpen}
              onAdd={addOpponents}
              onOpen={openBoard}
              onRemove={removeBoard}
            />
          ) : (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                Opposing teams
              </h2>
              <div className="mt-2 flex h-32 items-center justify-center rounded-lg border border-dashed border-stone-200 px-6 text-center text-xs leading-relaxed text-stone-400">
                Set your team first, then add as many opponents as you want to
                plan against.
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
              {nextUnplanned.nodes.length > 0 ? "Open board" : "Simulate"}
            </button>
            <p className="text-[11px] text-stone-400">
              vs. {nextUnplanned.setup.opp.name}
              {boards.length > 1 && " · switch opponents from the board"}
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
              ＋ new matchup with a different team
            </button>
          </div>
        )}

        {otherGroups.length > 0 && (
          <section className="mt-12">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                Your other teams
              </h2>
              <Link
                href="/matchups"
                className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
              >
                all matchups (incl. account) →
              </Link>
            </div>
            <div className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
              {otherGroups.map((group) => (
                <button
                  key={group.teamId}
                  onClick={() => setMy(group.team)}
                  title={`switch to ${group.team.name}`}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-stone-50"
                >
                  <TeamSprites team={group.team} scale={0.5} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-700">
                    {group.team.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-stone-400">
                    {group.matchups.length} matchup
                    {group.matchups.length === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-16 border-t border-stone-200 pt-4 text-[11px] leading-relaxed text-stone-400">
          xatu is an unaffiliated, non-commercial fan project. Pokémon is owned
          by Nintendo, The Pokémon Company, Game Freak, and Creatures.
        </footer>
      </main>
    </div>
  );
}
