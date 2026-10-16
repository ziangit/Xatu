"use client";

import { useEffect, useState } from "react";
import {
  BackLink,
  HeaderNav,
  LegalFooter,
  NavLink,
  Wordmark,
} from "../../../nav";
import { useLang } from "../../../i18n/provider";
import { InlineConfirm, useCopy } from "../../../ui";
import { TeamSprites } from "../../../demo/team-picker";
import { BoardView } from "../../../g/board-view";
import { ReportProse } from "../../../g/report-prose";
import { groupByMyTeam, loadMatchups } from "../../../demo/storage";
import type { SavedMatchup, StoredTeam } from "../../../demo/storage";
import {
  loadMyPublished,
  publishGroup,
  unpublishGroup,
  type MyPublished,
} from "../../../demo/publish";
import { reportKey, type Report } from "../../../demo/report";
import { SpeciesToken } from "./species-token";

/**
 * Write the report, then publish it.
 *
 * Its own page because composing prose is a different activity from listing
 * sets — the same argument that keeps the board separate. It shows the set in
 * publication order with a writable gap above each matchup and one at the end,
 * which is the whole feature: **text between two matchups**. Nothing here
 * reorders anything, so there is no drag and nothing to reconcile.
 *
 * The matchups are shown as one compact row each, not as boards. The point of
 * this page is the prose; rendering five full turn trees would bury it.
 */
export function ReportComposer({ teamId }: { teamId: string }) {
  const { t, n } = useLang();
  const [team, setTeam] = useState<StoredTeam | null>(null);
  const [boards, setBoards] = useState<SavedMatchup[]>([]);
  const [published, setPublished] = useState<MyPublished | null>(null);
  const [ready, setReady] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [before, setBefore] = useState<Record<string, string>>({});
  const [outro, setOutro] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [confirmGone, setConfirmGone] = useState(false);
  const { copied, copy } = useCopy();
  const url =
    slug && typeof window !== "undefined"
      ? `${window.location.origin}/g/${slug}`
      : null;

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      const group = groupByMyTeam(loadMatchups()).find(
        (g) => g.teamId === teamId,
      );
      if (group) {
        setTeam(group.team);
        setBoards(group.matchups);
        setTitle(group.team.name);
      }
      void loadMyPublished().then((map) => {
        if (!alive) return;
        const mine = map.get(teamId) ?? null;
        setPublished(mine);
        if (mine) {
          setTitle(mine.title);
          setDescription(mine.description);
          setBefore(mine.report?.before ?? {});
          setOutro(mine.report?.outro ?? "");
          setSlug(mine.slug);
        }
        setReady(true);
      });
    });
    return () => {
      alive = false;
    };
  }, [teamId]);

  const report: Report = { before, outro };

  const publish = async () => {
    if (!team) return;
    setBusy(true);
    setProblem(null);
    const r = await publishGroup({
      my: team,
      boards,
      title,
      description,
      report,
    });
    setBusy(false);
    if (r.ok) setSlug(r.slug);
    else setProblem(r.reason);
  };

  /** One writable gap. Empty until you ask for it, so the page stays quiet. */
  /** Take it down. The set itself is untouched — only the public copy goes. */
  const unpublish = async () => {
    if (!slug) return;
    setBusy(true);
    const ok = await unpublishGroup(slug);
    setBusy(false);
    setConfirmGone(false);
    if (ok) {
      setSlug(null);
      setPublished(null);
    } else setProblem("error");
  };

  /** One writable gap, keyed by the matchup it sits above. */
  const gap = (value: string, set: (v: string) => void) => (
    <TextSlot value={value} onChange={set} />
  );

  if (!ready) return null;

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      {/* As wide as the published page, because it now shows the same
          boards. It was max-w-3xl with one-line matchup rows and that is not
          what you are composing. */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="flex items-baseline justify-between border-b border-stone-200 pb-4">
          <div>
            <Wordmark />
            <p className="text-xs text-stone-500">{t("Team report")}</p>
          </div>
          <HeaderNav back="/matchups">
            <NavLink href="/matchups">{t("matchups")}</NavLink>
          </HeaderNav>
        </header>

        {!team ? (
          <p className="mt-10 text-sm text-stone-500">
            {t("That set isn’t in this browser.")}
          </p>
        ) : (
          <>
            <div className="mt-8 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <TeamSprites team={team} scale={0.7} />
                <span className="truncate text-xs text-stone-500">
                  {n(boards.length, "matchup", "matchups")}
                </span>
              </span>
              <BackLink
                fallback="/matchups"
                className="shrink-0 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-stone-500"
              />
            </div>

            <label className="mt-6 block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                {t("Title")}
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-stone-500 focus:outline-none"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                {t("Summary")}
              </span>
              {/* It does two jobs, and the hint has to name both: it opens
                  the published report as its first section, and it is the one
                  piece of text that leaves the site — the Open Graph
                  description and the feed card's subtitle. */}
              <p className="text-[11px] text-stone-400">
                {t(
                  "Opens the report, and is what shows when you post the link.",
                )}
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full resize-y rounded border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 focus:border-stone-500 focus:outline-none"
              />
            </label>

            <p className="mt-8 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              {t("The report")}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
              {t(
                "Write between the matchups. Type a Pokémon’s name in colons — :Incineroar: — to drop its sprite into the line.",
              )}
            </p>

            <div className="mt-3">
              {boards.map((board) => (
                <section key={board.id} className="mt-6">
                  {gap(before[reportKey(board.setup.opp)] ?? "", (v) =>
                    setBefore((prev) => ({
                      ...prev,
                      [reportKey(board.setup.opp)]: v,
                    })),
                  )}
                  {/* The matchup exactly as the published page draws it —
                      read-only. Composing against one-line rows meant not
                      seeing what you were writing around. Editing a board is
                      the board's job, not this page's. */}
                  <h2 className="mt-4 flex items-center gap-2 text-sm font-bold text-stone-800">
                    <TeamSprites team={board.setup.opp} scale={0.7} />
                    {t("vs. {team}", { team: board.setup.opp.name })}
                  </h2>
                  <div className="pointer-events-none mt-3 select-none opacity-95">
                    <BoardView
                      myRoster={board.setup.my.parsed.map((m) => m.species)}
                      oppRoster={board.setup.opp.parsed.map((m) => m.species)}
                      nodes={board.nodes}
                    />
                  </div>
                </section>
              ))}
              <div className="mt-6">{gap(outro, setOutro)}</div>
            </div>

            <div className="mt-8 flex items-center gap-3 border-t border-stone-200 pt-5">
              <button
                onClick={() => void publish()}
                disabled={busy || !title.trim()}
                className="rounded-md bg-[#e5484d] px-5 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:opacity-85 disabled:opacity-40"
              >
                {busy
                  ? t("Publishing…")
                  : published
                    ? t("Update the published page")
                    : t("Publish")}
              </button>

              {problem && (
                <span className="text-[11px] text-amber-700">
                  {problem === "no-username"
                    ? t("Pick a username first — it’s your byline.")
                    : problem === "signed-out"
                      ? t("Sign in to publish.")
                      : problem === "rate-limited"
                        ? t(
                            "That’s 10 new posts today — the daily limit. Editing a post you already published still works.",
                          )
                        : t("Couldn’t publish — try again.")}
                </span>
              )}
            </div>

            {/* The link, where the work that produced it is. This used to live
                in a panel on /matchups beside a *second* publish button, so the
                obvious button gave the old title-and-text flow and the report
                sat behind another one. One path now. */}
            {url && (
              <div className="grow-in mt-4 rounded-lg border border-stone-200 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  {t("Published")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-stone-50 px-2 py-1.5 text-xs text-stone-700">
                    {url}
                  </code>
                  <button
                    onClick={() => copy(url)}
                    className="shrink-0 rounded bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:opacity-80"
                  >
                    {copied ? t("Copied ✓") : t("copy link")}
                  </button>
                  <a
                    href={`/g/${slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-[11px] text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
                  >
                    {t("open it ↗")}
                  </a>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
                  {t(
                    "Anyone with the link can read it. Publish again to update it.",
                  )}
                </p>
                <div className="mt-2">
                  {confirmGone ? (
                    <InlineConfirm
                      question={t(
                        "Take this off the web? Your set stays here.",
                      )}
                      confirmLabel={t("Unpublish")}
                      busy={busy}
                      onConfirm={() => void unpublish()}
                      onCancel={() => setConfirmGone(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setConfirmGone(true)}
                      className="text-[11px] text-stone-400 underline-offset-2 transition-colors hover:text-[#e5484d] hover:underline"
                    >
                      {t("unpublish")}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <LegalFooter />
      </main>
    </div>
  );
}

/**
 * A gap you can write in.
 *
 * Closed with text in it, it *is* the published card — same white box, same
 * sprites — so the page you are editing looks like the page you are making.
 * Only an empty or open slot wears the dashed draft frame, because that frame
 * says "this is scaffolding" and a finished paragraph is not. Wrapping the
 * closed state in one as well drew a box around a box.
 */
function TextSlot({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="block w-full text-left"
        title={t("edit this text")}
      >
        {value.trim() ? (
          <ReportProse
            text={value}
            className="transition-colors hover:border-stone-400"
          />
        ) : (
          // Same width as the card it becomes — and as the matchup below it —
          // so a slot doesn't jump when you write in it.
          <span className="block rounded-lg border border-dashed border-stone-300 bg-white/60 px-4 py-2.5 text-[11px] text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-700">
            {t("+ add text here")}
          </span>
        )}
      </button>
    );

  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white/60 p-2.5">
      <textarea
        value={value}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={t("Why this matchup goes the way it does…")}
        className="w-full resize-y rounded border border-stone-200 bg-[#fcfcfa] px-2.5 py-2 text-sm leading-relaxed text-stone-800 placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
      />
      <div className="mt-1.5 flex items-center gap-3">
        {/* A button, not the hairline link it was — and it only ever appeared
            once a slot was already open, so there was nowhere to *find* it. */}
        <SpeciesToken onInsert={(token) => onChange(`${value}${token}`)} />
        <button
          onClick={() => setOpen(false)}
          className="text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
        >
          {t("done")}
        </button>
      </div>
    </div>
  );
}
