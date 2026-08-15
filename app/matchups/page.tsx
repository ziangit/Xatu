"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackLink, HeaderNav, NavLink, Wordmark } from "../nav";
import { InlineConfirm, useCopy } from "../ui";
import { ImportedBadge, MonIcon } from "../demo/components";
import { supabaseConfigured } from "../auth/client";
import {
  deleteCloudMatchup,
  listCloudMatchups,
  upsertCloudMatchup,
} from "../demo/cloud";
import { decodeWorkflowGroup, encodeGroup } from "../demo/workflow-io";
import { applyGroupImport, importSummary } from "../demo/import-group";
import {
  deleteMatchup,
  groupDocId,
  loadMatchups,
  saveSetup,
  setActiveMatchupId,
  upsertMatchup,
  type SavedMatchup,
  type StoredTeam,
} from "../demo/storage";

// My matchups: every saved board — the ones in this browser and the ones
// synced to the signed-in account — grouped under the team of mine they were
// built with, because one team is planned against many opponents.

interface Row {
  id: string;
  /** Freshest copy wins for name/date/opening. */
  entry: SavedMatchup;
  inBrowser: boolean;
  inCloud: boolean;
}

interface Group {
  teamId: string;
  team: StoredTeam;
  rows: Row[];
  savedAt: string;
}

/** Same grouping rule as the builder, applied to merged browser+account rows. */
function groupRows(rows: Row[]): Group[] {
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const teamId = row.entry.setup.my.id;
    const group = groups.get(teamId);
    if (!group) {
      groups.set(teamId, {
        teamId,
        team: row.entry.setup.my,
        rows: [row],
        savedAt: row.entry.savedAt,
      });
      continue;
    }
    group.rows.push(row);
    if (row.entry.savedAt > group.savedAt) {
      group.savedAt = row.entry.savedAt;
      group.team = row.entry.setup.my;
    }
  }
  return [...groups.values()].sort((a, b) =>
    b.savedAt.localeCompare(a.savedAt),
  );
}

function mergeRows(local: SavedMatchup[], cloud: SavedMatchup[] | null): Row[] {
  const rows = new Map<string, Row>();
  for (const m of local) {
    rows.set(m.id, { id: m.id, entry: m, inBrowser: true, inCloud: false });
  }
  for (const m of cloud ?? []) {
    const existing = rows.get(m.id);
    if (!existing) {
      rows.set(m.id, { id: m.id, entry: m, inBrowser: false, inCloud: true });
    } else {
      existing.inCloud = true;
      if (m.savedAt > existing.entry.savedAt) existing.entry = m;
    }
  }
  return [...rows.values()].sort((a, b) =>
    b.entry.savedAt.localeCompare(a.entry.savedAt),
  );
}

export default function MatchupsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [cloud, setCloud] = useState<
    "loading" | "off" | "ok" | { error: string }
  >("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Row awaiting its in-place delete confirmation (never window.confirm). */
  const [confirmId, setConfirmId] = useState<string | null>(null);
  /** Which group was copied — the shared hook says *whether*, this says *which*. */
  const { copied, copy } = useCopy();
  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotes, setImportNotes] = useState<string[]>([]);

  /**
   * One list, painted once. Earlier this rendered the browser-only rows first
   * and then re-rendered with the account rows merged in, which read as a flash
   * followed by the list tripling in size (and, with nothing saved locally, a
   * wrong "no saved matchups yet" in between). The account rows belong to the
   * same list, so the list waits for them; `late-fade-in` keeps the placeholder
   * off screen unless the request is actually slow.
   */
  const refresh = async () => {
    const local = loadMatchups();
    if (!supabaseConfigured()) {
      setRows(mergeRows(local, null));
      setCloud("off");
      return;
    }
    const result = await listCloudMatchups();
    setRows(mergeRows(local, result.state === "ok" ? result.matchups : null));
    if (result.state === "ok") setCloud("ok");
    else if (result.state === "off") setCloud("off");
    else setCloud({ error: result.message });
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = (row: Row) => {
    // Make sure a local copy exists (cloud-only boards get pulled down),
    // then resume it on the sim page.
    upsertMatchup(row.entry);
    saveSetup(row.entry.setup);
    setActiveMatchupId(row.id);
    router.push("/demo/sim");
  };

  /** Badges flip as soon as the write lands — the refresh behind it only
   * reconciles, so a row never sits there looking unchanged. */
  const markInCloud = (ids: string[]) =>
    setRows((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, inCloud: true } : r)),
    );

  const upload = async (row: Row) => {
    setBusyId(row.id);
    const result = await upsertCloudMatchup(row.entry);
    setBusyId(null);
    if (result === "ok") {
      markInCloud([row.id]);
      void refresh();
    } else if (result !== "off") setCloud({ error: result });
  };

  /** Add more opposing teams to a team's group, on the builder. The freshest
   * board is pulled local first so `/demo?team=` can resolve an account-only
   * group to a team. */
  const addTeams = (group: Group) => {
    upsertMatchup(group.rows[0].entry);
    router.push(`/demo?team=${encodeURIComponent(group.teamId)}&add=1`);
  };

  /** Whole group at once — a team's plans are worth syncing together. */
  const uploadAll = async (pending: Row[]) => {
    setBusyId(pending[0]?.id ?? null);
    const done: string[] = [];
    for (const row of pending) {
      const result = await upsertCloudMatchup(row.entry);
      if (result !== "ok" && result !== "off") {
        setCloud({ error: result });
        break;
      }
      if (result === "ok") done.push(row.id);
    }
    setBusyId(null);
    markInCloud(done);
    void refresh();
  };

  /**
   * The whole group as one paste-able document: the team once, then every
   * opponent with its plan (including the ones with no plan yet, which carry
   * their roster). A single board is the same format with one opponent, so
   * there's nothing to choose between here and the board's Copy JSON.
   *
   * Stamped with the group's identity, so whoever pastes it can tell an update
   * of this guide from a stranger's guide about the same six Pokémon. Passing
   * a guide on keeps the stamp it arrived with — the group it belongs to is
   * the one it started in.
   */
  const copyGroup = async (group: Group) => {
    const boards = group.rows.map((r) => ({
      opp: r.entry.setup.opp,
      nodes: r.entry.nodes,
    }));
    const doc = encodeGroup(group.team, boards, {
      docId: groupDocId(group.team),
    });
    if (await copy(doc)) {
      setCopiedTeamId(group.teamId);
    }
  };

  /**
   * Paste a document back in — one opponent or many, whichever it holds. A
   * stranger's guide for a team I already plan with arrives as its own group
   * next to mine and touches nothing; only the document's own group is ever
   * updated in place. See `applyGroupImport`.
   */
  const importGroup = () => {
    const result = decodeWorkflowGroup(importText.trim());
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    const applied = applyGroupImport(result);
    // Signed in → mirror what actually changed, same as adding an opponent on
    // the builder does. A row the document didn't change isn't re-uploaded.
    for (const entry of applied.written) void upsertCloudMatchup(entry);
    setShowImport(false);
    setImportText("");
    setImportError(null);
    setImportNotes([importSummary(applied), ...result.warnings]);
    void refresh();
  };

  /** Where a delete would land — spelled out in the inline confirmation. */
  const placesOf = (row: Row) =>
    [row.inBrowser && "this browser", row.inCloud && "your account"]
      .filter(Boolean)
      .join(" and ");

  const remove = async (row: Row) => {
    setConfirmId(null);
    setBusyId(row.id);
    if (row.inBrowser) deleteMatchup(row.id);
    if (row.inCloud) {
      const result = await deleteCloudMatchup(row.id);
      if (result !== "ok" && result !== "off") setCloud({ error: result });
    }
    setBusyId(null);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    void refresh();
  };

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="flex items-baseline justify-between border-b border-stone-200 pb-4">
          <div>
            <Wordmark />
            <p className="text-xs text-stone-400">my matchups</p>
          </div>
          <HeaderNav>
            <NavLink href="/demo">builder</NavLink>
          </HeaderNav>
        </header>

        {/* Back sits with this page's actions, like the board's does — one
            place to look for "leave" and "do something here". */}
        <div className="mt-4 flex items-center justify-end gap-3">
          <BackLink
            fallback="/"
            className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-stone-500"
          />
          <button
            onClick={() => {
              setShowImport(!showImport);
              setImportError(null);
            }}
            className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-stone-500"
          >
            paste JSON
          </button>
          <Link
            href="/demo?new=1"
            className="rounded-md bg-[#e5484d] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:opacity-85 active:scale-[0.98]"
          >
            ＋ New matchup
          </Link>
        </div>

        {showImport && (
          <div className="grow-in mt-4 rounded-lg border border-stone-200 bg-[#f6f5ef] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              Paste a copied matchup
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
              Anything copied with <em>copy JSON</em> — one opposing team or a
              whole set.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="Paste here…"
              className="mt-2 w-full resize-y rounded border border-stone-300 bg-white p-2.5 font-mono text-[11px] text-stone-700 placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={importGroup}
                disabled={!importText.trim()}
                className="rounded bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:opacity-80 disabled:opacity-30"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportText("");
                  setImportError(null);
                }}
                className="text-xs text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
              >
                cancel
              </button>
              {importError && (
                <p className="text-xs text-red-600">{importError}</p>
              )}
            </div>
          </div>
        )}

        {importNotes.length > 0 && (
          <div className="grow-in mt-4 rounded-lg border border-stone-200 bg-white p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                Import notes
              </p>
              <button
                onClick={() => setImportNotes([])}
                className="text-[11px] text-stone-400 hover:text-stone-700"
              >
                dismiss
              </button>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[11px] leading-relaxed text-stone-600">
              {importNotes.map((note, i) => (
                <li key={i}>· {note}</li>
              ))}
            </ul>
          </div>
        )}

        {cloud === "off" && (
          <p className="mt-4 text-xs leading-relaxed text-stone-400">
            Showing the matchups saved in this browser.{" "}
            <Link
              href="/login"
              className="underline underline-offset-2 hover:text-stone-800"
            >
              Sign in
            </Link>{" "}
            to also see the ones synced to your account.
          </p>
        )}
        {typeof cloud === "object" && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-800">
            Couldn&rsquo;t load your account matchups: {cloud.error}. The
            browser ones are shown below.
          </p>
        )}

        {cloud === "loading" ? (
          <div className="late-fade-in mt-6 space-y-6" aria-busy="true">
            {[0, 1].map((i) => (
              <section
                key={i}
                className="rounded-lg border border-stone-200 bg-white"
              >
                <header className="flex items-center gap-3 border-b border-stone-100 bg-[#fcfcfa] px-4 py-2.5">
                  <span className="h-5 w-[104px] shrink-0 rounded bg-stone-100" />
                  <span className="h-3 w-40 rounded bg-stone-100" />
                </header>
                <div className="space-y-3 px-4 py-4">
                  <span className="block h-3 w-2/3 rounded bg-stone-50" />
                  <span className="block h-3 w-1/2 rounded bg-stone-50" />
                </div>
              </section>
            ))}
            <p className="text-center text-xs text-stone-400">
              Loading your matchups…
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-stone-300 p-10 text-center text-sm text-stone-400">
            No saved matchups yet.{" "}
            <Link
              href="/demo"
              className="underline underline-offset-2 hover:text-stone-800"
            >
              Build one →
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {groupRows(rows).map((group, gi) => {
              const pending = group.rows.filter(
                (r) => r.inBrowser && !r.inCloud,
              );
              return (
                <section
                  key={group.teamId}
                  className={`rise-in step-${Math.min(gi + 1, 4)} rounded-lg border border-stone-200 bg-white`}
                >
                  <header className="flex items-center gap-3 border-b border-stone-100 bg-[#fcfcfa] px-4 py-2.5">
                    <span className="flex shrink-0">
                      {group.team.parsed.slice(0, 6).map((p, i) => (
                        <MonIcon key={i} species={p.species} scale={0.55} />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span
                          title={`team id ${group.teamId}`}
                          className="min-w-0 truncate text-sm font-semibold text-stone-800"
                        >
                          {group.team.name}
                        </span>
                        <ImportedBadge team={group.team} />
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {group.rows.length} matchup
                        {group.rows.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    {cloud === "ok" && pending.length > 0 && (
                      <button
                        onClick={() => uploadAll(pending)}
                        disabled={busyId !== null}
                        className="shrink-0 rounded border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 hover:border-stone-400 disabled:opacity-40"
                      >
                        upload all ({pending.length})
                      </button>
                    )}
                    <button
                      onClick={() => copyGroup(group)}
                      title={`copy ${group.team.name} and all ${group.rows.length} matchup${group.rows.length === 1 ? "" : "s"} as JSON`}
                      className="shrink-0 rounded border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-400"
                    >
                      {copied && copiedTeamId === group.teamId
                        ? "Copied ✓"
                        : `copy JSON (${group.rows.length})`}
                    </button>
                    <button
                      onClick={() => addTeams(group)}
                      title={`add opposing teams to plan against ${group.team.name}`}
                      className="shrink-0 rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
                    >
                      ＋ add teams
                    </button>
                  </header>
                  <div className="divide-y divide-stone-100">
                    {group.rows.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50/60"
                      >
                        <button
                          onClick={() => open(row)}
                          title={`open ${row.entry.name}`}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left transition-opacity hover:opacity-70"
                        >
                          <span className="shrink-0 text-[10px] text-stone-300">
                            vs
                          </span>
                          <span className="flex shrink-0">
                            {row.entry.setup.opp.parsed
                              .slice(0, 6)
                              .map((p, i) => (
                                <MonIcon
                                  key={i}
                                  species={p.species}
                                  scale={0.5}
                                />
                              ))}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-700">
                            {row.entry.setup.opp.name}
                          </span>
                          <span className="shrink-0 text-[10px] text-stone-400">
                            {row.entry.nodes.length > 0
                              ? new Date(row.entry.savedAt).toLocaleDateString()
                              : "no plan yet"}
                          </span>
                        </button>
                        {/* The row's own id, shown because two rows can now
                            look identical — same opponent, same sprites, one
                            in a group you built and one in a group you pasted
                            in. It is the id everywhere: the localStorage
                            entry, the account row, the thing a delete removes.
                            Selectable text rather than part of the open
                            button, so it can be copied. */}
                        <span
                          title={`matchup id ${row.id}`}
                          className="hidden shrink-0 select-all font-mono text-[10px] text-stone-400 sm:inline"
                        >
                          #{row.id.slice(0, 8)}
                        </span>
                        {confirmId === row.id ? (
                          <InlineConfirm
                            question={`Delete from ${placesOf(row)}?`}
                            busy={busyId === row.id}
                            onConfirm={() => void remove(row)}
                            onCancel={() => setConfirmId(null)}
                          />
                        ) : (
                          <>
                            <span className="flex shrink-0 gap-1">
                              {row.inBrowser && (
                                <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-stone-500">
                                  browser
                                </span>
                              )}
                              {row.inCloud && (
                                <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sky-700">
                                  account
                                </span>
                              )}
                            </span>
                            {cloud === "ok" &&
                              row.inBrowser &&
                              !row.inCloud && (
                                <button
                                  onClick={() => upload(row)}
                                  disabled={busyId === row.id}
                                  className="shrink-0 rounded border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 hover:border-stone-400 disabled:opacity-40"
                                >
                                  upload
                                </button>
                              )}
                            <button
                              onClick={() => setConfirmId(row.id)}
                              disabled={busyId === row.id}
                              className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-stone-300 transition-colors hover:text-red-600 disabled:opacity-40"
                            >
                              delete
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <footer className="mt-16 border-t border-stone-200 pt-4 text-[11px] leading-relaxed text-stone-400">
          xatu is an unaffiliated, non-commercial fan project. Pokémon is owned
          by Nintendo, The Pokémon Company, Game Freak, and Creatures.
        </footer>
      </main>
    </div>
  );
}
