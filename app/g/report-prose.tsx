"use client";

import { Sprites } from "@pkmn/img";
import { parseReportText } from "../demo/report";

/**
 * A paragraph of the author's report.
 *
 * Plain text and sprite tokens, nothing else — no markdown, no HTML. This is a
 * public page on a site with no moderation tooling, and rendering
 * author-supplied markup there is an XSS surface with nobody watching it.
 * Newlines are honoured by `whitespace-pre-wrap`, which is the only formatting
 * a team report actually needs.
 *
 * The sprite is the **full gen-5 artwork at its native 96px**, not the
 * team-preview icon the rest of the app draws with. Two reasons: the icon
 * sheet's tiles are 40×30, so anything this size would be an upscale of a
 * 40px source, and a report uses a sprite as an illustration — captioning a
 * set, heading a section — rather than as a chip in a list. Native size means
 * no resampling at all, which is what keeps pixel art crisp.
 */
export function ReportProse({
  text,
  className = "",
}: {
  text?: string | null;
  className?: string;
}) {
  if (!text?.trim()) return null;
  return (
    <div
      className={`mb-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-stone-700 ${className}`}
    >
      {parseReportText(text).map((seg, i) =>
        seg.kind === "mon" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={Sprites.getPokemon(seg.species, { gen: 5 }).url}
            alt={seg.species}
            title={seg.species}
            width={96}
            height={96}
            loading="lazy"
            className="inline-block align-middle"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </div>
  );
}
