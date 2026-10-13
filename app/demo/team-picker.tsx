"use client";

import { useEffect, useState } from "react";
import { importTeamText } from "@/lib/team";
import { useT } from "../i18n/provider";
import { InlineConfirm } from "../ui";
import { ImportPanel, MonIcon } from "./components";
import { SAMPLE_TEAMS } from "./demo-data";
import { FORMATS } from "./formats";
import { searchCatalogue, type CatalogueTeam } from "./catalogue";
import {
  forgetTeams,
  isKeptApart,
  loadSavedTeams,
  rememberTeam,
} from "./storage";
import type { StoredTeam } from "./storage";

/**
 * Choosing a team: the built-in samples, the ones you've saved, and the panel
 * that makes a new one.
 *
 * Extracted from the old `/demo` page when it merged into `/matchups`. It had
 * two near-copies of this flow — one for My Team, one for the opposing list —
 * differing only in whether several teams could be picked at once. That
 * difference is now the `multi` prop and everything else is shared.
 */

// The built-in teams offered before you've imported any of your own. They are
// exactly SAMPLE_TEAMS — a preset is a real pasted team, not a special kind of
// one, so nothing here may diverge from what an import would produce.
export const PRESETS: StoredTeam[] = SAMPLE_TEAMS.map((s, i) => ({
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

/** Compact sprite row — the way a team is named everywhere but the board. */
export function TeamSprites({
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

/**
 * The teams offered by "use existing": everything the browser remembers, plus
 * the built-in presets — each team once. Presets need the dedupe because
 * picking one writes it into the saved-teams library under its own preset id
 * (`rememberTeam` canonicalises by roster), so a naive concat listed it twice
 * *and* collided on the React key.
 */
export function existingTeams(
  exclude: (team: StoredTeam) => boolean,
): StoredTeam[] {
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

/**
 * Your saved teams, then the built-in samples.
 *
 * The regulation filter scopes **only the samples**. Your own teams are few,
 * they are yours, and hiding them behind a regulation tab is how someone
 * concludes their work is gone. Putting the tabs on the samples divider makes
 * that scope self-evident without a sentence explaining it.
 */
function ExistingTeamList({
  teams,
  onPick,
  onImport,
  onBack,
  onForget,
  importLabel,
  emptyNote,
}: {
  teams: StoredTeam[];
  onPick: (team: StoredTeam) => void;
  onImport: () => void;
  /** Step back to the New team / Use existing choice. Absent = no choice box
   * behind this list, so there is nowhere to go back to. */
  onBack?: () => void;
  /** Drop a saved team from the library. Absent = not offered. */
  onForget?: (team: StoredTeam) => void;
  importLabel: string;
  emptyNote?: string;
}) {
  const t = useT();
  /** VGCPastes search. Empty is the default and shows only the samples —
   * 1,295 catalogue teams is not a list anybody scrolls. */
  const [search, setSearch] = useState("");
  /** Results together with the query they answer. Keeping the query here is
   * what makes "still searching" derivable — clearing results in the effect
   * body would be a synchronous setState during an effect. */
  const [found, setFound] = useState<{
    query: string;
    teams: CatalogueTeam[];
  } | null>(null);
  const [forgetId, setForgetId] = useState<string | null>(null);
  const query = search.trim();
  const searching = query !== "" && found?.query !== query;

  useEffect(() => {
    const text = search.trim();
    if (!text) return;
    // Debounced: a code is five keystrokes and every one of them would
    // otherwise be a round trip.
    let alive = true;
    const timer = setTimeout(() => {
      void searchCatalogue(text).then((r) => {
        if (alive)
          setFound({ query: text, teams: r.state === "ok" ? r.teams : [] });
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [search]);
  // Defaults to the current regulation rather than "all": the common case is
  // planning for what is being played now, and 19 rows is a scroll.
  const [reg, setReg] = useState<string>(SAMPLE_REGULATIONS[0] ?? "");
  const mine = teams.filter((tm) => !tm.id.startsWith("preset-"));
  const samples = teams.filter(
    (tm) => tm.id.startsWith("preset-") && (reg === "" || tm.format === reg),
  );

  const row = (tm: StoredTeam) => {
    const isSample = tm.id.startsWith("preset-");
    return (
      <div
        key={tm.id}
        className="flex w-full items-center gap-2 px-3 py-1.5 transition-colors hover:bg-stone-50"
      >
        <button
          onClick={() => onPick(tm)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <TeamSprites team={tm} scale={0.45} />
          <span className="min-w-0 truncate text-xs font-medium text-stone-700">
            {tm.name}
          </span>
          <span className="ml-auto shrink-0 text-[10px] text-stone-400">
            {isSample
              ? t("sample")
              : isKeptApart(tm)
                ? t("imported")
                : t("saved")}
          </span>
        </button>
        {/* Saved teams only. A sample is not in the library until it is
            picked, and there has been no way at all to drop one until now —
            a team left over from an old build simply sat here forever. */}
        {onForget &&
          !isSample &&
          (forgetId === tm.id ? (
            <InlineConfirm
              question={t("Forget this team?")}
              confirmLabel={t("Forget")}
              onConfirm={() => {
                setForgetId(null);
                onForget(tm);
              }}
              onCancel={() => setForgetId(null)}
            />
          ) : (
            <button
              onClick={() => setForgetId(tm.id)}
              title={t("forget {team}", { team: tm.name })}
              className="shrink-0 rounded px-1 py-0.5 text-[11px] text-stone-300 hover:text-red-600"
            >
              ✕
            </button>
          ))}
      </div>
    );
  };

  /** A catalogue hit, offered the same way a sample is. */
  const catalogueRow = (team: CatalogueTeam) => {
    const parsed = importTeamText(team.export_text);
    if (!parsed) return null;
    return (
      <button
        key={team.source_team_id}
        onClick={() =>
          onPick(
            rememberTeam(
              {
                id: crypto.randomUUID(),
                name: team.name ?? team.source_team_id,
                format: team.regulation,
                exportText: parsed.exportText,
                parsed: parsed.parsed,
              },
              { authoritative: true },
            ),
          )
        }
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-stone-50"
      >
        <span className="flex shrink-0">
          {team.species.slice(0, 6).map((sp, i) => (
            <MonIcon key={`${sp}-${i}`} species={sp} scale={0.45} />
          ))}
        </span>
        <span className="min-w-0 truncate text-xs font-medium text-stone-700">
          {team.name ?? team.source_team_id}
        </span>
        <span className="ml-auto shrink-0 font-mono text-[10px] text-stone-400">
          {team.source_team_id}
        </span>
      </button>
    );
  };

  return (
    <div className="grow-in rounded-lg border border-stone-200 bg-white py-1">
      {onBack && (
        <button
          onClick={onBack}
          className="w-full border-b border-stone-100 px-3 py-1.5 text-left text-xs text-stone-400 hover:bg-stone-50 hover:text-stone-700"
        >
          {t("panel|← back to options")}
        </button>
      )}

      {/* VGCPastes, by the id the sheet prints: MB712, MC20. Above the list,
          not below it: as a hairline input under fifteen rows nobody found it,
          the same way the damage-calculator link stayed invisible until it
          became a button. The catalogue is 1,400+ teams, so it is reachable by
          search and never listed — the samples stay the default. */}
      <div className="border-b border-stone-200 bg-[#f6f5ef] px-3 py-2.5">
        <label className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 transition-colors focus-within:border-stone-500">
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-stone-400"
          >
            <circle
              cx="7"
              cy="7"
              r="4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M10.5 10.5 L14 14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search VGCPastes — MB712, MC20, or a team name")}
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setSearch("")}
              title={t("clear the search")}
              className="shrink-0 rounded px-1 text-[11px] text-stone-400 hover:text-stone-800"
            >
              ✕
            </button>
          )}
        </label>
        <p className="mt-1.5 text-[10px] leading-relaxed text-stone-400">
          {t(
            "Every team on the VGCPastes sheet — search it, or pick from your own and the samples below.",
          )}
        </p>
      </div>
      {teams.length === 0 && emptyNote && (
        <p className="px-3 py-2 text-xs text-stone-400">{emptyNote}</p>
      )}
      {!search && mine.map(row)}
      {!search && SAMPLE_REGULATIONS.length > 0 && (
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
      {!search && samples.map(row)}

      {query && (
        <>
          {searching && (
            <p className="px-3 py-1.5 text-[11px] text-stone-400">
              {t("Searching…")}
            </p>
          )}
          {!searching && found?.teams.length === 0 && (
            <p className="px-3 py-1.5 text-[11px] text-stone-400">
              {t("No team with that code or name.")}
            </p>
          )}
          {!searching && found?.teams.map(catalogueRow)}
        </>
      )}

      <button
        onClick={onImport}
        className="w-full px-3 py-1.5 text-left text-xs text-stone-400 hover:bg-stone-50"
      >
        {importLabel}
      </button>
    </div>
  );
}

/**
 * Pick a team, or several: the choice box, the import panel, and the existing
 * list, as one thing.
 *
 * Every team that leaves here has already been through `rememberTeam` with
 * `authoritative: true` for a fresh paste — a paste the user just typed is the
 * truth about that team — so the caller receives library teams and never has
 * to know which route produced them.
 */
export function TeamChooser({
  label,
  multi = false,
  startOn = "choice",
  exclude = () => false,
  hint,
  emptyNote,
  importLabel,
  onPick,
  onCancel,
}: {
  label: string;
  multi?: boolean;
  startOn?: "choice" | "import";
  exclude?: (team: StoredTeam) => boolean;
  hint?: string;
  emptyNote?: string;
  importLabel: string;
  onPick: (teams: StoredTeam[]) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [mode, setMode] = useState<"choice" | "import" | "existing">(startOn);
  const [existing, setExisting] = useState<StoredTeam[]>([]);

  const openExisting = () => {
    // localStorage is browser-only; read on interaction, not at render.
    setExisting(existingTeams(exclude));
    setMode("existing");
  };

  /**
   * One step back, not all the way out. Opening the import panel or the
   * existing list used to be a one-way door: its `cancel` ran the chooser's
   * `onCancel`, which throws the whole draft away. The way back to "New team
   * or Use existing" simply did not exist (user, three times now).
   *
   * When the chooser was opened straight into import (`startOn: "import"`)
   * there is no choice box behind it, so backing out *is* cancelling.
   *
   * It names its destination rather than saying "← back": the page's own
   * BackLink says exactly that, and two identical labels on one screen is the
   * collision docs/ARCHITECTURE.md's navigation rule exists to prevent.
   */
  const hasChoice = startOn === "choice";
  const back = hasChoice ? () => setMode("choice") : onCancel;

  /**
   * Drop a team from the library. `forgetTeams` refuses while any board or the
   * in-progress setup still names it, so this cannot orphan a plan — and when
   * it refuses, the row simply stays, which is the honest outcome.
   */
  const forget = (team: StoredTeam) => {
    forgetTeams([team.id]);
    setExisting(existingTeams(exclude));
  };

  return (
    <div className="space-y-3">
      {mode === "choice" && (
        <div className="grow-in flex h-32 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-stone-300">
          <div className="flex gap-3">
            {/* "New team", not "Import": the panel behind it also builds a team
                by typing names, so naming the paste would hide half of what the
                button does. */}
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
            <button
              onClick={onCancel}
              className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              {t("cancel")}
            </button>
          </div>
          {hint && <p className="text-[11px] text-stone-400">{hint}</p>}
        </div>
      )}

      {mode === "import" && (
        <ImportPanel
          label={label}
          multi={multi}
          onCancel={back}
          cancelLabel={hasChoice ? t("panel|← back to options") : undefined}
          onImport={(teams) =>
            onPick(
              teams.map((team) =>
                rememberTeam(
                  { ...team, id: crypto.randomUUID() },
                  { authoritative: true },
                ),
              ),
            )
          }
        />
      )}

      {mode === "existing" && (
        <ExistingTeamList
          teams={existing}
          onPick={(team) => onPick([team])}
          onImport={() => setMode("import")}
          onBack={hasChoice ? () => setMode("choice") : undefined}
          onForget={forget}
          importLabel={importLabel}
          emptyNote={emptyNote}
        />
      )}
    </div>
  );
}
