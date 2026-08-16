"use client";

import { useEffect, useRef, useState } from "react";
import type { SpeciesMatch } from "@/lib/species";
import { T } from "../i18n/T";
import { useT } from "../i18n/provider";
import { MonIcon } from "./mon-icon";
import { TYPE_COLORS } from "./type-colors";

/**
 * Six slots, and you type into the slot itself. The second way to build a team,
 * next to pasting an export — click slot 3, type "pika", take Pikachu.
 *
 * **The slot is the input** (user, 2026-08-13). A single box below the row meant
 * the thing you typed and the place it landed were different objects; here every
 * empty slot holds a real `<input>`, so clicking one focuses it, Tab walks the
 * row, and a pick lands where you were looking. Positions are therefore load
 * bearing: `slots` is always length 6 with "" for empty, and the caller drops
 * the blanks — filling slot 4 first must not silently become slot 1.
 *
 * Suggestions are typeset like Showdown's teambuilder — sprite, **Blastoise**
 * with `-Mega` trailing in grey, type badges — but the list stays empty until
 * you type and is capped at six, which is where this deliberately parts company
 * with Showdown's scrollable wall of every Pokémon.
 *
 * The 1,317-row list (name, forme, types) is ~9KB gzipped and is **imported
 * lazily on mount**, so no page pays for it until someone opens the picker.
 * Matching is a linear scan; at this size it is far below a frame, so no index
 * and no debounce.
 *
 * Only names the sprite sheet can draw are offered, which is exactly the test
 * the board's paste import applies — the picker can't produce a team the board
 * would then refuse. Anything more exotic is what pasting is for.
 */

export const SLOTS = 6;

/**
 * How many suggestions a keystroke may show. Showdown lists every Pokémon and
 * lets you scroll; here the list sits inline under the slots, so a bounded few
 * plus "keep typing" beats a wall (user, 2026-08-13).
 */
const SUGGESTIONS = 6;

/** An empty team, and the shape `slots` must always have. */
export const emptySlots = (): string[] =>
  Array.from({ length: SLOTS }, () => "");

type Search = (query: string, limit?: number) => SpeciesMatch[];

export function SpeciesPicker({
  slots,
  onChange,
  autoFocus = false,
}: {
  /** Always length 6; "" is an empty slot. */
  slots: string[];
  onChange: (slots: string[]) => void;
  autoFocus?: boolean;
}) {
  const t = useT();
  const [active, setActive] = useState<number | null>(autoFocus ? 0 : null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [search, setSearch] = useState<{ fn: Search } | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let live = true;
    void import("@/lib/species").then((mod) => {
      if (live) setSearch({ fn: mod.searchSpecies });
    });
    return () => {
      live = false;
    };
  }, []);

  // `autoFocus` on the element itself is gone with the single box — the first
  // slot has to be focused by hand now that six inputs share the row.
  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus();
  }, [autoFocus]);

  // Ask for one past the limit purely to know whether to say "keep typing" —
  // an unbounded list is what makes Showdown's own picker a wall of Pokémon.
  const found =
    search && query.trim()
      ? search.fn(query, SUGGESTIONS + 1).filter((m) => !slots.includes(m.name))
      : [];
  const matches = found.slice(0, SUGGESTIONS);
  const more = found.length > SUGGESTIONS;

  const focusSlot = (i: number) => {
    setActive(i);
    setQuery("");
    setHighlight(0);
    // The input may have just been rendered by this same click.
    requestAnimationFrame(() => inputs.current[i]?.focus());
  };

  const set = (i: number, name: string) => {
    const next = [...slots];
    next[i] = name;
    onChange(next);
    return next;
  };

  const pick = (i: number, name: string) => {
    const next = set(i, name);
    setQuery("");
    setHighlight(0);
    // Land on the next gap, so six picks are six uninterrupted words.
    const gap = next.findIndex((s, j) => !s && j > i);
    const wrapped = gap === -1 ? next.findIndex((s) => !s) : gap;
    if (wrapped === -1) setActive(null);
    else focusSlot(wrapped);
  };

  const clear = (i: number) => {
    set(i, "");
    focusSlot(i);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (matches.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlight((h) => (h + step + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[highlight]) pick(i, matches[highlight].name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
    } else if (e.key === "Backspace" && !query && slots[i]) {
      // The slot you're standing in is the one backspace empties.
      e.preventDefault();
      clear(i);
    } else if (e.key === "ArrowLeft" && !query && i > 0) {
      focusSlot(i - 1);
    } else if (e.key === "ArrowRight" && !query && i < SLOTS - 1) {
      focusSlot(i + 1);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5">
        {slots.map((name, i) => {
          const editing = active === i;
          const filled = Boolean(name) && !editing;
          return (
            <div
              key={i}
              onClick={() => focusSlot(i)}
              className={`relative flex h-[72px] cursor-text flex-col items-center justify-center gap-1 rounded-md border px-1 transition-colors ${
                filled
                  ? "border-stone-200 bg-white shadow-xs"
                  : editing
                    ? "border-stone-400 bg-white shadow-xs ring-2 ring-stone-200"
                    : "border-dashed border-stone-300 bg-white/60 hover:border-stone-400 hover:bg-white"
              }`}
            >
              {/* The number is a corner label, not a line of content: stacked
                  above the input it read as "1 type…". It goes once the slot
                  holds a Pokémon, which names itself. */}
              {!name && (
                <span className="absolute left-1.5 top-1 text-[9px] leading-none text-stone-300">
                  {i + 1}
                </span>
              )}
              {name ? (
                <MonIcon species={name} scale={0.8} />
              ) : (
                // Showdown's grey "?" disc, drawn rather than borrowed: the
                // sheet's fallback tile is not something to depend on.
                <span
                  aria-hidden
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                    editing
                      ? "bg-stone-200 text-stone-400"
                      : "bg-stone-100 text-stone-300"
                  }`}
                >
                  ?
                </span>
              )}
              {filled ? (
                <>
                  <span className="w-full truncate text-center text-[9px] leading-tight text-stone-600">
                    {name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clear(i);
                    }}
                    aria-label={t("remove {name}", { name })}
                    title={t("remove {name}", { name })}
                    className="absolute right-1 top-1 cursor-pointer rounded-full px-1 text-[10px] leading-none text-stone-300 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <input
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  value={editing ? query : ""}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlight(0);
                    if (active !== i) setActive(i);
                  }}
                  onFocus={() => {
                    if (active !== i) {
                      setActive(i);
                      setQuery("");
                    }
                  }}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  spellCheck={false}
                  aria-label={t("slot {n}", { n: i + 1 })}
                  // Only the slot being typed into asks for anything; the "?"
                  // and the corner number already say "empty" in the others.
                  placeholder={editing ? t("type…") : ""}
                  className="w-full bg-transparent text-center text-[10px] leading-tight text-stone-700 placeholder:text-stone-300 focus:outline-none"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* One list under the row rather than under the slot: a sixth of the panel
          is too narrow for "Garchomp-Mega", and the active slot is already lit. */}
      {active !== null && query.trim() && (
        <ul className="fade-in mt-1.5 overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
          {matches.map((m, i) => (
            <li key={m.name}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()} // keep focus in the slot
                onClick={() => pick(active, m.name)}
                className={`flex w-full cursor-pointer items-center gap-2 px-2 py-1 text-left ${
                  i === highlight ? "bg-stone-100" : "hover:bg-stone-50"
                }`}
              >
                <MonIcon species={m.name} scale={0.6} />
                {/* Showdown's typesetting: the species reads first, the forme
                    trails it in smaller grey — "**Blastoise**-Mega". */}
                <span className="min-w-0 truncate text-xs font-medium text-stone-800">
                  {m.base}
                  {m.forme && (
                    <span className="text-[11px] font-normal text-stone-400">
                      -{m.forme}
                    </span>
                  )}
                </span>
                <span className="ml-auto flex shrink-0 gap-1">
                  {m.types.map((type) => (
                    <span
                      key={type}
                      style={{
                        backgroundColor: TYPE_COLORS[type] ?? "#a8a29e",
                      }}
                      className="rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-white"
                    >
                      {type}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-2 py-1.5 text-[11px] text-stone-400">
              {search
                ? t("no Pokémon by that name — paste the export instead")
                : t("loading names…")}
            </li>
          )}
          {more && (
            <li className="border-t border-stone-100 px-2 py-1 text-[10px] text-stone-400">
              {t("more matches — keep typing")}
            </li>
          )}
        </ul>
      )}
      {!query.trim() && (
        <p className="mt-1.5 text-[10px] text-stone-400">
          {/* The example stays English: it is a literal search string against
              an English name list. */}
          <T
            k="click a slot and type — {0} finds Pikachu"
            parts={[<code key="ex">pika</code>]}
          />
        </p>
      )}
    </div>
  );
}
