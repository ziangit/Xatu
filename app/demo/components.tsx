"use client";

import { useState, type CSSProperties } from "react";
import { Icons } from "@pkmn/img";
import { Team } from "@pkmn/sets";
import type { ParsedMon } from "@/lib/schema";
import { importTeamText } from "@/lib/team";
import type { StoredTeam } from "./storage";

/** Showdown team-preview pixel icon, from the hotlinked icon sheet. */
export function MonIcon({
  species,
  scale = 2,
  fainted = false,
}: {
  species: string;
  scale?: number;
  fainted?: boolean;
}) {
  const { css } = Icons.getPokemon(species);
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden ${fainted ? "opacity-40 grayscale" : ""}`}
      style={{ width: 40 * scale, height: 30 * scale }}
    >
      <span
        style={{
          ...(css as CSSProperties),
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </span>
  );
}

/** Showdown-style type colors, for move buttons/chips. */
export const TYPE_COLORS: Record<string, string> = {
  Normal: "#A8A77A",
  Fire: "#EE8130",
  Water: "#6390F0",
  Electric: "#F7D02C",
  Grass: "#7AC74C",
  Ice: "#96D9D6",
  Fighting: "#C22E28",
  Poison: "#A33EA1",
  Ground: "#E2BF65",
  Flying: "#A98FF3",
  Psychic: "#F95587",
  Bug: "#A6B91A",
  Rock: "#B6A136",
  Ghost: "#735797",
  Dragon: "#6F35FC",
  Dark: "#705746",
  Steel: "#B7B7CE",
  Fairy: "#D685AD",
};

export const FORMATS = [
  "[Gen 9 Champions] VGC 2026 Reg M-B",
  "[Gen 9 Champions] VGC 2026 Reg M-A",
  "[Gen 9] SV VGC Reg I",
];

const POKEPASTE_RE = /^https?:\/\/pokepast\.es\/\w+\/?$/;

/**
 * Flexible team input: Showdown/teambuilder export, or a bare species list
 * ("Charizard, Kingambit, Sylveon, ..."). Pokepaste links are resolved by the
 * caller before reaching here.
 */
function parseFlexible(
  text: string,
): { exportText: string; parsed: ParsedMon[] } | null {
  const input = text.trim();
  if (!input) return null;
  if (!input.includes("\n") && input.includes(",")) {
    const names = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    if (names.length > 0 && names.every((n) => /^[^@,]{1,30}$/.test(n))) {
      return {
        exportText: names.join("\n\n"),
        parsed: names.map((species) => ({ species, moves: [] })),
      };
    }
  }
  return importTeamText(input);
}

/**
 * Champscope-style import panel: cream card, small-caps labels, format
 * dropdown, one big textarea, red action button.
 */
export function ImportPanel({
  label,
  onImport,
  onCancel,
}: {
  label: string;
  onImport: (team: Omit<StoredTeam, "id">) => void;
  /** Renders a cancel button that backs out of the panel. */
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState(FORMATS[0]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    let input = text.trim();
    if (!input) return;
    setError(null);
    if (POKEPASTE_RE.test(input)) {
      setBusy(true);
      try {
        const res = await fetch(`/api/pokepaste?url=${encodeURIComponent(input)}`);
        if (!res.ok) throw new Error();
        input = await res.text();
      } catch {
        setError("Couldn't fetch that paste — check the link.");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    const team = parseFlexible(input);
    if (!team) {
      setError("That doesn't parse as a team export or a species list.");
      return;
    }
    onImport({
      name: name.trim() || label,
      format,
      exportText: team.exportText,
      parsed: team.parsed,
    });
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-[#f6f5ef] p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-stone-800">
        Import — {label}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        Paste a team — a pokepast.es link, a Showdown/teambuilder export, or
        just species names separated by commas.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
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
        <label className="block">
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
      <label className="mt-3 block">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
          Team — pokepaste, export, or species names
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          spellCheck={false}
          placeholder={
            "Charizard @ Charizardite Y\nAbility: Blaze\n- Heat Wave\n...\n\n— or —  Charizard, Basculegion, Kingambit, Sylveon, Rillaboom, Farigiraf"
          }
          className="mt-1 w-full resize-y rounded border border-stone-300 bg-white p-2.5 font-mono text-[11px] leading-relaxed text-stone-700 placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
        />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="rounded bg-[#e5484d] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-85 disabled:opacity-30"
        >
          {busy ? "Fetching…" : "Import"}
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

function evLine(evs: Partial<Record<string, number>> | undefined): string | null {
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
  const [copied, setCopied] = useState(false);
  const isOpen = open && !collapsed;

  // Full set details (EVs, nature, level) come from re-parsing the verbatim
  // export — the parsed view in the schema is deliberately minimal.
  const sets = isOpen ? (Team.import(team.exportText)?.team ?? []) : [];

  const copyExport = async () => {
    await navigator.clipboard.writeText(team.exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
        <span className="flex shrink-0">
          {team.parsed.map((m, i) => (
            <MonIcon key={`${m.species}-${i}`} species={m.species} scale={1} />
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
