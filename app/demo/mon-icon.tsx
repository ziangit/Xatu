"use client";

import type { CSSProperties } from "react";
import { Icons } from "@pkmn/img";

/**
 * Showdown team-preview pixel icon, from the hotlinked icon sheet.
 *
 * Its own module so both `components.tsx` and the species picker can use it
 * without importing each other — `components.tsx` re-exports it, so every
 * existing importer is unaffected.
 */
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
