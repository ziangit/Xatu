"use client";

import { useState } from "react";
import { searchSpecies } from "@/lib/species";
import { MonIcon } from "../../../demo/components";
import { useT } from "../../../i18n/provider";

/**
 * Insert a `:Species:` token without having to spell it.
 *
 * It appends to the end of the slot rather than at the caret: the caret
 * position is lost the moment this button takes focus, and tracking it would
 * mean owning the textarea's selection state for a convenience. Typing the
 * token by hand works everywhere, so this is a shortcut, not the mechanism.
 */
export function SpeciesToken({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matches = query.trim() ? searchSpecies(query, 6) : [];

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-600 transition-colors hover:border-stone-500 hover:text-stone-900"
      >
        {t("+ Pokémon sprite")}
      </button>
    );

  return (
    <div className="rounded border border-stone-200 bg-white p-2">
      <div className="flex items-center gap-2">
        <input
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Pokémon name…")}
          spellCheck={false}
          className="min-w-0 flex-1 rounded border border-stone-200 px-2 py-1 text-xs text-stone-800 placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
        />
        <button
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          className="shrink-0 text-[11px] text-stone-400 hover:text-stone-700"
        >
          {t("cancel")}
        </button>
      </div>
      {matches.map((m) => (
        <button
          key={m.name}
          onClick={() => {
            onInsert(` :${m.name}: `);
            setOpen(false);
            setQuery("");
          }}
          className="mt-1 flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-stone-50"
        >
          <MonIcon species={m.name} scale={0.5} />
          <span className="text-xs text-stone-700">{m.name}</span>
        </button>
      ))}
    </div>
  );
}
