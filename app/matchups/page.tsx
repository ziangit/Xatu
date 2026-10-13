"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackLink, HeaderNav, LegalFooter, NavLink, Wordmark } from "../nav";
import { T } from "../i18n/T";
import { useLang } from "../i18n/provider";
import { PublishPanel } from "./publish-panel";
import {
  loadMyPublished,
  unpublishGroup,
  type MyPublished,
} from "../demo/publish";
import { InlineConfirm, InlineRename, useCopy } from "../ui";
import { ImportedBadge, MonIcon } from "../demo/components";
import dynamic from "next/dynamic";
import { TeamSprites } from "../demo/team-picker";

/**
 * Loaded when you open it, not when the page does.
 *
 * The chooser pulls in the import panel, the species type-ahead and the
 * catalogue query, and it renders only while you are composing a set or
 * adding opponents — which most visits to this list never do.
 */
const TeamChooser = dynamic(
  () => import("../demo/team-picker").then((m) => m.TeamChooser),
  { ssr: false },
);
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
  forgetTeams,
  groupDocId,
  loadMatchups,
  renameTeam,
  saveSetup,
  setActiveMatchupId,
  upsertMatchup,
  type SavedMatchup,
  type StoredTeam,
} from "../demo/storage";

// My matchups: every saved board — the ones in this browser and the ones
// synced to the signed-in account — grouped under the team of mine they were
// built with, because one team is planned against many opponents.
//
// This page absorbed the old `/demo` builder (2026-10-12). They were a list
// and a detail view of the same noun: a **group** is every SavedMatchup
// sharing `setup.my.id`, and the builder edited one while this listed them
// all. The split cost a duplicate grouping rule, a second weaker group list
// ("Your other teams"), and three query-string intents (`?new=1`, `?team=`,
// `?add=1`) whose only job was for one page to drive the other. A group now
// expands in place and the whole protocol is gone.
//
// The board stays its own route. Planning turns is a different activity from
// composing rosters, and that split is real.

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

/** Groups merged browser+account rows by the team of mine they belong to. It
 * is `groupByMyTeam`'s rule over `Row`s rather than bare `SavedMatchup`s,
 * because a row also carries where it lives (browser, account, or both). */
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
  const { lang, t, n, list } = useLang();
  const [rows, setRows] = useState<Row[]>([]);
  const [cloud, setCloud] = useState<
    "loading" | "off" | "ok" | { error: string }
  >("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Row awaiting its in-place delete confirmation (never window.confirm). */
  const [confirmId, setConfirmId] = useState<string | null>(null);
  /** Group whose publish panel is open, if any. */
  const [publishing, setPublishing] = useState<string | null>(null);
  /** Which group was copied — the shared hook says *whether*, this says *which*. */
  const { copied, copy } = useCopy();
  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotes, setImportNotes] = useState<string[]>([]);
  /** The set the last paste landed in — highlighted until the notes beside it
   * are dismissed, and gone on the next visit. Transient by design: it answers
   * "where did that go?", which stops being a question once you've looked. */
  const [justImported, setJustImported] = useState<string | null>(null);
  /** Composing a brand-new set: no team chosen yet. */
  const [composing, setComposing] = useState(false);
  /** A team chosen for a new set that has no opponents yet, so no rows exist
   * for it. A group is derived from its rows, so until the first opponent is
   * added there is nothing in storage to list — this is that gap, held in
   * React rather than written as a half-saved group. */
  const [draft, setDraft] = useState<StoredTeam | null>(null);
  /** Group whose add-opponents panel is open. */
  const [addingTo, setAddingTo] = useState<string | null>(null);
  /** Team being renamed in place — my team by group id, an opponent by row id. */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  /** Which of my sets are public, by team id. Empty when signed out. */
  const [published, setPublished] = useState<Map<string, MyPublished>>(
    new Map(),
  );
  /** Rows whose automatic upload failed — the only time sync is worth a word. */
  const [syncFailed, setSyncFailed] = useState<Set<string>>(new Set());
  /** Already attempted this visit, so refresh → sync → refresh cannot loop. */
  const attempted = useRef<Set<string>>(new Set());

  /** Badges flip as soon as the write lands — the refresh behind it only
   * reconciles, so a row never sits there looking unchanged. */
  const markInCloud = (ids: string[]) =>
    setRows((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, inCloud: true } : r)),
    );

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
    // Together, not one after the other: they are independent reads and the
    // page waits for both before it paints (the "one list, one paint" rule),
    // so serialising them put the whole second round trip on the clock.
    const [result, mine] = await Promise.all([
      listCloudMatchups(),
      loadMyPublished(),
    ]);
    const merged = mergeRows(
      local,
      result.state === "ok" ? result.matchups : null,
    );
    setRows(merged);
    setPublished(mine);
    if (result.state === "off") {
      setCloud("off");
      return;
    }
    if (result.state !== "ok") {
      setCloud({ error: result.message });
      return;
    }
    setCloud("ok");

    /**
     * Put anything browser-only into the account, without being asked.
     *
     * Every *write* path already mirrors — the board's save, an import, adding
     * an opponent, a fork — so a row that is browser-only was made while
     * signed out, or had a mirror fail. Asking the reader to notice that and
     * press "upload" was the app showing its own plumbing: four controls
     * (`upload all`, `upload`, and the `browser` / `account` badges that
     * explained them) in service of a decision nobody wants to make.
     *
     * Sync is therefore silent when it works, and only says anything when it
     * does not. Inlined rather than extracted so `refresh` closes over nothing
     * but setters, refs and imports — a component-scope callee makes it an
     * unstable reference and the mount effect's empty dep array a lint error.
     */
    const pending = merged.filter(
      (r) => r.inBrowser && !r.inCloud && !attempted.current.has(r.id),
    );
    if (pending.length === 0) return;
    const done: string[] = [];
    const failed: string[] = [];
    for (const row of pending) {
      attempted.current.add(row.id);
      const outcome = await upsertCloudMatchup(row.entry);
      if (outcome === "ok") done.push(row.id);
      else if (outcome !== "off") failed.push(row.id);
    }
    if (done.length)
      setRows((prev) =>
        prev.map((r) => (done.includes(r.id) ? { ...r, inCloud: true } : r)),
      );
    if (failed.length) setSyncFailed((prev) => new Set([...prev, ...failed]));
  };

  /** Try a failed row again, by hand — the one sync control left. */
  const retrySync = async (row: Row) => {
    setBusyId(row.id);
    const outcome = await upsertCloudMatchup(row.entry);
    setBusyId(null);
    if (outcome !== "ok") return;
    setSyncFailed((prev) => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
    markInCloud([row.id]);
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      // Two deep links, both from the board, both the same shape: "take me to
      // this set, with this panel open". The board knows which set it is
      // planning and this page does not, which is the whole reason they exist
      // — `?new=1` and `?add=1` went with the builder. Read from `location`
      // rather than useSearchParams, which would force a Suspense boundary
      // around the whole page.
      const params = new URLSearchParams(window.location.search);
      const team = params.get("team");
      if (team) setAddingTo(team);
      const toPublish = params.get("publish");
      if (toPublish) setPublishing(toPublish);
      void refresh();
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
    router.push("/board");
  };

  /**
   * Line up opponents for one of my teams. Each becomes its own board straight
   * away, unplanned (`nodes: []`) — the group is the only record of "my team
   * vs these", so an opponent with no plan yet still has to exist.
   *
   * This used to navigate to `/demo?team=…&add=1`; it is now the same page.
   */
  const addOpponents = async (my: StoredTeam, teams: StoredTeam[]) => {
    const already = new Set(
      rows
        .filter((r) => r.entry.setup.my.id === my.id)
        .map((r) => r.entry.setup.opp.id),
    );
    const now = new Date().toISOString();
    const created: SavedMatchup[] = [];
    for (const opp of teams) {
      if (opp.id === my.id || already.has(opp.id)) continue;
      already.add(opp.id);
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
    setAddingTo(null);
    setDraft(null);
    // Signed in → the pairing is worth syncing before any plan exists. A
    // failure stays silent: the row shows as browser-only with an upload
    // button, which is the honest signal.
    for (const entry of created) void upsertCloudMatchup(entry);
    await refresh();
  };

  /**
   * Picking the team for a new set. If that team already heads a group, there
   * is nothing to draft — open that group's add panel instead, so the same
   * team can never appear twice on this page.
   */
  const pickDraftTeam = (teams: StoredTeam[]) => {
    const team = teams[0];
    if (!team) return;
    setComposing(false);
    if (groupRows(rows).some((g) => g.teamId === team.id)) {
      setDraft(null);
      setAddingTo(team.id);
    } else {
      setDraft(team);
    }
  };

  /**
   * Renaming touches the team library, every saved board that references the
   * team, and the in-progress setup — `renameTeam` does all three — so the
   * list is re-read after it. A no-op rename returns null and nothing is read.
   */
  const rename = (teamId: string, name: string) => {
    setRenamingId(null);
    if (!renameTeam(teamId, name)) return;
    setDraft((d) => (d && d.id === teamId ? { ...d, name } : d));
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
    const result = decodeWorkflowGroup(importText.trim(), lang);
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
    setImportNotes([importSummary(applied, lang), ...result.warnings]);
    setJustImported(applied.my.id);
    void refresh();
  };

  /** Where a delete would land — spelled out in the inline confirmation. */
  const placesOfRows = (rows: Row[]) =>
    list([
      rows.some((r) => r.inBrowser) ? t("this browser") : "",
      rows.some((r) => r.inCloud) ? t("your account") : "",
    ]);
  const placesOf = (row: Row) => placesOfRows([row]);

  const removeRows = async (doomed: Row[]) => {
    for (const row of doomed) {
      if (row.inBrowser) deleteMatchup(row.id);
      if (row.inCloud) {
        const result = await deleteCloudMatchup(row.id);
        if (result !== "ok" && result !== "off") setCloud({ error: result });
      }
    }
    // The teams those boards used are only worth keeping if something else
    // still points at them — see `forgetTeams`, which checks before dropping.
    forgetTeams(
      doomed.flatMap((r) => [r.entry.setup.my.id, r.entry.setup.opp.id]),
    );
    const gone = new Set(doomed.map((r) => r.id));
    setRows((prev) => prev.filter((r) => !gone.has(r.id)));
  };

  const remove = async (row: Row) => {
    setConfirmId(null);
    setBusyId(row.id);
    await removeRows([row]);
    setBusyId(null);
    void refresh();
  };

  /**
   * Delete a whole set — the team and every plan built with it. Deleting an
   * imported group one row at a time was the only way to undo a paste, which is
   * three confirmations to undo one click.
   */
  const removeGroup = async (group: Group) => {
    setConfirmId(null);
    setBusyId(group.rows[0]?.id ?? null);
    if (justImported === group.teamId) setJustImported(null);
    // The public copy goes too, or deleting your work would leave a page up
    // that you can no longer reach from anywhere — the confirmation says so.
    const post = published.get(group.teamId);
    if (post) await unpublishGroup(post.slug);
    await removeRows(group.rows);
    setBusyId(null);
    void refresh();
  };

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="flex items-baseline justify-between border-b border-stone-200 pb-4">
          <div>
            <Wordmark />
            <p className="text-xs text-stone-400">{t("my matchups")}</p>
          </div>
          <HeaderNav>
            <NavLink href="/feed">{t("published")}</NavLink>
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
            {t("paste JSON")}
          </button>
          <button
            onClick={() => {
              setComposing(!composing);
              setDraft(null);
            }}
            className="rounded-md bg-[#e5484d] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:opacity-85 active:scale-[0.98]"
          >
            {t("＋ New matchup")}
          </button>
        </div>

        {showImport && (
          <div className="grow-in mt-4 rounded-lg border border-stone-200 bg-[#f6f5ef] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              {t("Paste a copied matchup")}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
              <T
                k="Anything copied with {0} — one opposing team or a whole set."
                parts={[<em key="btn">{t("copy JSON")}</em>]}
              />
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder={t("Paste here…")}
              className="mt-2 w-full resize-y rounded border border-stone-300 bg-white p-2.5 font-mono text-[11px] text-stone-700 placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={importGroup}
                disabled={!importText.trim()}
                className="rounded bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:opacity-80 disabled:opacity-30"
              >
                {t("Import")}
              </button>
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportText("");
                  setImportError(null);
                }}
                className="text-xs text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
              >
                {t("cancel")}
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
                {t("Import notes")}
              </p>
              <button
                onClick={() => {
                  setImportNotes([]);
                  setJustImported(null);
                }}
                className="text-[11px] text-stone-400 hover:text-stone-700"
              >
                {t("dismiss")}
              </button>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[11px] leading-relaxed text-stone-600">
              {importNotes.map((note, i) => (
                <li key={i}>· {note}</li>
              ))}
            </ul>
          </div>
        )}

        {composing && (
          <div className="grow-in mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              {t("Which of your teams?")}
            </p>
            <div className="mt-2">
              <TeamChooser
                label={t("My Team")}
                importLabel={t("+ import a new one instead")}
                hint={t(
                  "your team, then every team you expect to face — one plan each",
                )}
                onPick={pickDraftTeam}
                onCancel={() => setComposing(false)}
              />
            </div>
          </div>
        )}

        {/* A set with a team but no opponents yet. It has no rows, so it is
            not in the list below — it is drawn here, in the same shape, until
            the first opponent makes it real. */}
        {draft && (
          <section className="grow-in mt-4 rounded-lg border border-dashed border-stone-300 bg-white">
            <header className="flex items-center gap-3 border-b border-stone-100 px-4 py-2.5">
              <TeamSprites team={draft} scale={0.55} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">
                {draft.name}
              </span>
              <button
                onClick={() => setDraft(null)}
                className="shrink-0 text-[11px] text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
              >
                {t("cancel")}
              </button>
            </header>
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                {t("Opposing teams")}
              </p>
              <div className="mt-2">
                <TeamChooser
                  label={t("Opposing teams")}
                  multi
                  exclude={(tm) => tm.id === draft.id}
                  hint={t(
                    "type the six, or paste several teams at once — one matchup each",
                  )}
                  emptyNote={t("No other saved teams yet — import one.")}
                  importLabel={t("+ import new ones instead")}
                  onPick={(teams) => void addOpponents(draft, teams)}
                  onCancel={() => setDraft(null)}
                />
              </div>
            </div>
          </section>
        )}

        {cloud === "off" && (
          <p className="mt-4 text-xs leading-relaxed text-stone-400">
            <T
              k="Showing the matchups saved in this browser. {0} to also see the ones synced to your account."
              parts={[
                <Link
                  key="signin"
                  href="/login"
                  className="underline underline-offset-2 hover:text-stone-800"
                >
                  {t("Sign in")}
                </Link>,
              ]}
            />
          </p>
        )}
        {typeof cloud === "object" && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-800">
            {t(
              "Couldn’t load your account matchups: {error}. The browser ones are shown below.",
              { error: cloud.error },
            )}
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
              {t("Loading your matchups…")}
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-stone-300 p-10 text-center text-sm text-stone-400">
            <T
              k="No saved matchups yet. {0}"
              parts={[
                <button
                  key="build"
                  onClick={() => setComposing(true)}
                  className="underline underline-offset-2 hover:text-stone-800"
                >
                  {t("Build one →")}
                </button>,
              ]}
            />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {groupRows(rows).map((group, gi) => {
              // The wash marks what the *last paste* landed in, not provenance
              // — that's the badge's job, and it is permanent. Highlighting
              // every set that ever arrived in a document meant three groups on
              // one roster lit two of them up forever, which says nothing about
              // where to look now (user, 2026-08-14).
              const pasted = group.teamId === justImported;
              return (
                <section
                  key={group.teamId}
                  className={`rise-in step-${Math.min(gi + 1, 4)} rounded-lg border ${
                    pasted
                      ? "border-violet-200/70 bg-violet-50/40"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  <header
                    className={`flex items-center gap-3 border-b px-4 py-2.5 ${
                      pasted
                        ? "border-violet-100 bg-violet-50/70"
                        : "border-stone-100 bg-[#fcfcfa]"
                    }`}
                  >
                    <span className="flex shrink-0">
                      {group.team.parsed.slice(0, 6).map((p, i) => (
                        <MonIcon key={i} species={p.species} scale={0.55} />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      {renamingId === `my:${group.teamId}` ? (
                        <InlineRename
                          value={group.team.name}
                          label={t("rename {team}", { team: group.team.name })}
                          onRename={(next) => rename(group.teamId, next)}
                          onCancel={() => setRenamingId(null)}
                        />
                      ) : (
                        <span className="flex items-baseline gap-1.5">
                          <button
                            onClick={() => setRenamingId(`my:${group.teamId}`)}
                            title={t("rename {team}", {
                              team: group.team.name,
                            })}
                            className="min-w-0 truncate text-left text-sm font-semibold text-stone-800 underline-offset-2 hover:underline"
                          >
                            {group.team.name}
                          </button>
                          <ImportedBadge team={group.team} />
                        </span>
                      )}
                      <span
                        title={t("team id {id}", { id: group.teamId })}
                        className="block text-[10px] text-stone-400"
                      >
                        {n(group.rows.length, "matchup", "matchups")}
                      </span>
                    </span>
                    {/* The whole header turns into the question, the way a row
                        does — the set being deleted is what you're looking at,
                        so nothing needs to be described back to you. */}
                    {confirmId === `group:${group.teamId}` ? (
                      <InlineConfirm
                        question={
                          published.has(group.teamId)
                            ? t(
                                "Delete this set — {count} — from {places}, and take its published page down?",
                                {
                                  count: n(
                                    group.rows.length,
                                    "matchup",
                                    "matchups",
                                  ),
                                  places: placesOfRows(group.rows),
                                },
                              )
                            : t("Delete this set — {count} — from {places}?", {
                                count: n(
                                  group.rows.length,
                                  "matchup",
                                  "matchups",
                                ),
                                places: placesOfRows(group.rows),
                              })
                        }
                        confirmLabel={t("Delete set")}
                        busy={busyId !== null}
                        onConfirm={() => void removeGroup(group)}
                        onCancel={() => setConfirmId(null)}
                      />
                    ) : (
                      <>
                        <button
                          onClick={() => copyGroup(group)}
                          title={t("copy {team} and all {count} as JSON", {
                            team: group.team.name,
                            count: n(group.rows.length, "matchup", "matchups"),
                          })}
                          className="shrink-0 rounded border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-400"
                        >
                          {copied && copiedTeamId === group.teamId
                            ? t("Copied ✓")
                            : t("copy JSON ({n})", { n: group.rows.length })}
                        </button>
                        <button
                          onClick={() =>
                            setAddingTo(
                              addingTo === group.teamId ? null : group.teamId,
                            )
                          }
                          title={t(
                            "add opposing teams to plan against {team}",
                            {
                              team: group.team.name,
                            },
                          )}
                          className="shrink-0 rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
                        >
                          {t("＋ add teams")}
                        </button>
                        {/* Whether this set is already public is worth seeing
                            without opening anything — it is the difference
                            between "share this" and "this is already out
                            there". */}
                        {published.has(group.teamId) && (
                          <a
                            href={`/g/${published.get(group.teamId)!.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={t("open the published page")}
                            className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 hover:underline"
                          >
                            {t("public ↗")}
                          </a>
                        )}
                        <Link
                          href={`/matchups/${encodeURIComponent(group.teamId)}/report`}
                          title={t("write the report that goes with {team}", {
                            team: group.team.name,
                          })}
                          className="shrink-0 rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
                        >
                          {t("report")}
                        </Link>
                        <button
                          onClick={() =>
                            setPublishing(
                              publishing === group.teamId ? null : group.teamId,
                            )
                          }
                          title={t("publish {team} so anyone can read it", {
                            team: group.team.name,
                          })}
                          className="shrink-0 rounded border border-stone-300 bg-white px-2 py-0.5 text-[11px] text-stone-600 transition-colors hover:border-stone-500"
                        >
                          {published.has(group.teamId)
                            ? t("published")
                            : t("publish")}
                        </button>
                        <button
                          onClick={() => setConfirmId(`group:${group.teamId}`)}
                          title={t("delete {team} and all {count} it has", {
                            team: group.team.name,
                            count: n(group.rows.length, "matchup", "matchups"),
                          })}
                          className="shrink-0 text-[11px] text-stone-400 underline-offset-2 transition-colors hover:text-[#e5484d] hover:underline"
                        >
                          {t("delete set")}
                        </button>
                      </>
                    )}
                  </header>
                  {publishing === group.teamId && (
                    <div className="px-3 pb-1">
                      <PublishPanel
                        my={group.team}
                        boards={group.rows.map((r) => r.entry)}
                        published={published.get(group.teamId)}
                        onChanged={() => void refresh()}
                        onClose={() => setPublishing(null)}
                      />
                    </div>
                  )}
                  {addingTo === group.teamId && (
                    <div className="border-b border-stone-100 px-4 py-3">
                      <TeamChooser
                        label={t("Opposing teams")}
                        multi
                        exclude={(tm) =>
                          tm.id === group.teamId ||
                          group.rows.some((r) => r.entry.setup.opp.id === tm.id)
                        }
                        hint={t(
                          "type the six, or paste several teams at once — one matchup each",
                        )}
                        emptyNote={t("No other saved teams yet — import one.")}
                        importLabel={t("+ import new ones instead")}
                        onPick={(teams) => void addOpponents(group.team, teams)}
                        onCancel={() => setAddingTo(null)}
                      />
                    </div>
                  )}
                  <div className="divide-y divide-stone-100">
                    {group.rows.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50/60"
                      >
                        {renamingId === row.id ? (
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <TeamSprites
                              team={row.entry.setup.opp}
                              scale={0.5}
                            />
                            <InlineRename
                              value={row.entry.setup.opp.name}
                              label={t("rename {team}", {
                                team: row.entry.setup.opp.name,
                              })}
                              onRename={(next) =>
                                rename(row.entry.setup.opp.id, next)
                              }
                              onCancel={() => setRenamingId(null)}
                              className="flex-1"
                            />
                          </span>
                        ) : (
                          <button
                            onClick={() => open(row)}
                            title={t("open {name}", { name: row.entry.name })}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left transition-opacity hover:opacity-70"
                          >
                            <span className="shrink-0 text-[10px] text-stone-300">
                              vs
                            </span>
                            <TeamSprites
                              team={row.entry.setup.opp}
                              scale={0.5}
                            />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-700">
                              {row.entry.setup.opp.name}
                            </span>
                          </button>
                        )}
                        {/* How much plan exists, which is what the builder's
                            row showed. It replaces the saved-at date: the
                            question here is "did I plan this one yet", and a
                            date never answered it. */}
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                            row.entry.nodes.length > 0
                              ? "bg-stone-100 text-stone-500"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {row.entry.nodes.length > 0
                            ? n(row.entry.nodes.length, "state", "states")
                            : t("no plan yet")}
                        </span>
                        {/* The row's own id, shown because two rows can now
                            look identical — same opponent, same sprites, one
                            in a group you built and one in a group you pasted
                            in. It is the id everywhere: the localStorage
                            entry, the account row, the thing a delete removes.
                            Selectable text rather than part of the open
                            button, so it can be copied. */}
                        <span
                          title={t("matchup id {id}", { id: row.id })}
                          className="hidden shrink-0 select-all font-mono text-[10px] text-stone-400 sm:inline"
                        >
                          #{row.id.slice(0, 8)}
                        </span>
                        {confirmId === row.id ? (
                          <InlineConfirm
                            question={t("Delete from {places}?", {
                              places: placesOf(row),
                            })}
                            busy={busyId === row.id}
                            onConfirm={() => void remove(row)}
                            onCancel={() => setConfirmId(null)}
                          />
                        ) : (
                          <>
                            {/* Nothing is said while sync works, because
                                nothing needs doing. A row only speaks up when
                                its automatic upload failed. */}
                            {syncFailed.has(row.id) && (
                              <button
                                onClick={() => void retrySync(row)}
                                disabled={busyId === row.id}
                                title={t("this one isn’t in your account yet")}
                                className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                              >
                                {busyId === row.id
                                  ? t("retrying…")
                                  : t("not synced — retry")}
                              </button>
                            )}
                            <button
                              onClick={() => setRenamingId(row.id)}
                              className="shrink-0 text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
                            >
                              {t("rename")}
                            </button>
                            <button
                              onClick={() => setConfirmId(row.id)}
                              disabled={busyId === row.id}
                              className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-stone-300 transition-colors hover:text-red-600 disabled:opacity-40"
                            >
                              {t("delete")}
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

        <LegalFooter />
      </main>
    </div>
  );
}
