"use client";

import type { ReactNode } from "react";
import { useT } from "../i18n/provider";

/**
 * One side of a turn card: title, roster, Front, the chip column, Back — and
 * the geometry that makes those line up.
 *
 * It exists because there are two renderers of this card and they drifted.
 * The editor has always put both front tiles on one row and then one chip
 * line per slot beneath them; the published reader paired each chip with its
 * own tile inside a wrapping flex, so as soon as a chip was wider than its
 * 64px cell — which "Fake Out →" and "Kowtow Cleave →" both are — the pair
 * wrapped onto two rows and the public page stopped looking like the board
 * its author built. Nobody chose that layout. It fell out of `flex-wrap`,
 * silently, which is exactly what docs/ARCHITECTURE.md warns a second
 * renderer will do. `layoutRows` and `turn-edges` were extracted after the
 * same thing happened to branches and to arrows.
 *
 * What stays with the caller is everything *inside* a band. The editor's
 * slots are buttons that open a move picker and its chips carry titles,
 * Mega marks and a calculator; the reader's have no handler at all, which is
 * what makes read-only structural there rather than a flag somebody has to
 * remember. That difference is real and this component does not touch it.
 *
 * What cannot be the caller's is the arrangement — and the **fixed 22px chip
 * line**, which is not cosmetic: `useTurnEdges` measures laid-out cards to
 * draw the arrows between them, so a card whose height depends on how long a
 * move's name is moves every edge that touches it.
 */
export function SideFrame({
  className,
  title,
  roster,
  front,
  back,
  slot,
  chip,
  under,
}: {
  /** The outer box: the editor sizes it itself, the reader shares a row. */
  className?: string;
  title: string;
  /** The roster row's icons. The reader draws them smaller — a 520px card
   *  holds two sides, so scale 1 would not fit — and that is a density
   *  choice, not a structural one. */
  roster: ReactNode;
  front: string[];
  back: string[];
  /** One 46x34 tile; `species` is undefined for an empty slot. */
  slot: (
    species: string | undefined,
    row: "front" | "back",
    i: number,
  ) => ReactNode;
  /** The chip for front slot `i`, drawn inside a 22px line. `null` for a turn
   *  that declares no moves — turn 0 is positions only. */
  chip: ((species: string, i: number) => ReactNode) | null;
  /** Whatever belongs under that chip: a stored calculation, or the hint
   *  saying why there isn't one. Outside the 22px line on purpose — it is a
   *  full sentence and it may wrap. */
  under?: (species: string, i: number) => ReactNode;
}) {
  const t = useT();
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
        {title}
      </p>
      <div className="mt-1 flex">{roster}</div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="w-9 text-[10px] text-stone-400">
          {t("slot|Front")}
        </span>
        {[0, 1].map((i) => (
          <div key={i} className="flex w-[64px] justify-center">
            {slot(front[i], "front", i)}
          </div>
        ))}
      </div>

      {/* One line per front slot, top line = left Pokémon. `ml-[42px]` is the
          Front label plus its gap, so a chip starts under the tile it
          describes. An empty slot still spends its 22px: one slot filled and
          one empty must not make the card shorter. */}
      {chip && front.length > 0 && (
        <div className="ml-[42px] mt-1 space-y-1">
          {[0, 1].map((i) => {
            const s = front[i];
            if (!s) return <div key={i} className="h-[22px]" />;
            return (
              <div key={s}>
                <div className="flex h-[22px] items-center">{chip(s, i)}</div>
                {under?.(s, i)}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-1 flex items-center gap-1.5">
        <span className="w-9 text-[10px] text-stone-400">{t("slot|Back")}</span>
        {[0, 1].map((i) => (
          <div key={i} className="flex w-[64px] justify-center">
            {slot(back[i], "back", i)}
          </div>
        ))}
      </div>
    </div>
  );
}
