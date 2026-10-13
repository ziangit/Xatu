"use client";

import { useState } from "react";
import { importTeamText } from "@/lib/team";
import { useT } from "../i18n/provider";
import { ImportPanel, MonIcon } from "./components";
import { SAMPLE_TEAMS } from "./demo-data";
import { FORMATS } from "./formats";
import { isKeptApart, loadSavedTeams, rememberTeam } from "./storage";
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
  // planning for what is being played now, and 19 rows is a scroll.
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
          onCancel={onCancel}
        />
      )}

      {mode === "existing" && (
        <ExistingTeamList
          teams={existing}
          onPick={(team) => onPick([team])}
          onImport={() => setMode("import")}
          importLabel={importLabel}
          emptyNote={emptyNote}
        />
      )}
    </div>
  );
}
