"use client";

import { useT } from "../i18n/provider";
import type { FieldState, SideField } from "./calc";

/**
 * Weather, terrain and screens for one card.
 *
 * Opened from a button on the card, and only while the calculator is on —
 * without it there is nothing to change, and the board stays as uncluttered as
 * it was. The conditions are the author's statement about the turn, stored on
 * the node; xatu never infers them from the moves that were declared.
 *
 * Only the conditions that actually move a damage number are offered. Tailwind,
 * Trick Room and Protect belong to a turn too, but they change speed or whether
 * a move lands, not how hard it hits, and this panel exists to serve the
 * calculator. Putting them here would imply xatu models them, which it does not.
 */

const WEATHER = ["Sun", "Rain", "Sand", "Snow"] as const;
const TERRAIN = ["Electric", "Grassy", "Misty", "Psychic"] as const;
const SIDE_FLAGS = [
  ["reflect", "Reflect"],
  ["lightScreen", "Light Screen"],
  ["auroraVeil", "Aurora Veil"],
  ["helpingHand", "Helping Hand"],
  ["friendGuard", "Friend Guard"],
] as const;

function Pill({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
        on
          ? "bg-emerald-600 text-white hover:opacity-85"
          : "border border-stone-300 bg-white text-stone-500 hover:border-stone-500"
      }`}
    >
      {label}
    </button>
  );
}

export function FieldPanel({
  field,
  onChange,
  onClose,
}: {
  field: FieldState | undefined;
  onChange: (next: FieldState) => void;
  onClose: () => void;
}) {
  const t = useT();
  const f = field ?? {};
  const set = (patch: Partial<FieldState>) => onChange({ ...f, ...patch });
  const setSide = (side: "my" | "opp", patch: Partial<SideField>) =>
    onChange({ ...f, [side]: { ...(f[side] ?? {}), ...patch } });

  const sideColumn = (side: "my" | "opp", title: string) => (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
        {title}
      </p>
      <div className="flex flex-wrap gap-1">
        {SIDE_FLAGS.map(([key, label]) => (
          <Pill
            key={key}
            label={t(label)}
            on={!!f[side]?.[key]}
            onClick={() => setSide(side, { [key]: !f[side]?.[key] })}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="grow-in mt-2 rounded-md border border-stone-200 bg-stone-50 p-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400">
          {t("Field this turn")}
        </p>
        <button
          onClick={onClose}
          className="text-[10px] text-stone-400 hover:text-stone-700"
        >
          {t("done")}
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {WEATHER.map((w) => (
          <Pill
            key={w}
            label={t(w)}
            on={f.weather === w}
            onClick={() => set({ weather: f.weather === w ? undefined : w })}
          />
        ))}
        <span className="mx-1 h-3 w-px bg-stone-200" />
        {TERRAIN.map((w) => (
          <Pill
            key={w}
            label={t(w)}
            on={f.terrain === w}
            onClick={() => set({ terrain: f.terrain === w ? undefined : w })}
          />
        ))}
      </div>

      <div className="mt-2 flex gap-4">
        {sideColumn("my", t("My Team"))}
        {sideColumn("opp", t("Opposing Team"))}
      </div>
    </div>
  );
}
