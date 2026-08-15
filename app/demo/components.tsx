"use client";

import { useState } from "react";
import { Team } from "@pkmn/sets";
import { importTeams, teamLabel } from "@/lib/team";
import { useCopy } from "../ui";
import { CatalogueLookup } from "./catalogue-lookup";
import { MonIcon } from "./mon-icon";
import { TYPE_COLORS } from "./type-colors";
import { SpeciesPicker, emptySlots } from "./species-picker";
import { isKeptApart, type StoredTeam } from "./storage";

export { MonIcon, TYPE_COLORS };

export const FORMATS = [
  "[Gen 9 Champions] VGC 2026 Reg M-B",
  "[Gen 9 Champions] VGC 2026 Reg M-A",
  "[Gen 9] SV VGC Reg I",
];

/**
 * Says a team arrived in a pasted document rather than being built here. Two
 * groups can hold the same six Pokémon — one of mine, one someone shared — and
 * without this they are indistinguishable everywhere they're listed together.
 * Renders nothing for a team of my own, so callers needn't check.
 */
export function ImportedBadge({ team }: { team: StoredTeam }) {
  // Only a group that had to be kept apart from one of yours: the badge exists
  // to tell two look-alikes apart, so a lone imported group doesn't need it
  // (and a restored backup would be mislabelled by one).
  if (!isKeptApart(team)) return null;
  return (
    <span
      title={`pasted in on ${new Date(team.origin!.importedAt).toLocaleDateString()} · your own plans for these six are a separate set`}
      className="shrink-0 rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-700"
    >
      imported
    </span>
  );
}

const POKEPASTE_RE = /^https?:\/\/pokepast\.es\/\w+\/?$/;

/**
 * Champscope-style import panel: cream card, small-caps labels, format
 * dropdown, one big textarea, red action button. Always hands back an array —
 * `multi` only changes the copy and lets several teams through at once.
 *
 * Two ways in, because not everyone arrives with a paste: **paste** takes a
 * pokepaste link or an export, **type names** builds a team a Pokémon at a time
 * through the species type-ahead. Both end in the same `importTeams` call, so a
 * typed team is a pasted team — the species-list path already existed, the
 * picker only makes it reachable without knowing the comma syntax.
 */
export function ImportPanel({
  label,
  onImport,
  onCancel,
  multi = false,
}: {
  label: string;
  onImport: (teams: Omit<StoredTeam, "id">[]) => void;
  /** Renders a cancel button that backs out of the panel. */
  onCancel?: () => void;
  /** Accept several teams from one paste (opposing-team lists). */
  multi?: boolean;
}) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState(FORMATS[0]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"paste" | "pick">("paste");
  const [picked, setPicked] = useState<string[]>(emptySlots);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A typed team is a comma-separated species list, which `importTeams` has
  // always understood — the picker guarantees the names are spelled right.
  // Blanks are dropped here and only here: the picker keeps them so a name
  // stays in the slot it was typed into.
  const input = (
    mode === "pick" ? picked.filter(Boolean).join(", ") : text
  ).trim();

  const submit = async () => {
    if (!input) return;
    setError(null);

    // Pokepaste links (one per line in multi mode) are fetched server-side;
    // each paste can itself hold several teams.
    const lines = input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    let sources = [input];
    if (lines.length > 0 && lines.every((l) => POKEPASTE_RE.test(l))) {
      const links = multi ? lines : lines.slice(0, 1);
      setBusy(true);
      try {
        sources = await Promise.all(
          links.map(async (link) => {
            const res = await fetch(
              `/api/pokepaste?url=${encodeURIComponent(link)}`,
            );
            if (!res.ok) throw new Error(link);
            return res.text();
          }),
        );
      } catch {
        setError(
          multi && links.length > 1
            ? "Couldn't fetch one of those pastes — check the links."
            : "Couldn't fetch that paste — check the link.",
        );
        setBusy(false);
        return;
      }
      setBusy(false);
    }

    const teams = sources.flatMap(importTeams);
    if (teams.length === 0) {
      setError("That doesn't parse as a team export or a species list.");
      return;
    }
    const kept = multi ? teams : teams.slice(0, 1);
    onImport(
      kept.map((team, i) => ({
        // In multi mode every team needs its own name, so the header name or
        // the species fallback wins; the name field is only a single-team nicety.
        name:
          (multi ? team.name : name.trim() || team.name) ||
          (multi || kept.length > 1 ? teamLabel(team.parsed) : label) ||
          `${label} ${i + 1}`,
        format,
        exportText: team.exportText,
        parsed: team.parsed,
      })),
    );
    // Opposing-team panels stay open to line up the next one, so a team that
    // has been handed over must leave the picker.
    setPicked(emptySlots());
  };

  return (
    <div className="grow-in rounded-lg border border-stone-200 bg-[#f6f5ef] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-stone-800">
          {mode === "pick" ? "Add" : "Import"} — {label}
        </h3>
        <span className="flex shrink-0 items-center gap-1 rounded-md border border-stone-300 bg-white p-0.5">
          {(["paste", "pick"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                mode === m
                  ? "bg-stone-800 text-white"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {m === "paste" ? "paste" : "type names"}
            </button>
          ))}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        {mode === "pick" ? (
          <>
            Type a few letters and pick the Pokémon — <code>pika</code> finds
            Pikachu. Six makes a team; sets and items come from a paste.
          </>
        ) : multi ? (
          <>
            Paste one team or many — several pokepast.es links (one per line), a
            multi-team export split by <code>=== name ===</code> lines, or one
            comma-separated species list per line.
          </>
        ) : (
          <>
            Paste a team — a pokepast.es link, a Showdown/teambuilder export, or
            just species names separated by commas.
          </>
        )}
      </p>
      <div
        className={`mt-3 grid gap-3 ${multi ? "grid-cols-1" : "grid-cols-2"}`}
      >
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
            Format
          </span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700 focus:border-stone-500 focus:outline-none"
          >
            {FORMATS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className={multi ? "hidden" : "block"}>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
            Team name (optional)
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={label}
            className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700 placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
          />
        </label>
      </div>
      {mode === "pick" ? (
        <div className="mt-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
            Team — six Pokémon
          </span>
          <div className="mt-1">
            <SpeciesPicker slots={picked} onChange={setPicked} autoFocus />
          </div>
          {/* Four named species is where a guess becomes worth offering; the
              lookup is read-only and only ever runs when clicked. */}
          <CatalogueLookup
            species={picked.filter(Boolean)}
            regulation={format}
          />
        </div>
      ) : (
        <label className="mt-3 block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
            {multi
              ? "Teams — pokepaste links, exports, or species names"
              : "Team — pokepaste, export, or species names"}
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            spellCheck={false}
            placeholder={
              multi
                ? "https://pokepast.es/aaaaaaaaaaaaaaaa\nhttps://pokepast.es/bbbbbbbbbbbbbbbb\n\n— or —  one archetype per line:\nAerodactyl, Charizard, Kingambit, Sylveon, Rillaboom, Farigiraf\nMiraidon, Iron Hands, Farigiraf, Incineroar, Flutter Mane, Landorus"
                : "Charizard @ Charizardite Y\nAbility: Blaze\n- Heat Wave\n...\n\n— or —  Charizard, Basculegion, Kingambit, Sylveon, Rillaboom, Farigiraf"
            }
            className="mt-1 w-full resize-y rounded border border-stone-300 bg-white p-2.5 font-mono text-[11px] leading-relaxed text-stone-700 placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
          />
        </label>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy || !input}
          className="rounded bg-[#e5484d] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:opacity-85 active:scale-[0.98] disabled:opacity-30"
        >
          {busy
            ? "Fetching…"
            : mode === "pick"
              ? multi
                ? "Add team"
                : "Add"
              : multi
                ? "Add teams"
                : "Import"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
          >
            cancel
          </button>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

const STAT_LABEL: [key: string, label: string][] = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
];

function evLine(
  evs: Partial<Record<string, number>> | undefined,
): string | null {
  if (!evs) return null;
  const parts = STAT_LABEL.filter(([k]) => (evs[k] ?? 0) > 0).map(
    ([k, label]) => `${evs[k]} ${label}`,
  );
  return parts.length > 0 ? parts.join(" / ") : null;
}

/**
 * Champscope-style team panel: collapsed row of minisprites + name, expanding
 * to the full sets (no source line, no usage counts — per reference).
 */
export function TeamPanel({
  team,
  defaultOpen = false,
  collapsed = false,
}: {
  team: StoredTeam;
  defaultOpen?: boolean;
  /** Force the compact one-row view (e.g. while a replace flow is open). */
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { copied, copy } = useCopy();
  const isOpen = open && !collapsed;

  // Full set details (EVs, nature, level) come from re-parsing the verbatim
  // export — the parsed view in the schema is deliberately minimal.
  const sets = isOpen ? (Team.import(team.exportText)?.team ?? []) : [];

  const copyExport = () => copy(team.exportText);

  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <button
        onClick={() => setOpen(!isOpen)}
        disabled={collapsed}
        className="flex w-full items-center gap-3 px-3 py-2 text-left"
      >
        <span className="text-[10px] text-stone-400">
          {collapsed ? "" : isOpen ? "▾" : "▸"}
        </span>
        {/* 0.7 scale: at full size the six icons plus the format badge left the
            team's own name no room to render in a half-width column. */}
        <span className="flex shrink-0">
          {team.parsed.map((m, i) => (
            <MonIcon
              key={`${m.species}-${i}`}
              species={m.species}
              scale={0.7}
            />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wide text-stone-800">
          {team.name}
        </span>
        <span className="shrink-0 whitespace-nowrap rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">
          {team.format.replace(/^\[.*?\]\s*/, "")}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-stone-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              Sets
            </span>
            <button
              onClick={copyExport}
              className="rounded border border-stone-200 px-2 py-0.5 text-[10px] text-stone-500 hover:border-stone-400"
            >
              {copied ? "Copied ✓" : "Copy export"}
            </button>
          </div>
          <div className="mt-2 divide-y divide-stone-100">
            {sets.map((set, i) => {
              const evs = evLine(set.evs as Partial<Record<string, number>>);
              return (
                <div key={i} className="flex gap-2 py-2">
                  <MonIcon species={set.species || set.name || "?"} scale={1} />
                  <div className="min-w-0 text-[11px] leading-relaxed text-stone-600">
                    <p>
                      <span className="font-bold text-stone-800">
                        {set.species || set.name}
                      </span>
                      {set.item && <> @ {set.item}</>}
                    </p>
                    {set.ability && <p>Ability: {set.ability}</p>}
                    {evs && <p>EVs: {evs}</p>}
                    {set.nature && <p>{set.nature} Nature</p>}
                    {(set.moves ?? []).map((m) => (
                      <p key={m}>- {m}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
