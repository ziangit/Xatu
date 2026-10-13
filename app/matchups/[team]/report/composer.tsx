"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BackLink,
  HeaderNav,
  LegalFooter,
  NavLink,
  Wordmark,
} from "../../../nav";
import { useLang } from "../../../i18n/provider";
import { MonIcon } from "../../../demo/components";
import { TeamSprites } from "../../../demo/team-picker";
import { groupByMyTeam, loadMatchups } from "../../../demo/storage";
import type { SavedMatchup, StoredTeam } from "../../../demo/storage";
import {
  loadMyPublished,
  publishGroup,
  type MyPublished,
} from "../../../demo/publish";
import { parseReportText, reportKey, type Report } from "../../../demo/report";
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
  const router = useRouter();
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
  /** One writable gap, keyed by the matchup it sits above. */
  const gap = (value: string, set: (v: string) => void) => (
    <div className="py-1">
      <TextSlot value={value} onChange={set} />
    </div>
  );

  if (!ready) return null;

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-3xl px-6 py-12">
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
              {/* This is the one that leaves the site: it is the Open Graph
                  description and the feed card's subtitle, so it is labelled
                  by where it shows up rather than by what it is. */}
              <p className="text-[11px] text-stone-400">
                {t("Shown when you post the link, and on the feed.")}
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

            <div className="mt-3 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
              {boards.map((board) => (
                <div key={board.id}>
                  <div className="px-3">
                    {gap(before[reportKey(board.setup.opp)] ?? "", (v) =>
                      setBefore((prev) => ({
                        ...prev,
                        [reportKey(board.setup.opp)]: v,
                      })),
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-[#fcfcfa] px-3 py-2">
                    <span className="shrink-0 text-[10px] text-stone-300">
                      {t("vs")}
                    </span>
                    <TeamSprites team={board.setup.opp} scale={0.5} />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-700">
                      {board.setup.opp.name}
                    </span>
                  </div>
                </div>
              ))}
              <div className="px-3">{gap(outro, setOutro)}</div>
            </div>

            <Preview before={before} outro={outro} boards={boards} />

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
              {slug && (
                <button
                  onClick={() => router.push(`/g/${slug}`)}
                  className="text-xs text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
                >
                  {t("see the page ↗")}
                </button>
              )}
              {problem && (
                <span className="text-[11px] text-amber-700">
                  {problem === "no-username"
                    ? t("Pick a username first — it’s your byline.")
                    : problem === "signed-out"
                      ? t("Sign in to publish.")
                      : problem === "rate-limited"
                        ? t(
                            "That’s 5 new posts today — the daily limit. Editing a post you already published still works.",
                          )
                        : t("Couldn’t publish — try again.")}
                </span>
              )}
            </div>
          </>
        )}

        <LegalFooter />
      </main>
    </div>
  );
}

/** A gap you can write in. Collapsed to a hint until it has text or focus. */
function TextSlot({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(Boolean(value));
  if (!open && !value)
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-1.5 text-left text-[11px] text-stone-300 hover:text-stone-600"
      >
        {t("+ add text here")}
      </button>
    );
  return (
    <div className="py-2">
      <textarea
        value={value}
        autoFocus={!value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => !value.trim() && setOpen(false)}
        rows={3}
        placeholder={t("Why this matchup goes the way it does…")}
        className="w-full resize-y rounded border border-stone-200 bg-[#fcfcfa] px-2.5 py-2 text-xs leading-relaxed text-stone-800 placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
      />
      <SpeciesToken onInsert={(token) => onChange(`${value}${token}`)} />
    </div>
  );
}

/** What the prose will actually look like, sprites and all. */
function Preview({
  before,
  outro,
  boards,
}: {
  before: Record<string, string>;
  outro: string;
  boards: SavedMatchup[];
}) {
  const { t } = useLang();
  const written = [
    ...boards.map((b) => before[reportKey(b.setup.opp)] ?? ""),
    outro,
  ].filter((s) => s.trim());
  if (written.length === 0) return null;
  return (
    <section className="mt-6">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
        {t("Preview")}
      </p>
      <div className="mt-2 space-y-2 rounded-lg border border-stone-200 bg-white p-3">
        {written.map((text, i) => (
          <p
            key={i}
            className="whitespace-pre-wrap text-xs leading-relaxed text-stone-700"
          >
            {parseReportText(text).map((seg, j) =>
              seg.kind === "mon" ? (
                <span key={j} className="inline-block align-middle">
                  <MonIcon species={seg.species} scale={0.6} />
                </span>
              ) : (
                <span key={j}>{seg.text}</span>
              ),
            )}
          </p>
        ))}
      </div>
    </section>
  );
}
