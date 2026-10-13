"use client";

import { Sprites } from "@pkmn/img";
import { parseReportBlocks, type Block } from "../demo/report";

/**
 * A passage of the author's report.
 *
 * Plain text and sprite tokens, nothing else — no markdown, no HTML. This is a
 * public page on a site with no moderation tooling, and rendering
 * author-supplied markup there is an XSS surface with nobody watching it.
 *
 * It renders as **a white card, the same material as a turn card**. The page
 * has exactly two surfaces — white is content, cream is chrome — so prose laid
 * straight onto the cream read as unplaced. The card spans the **full content
 * width**, the same as the matchup below it, so the report reads as one
 * document with one left and right edge rather than as a column of boxes that
 * each stop somewhere different.
 *
 * Inside, three things are set differently because they *are* different:
 *
 * - **A pasted Showdown set** gets monospace and tight leading. Set as prose
 *   it was a wall of hard-wrapped lines in a 1.6 line-height sans, which is
 *   the one thing that made a report look broken. The lines are drawn
 *   verbatim; see `parseReportBlocks`.
 * - **A sprite alone on its line** is an illustration, not a word, so it
 *   leaves the text flow — and a set that follows it stacks directly beneath,
 *   artwork over set, which is how every RMT introduces a Pokémon.
 * - **Everything else** is a paragraph at a reading measure.
 *
 * The sprite is the full gen-5 artwork at its **native 96px**, not the
 * team-preview icon the rest of the app draws with: the icon sheet's tiles are
 * 40×30, so this size would be an upscale of a 40px source, and native size
 * means no resampling at all — which is what keeps pixel art crisp.
 *
 * The card carries no vertical margin of its own; the caller owns the spacing.
 */

function MonArt({ species }: { species: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={Sprites.getPokemon(species, { gen: 5 }).url}
      alt={species}
      title={species}
      width={96}
      height={96}
      loading="lazy"
      className="inline-block shrink-0 align-middle"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

/**
 * A pasted set.
 *
 * Monospace and tight leading, because that is what a set is — but **no tint
 * and no frame**. It already sits inside the report card, and a box inside a
 * box reads as a quotation from somewhere else rather than as the author's own
 * team. Reference RMTs run the set as plain text under the artwork.
 */
function SetBlock({ lines }: { lines: string[] }) {
  return (
    <div className="whitespace-pre font-mono text-[12px] leading-[1.6] text-stone-600">
      {lines.map((line, i) => (
        // The species line is the set's heading — without it the block has no
        // entry point and reads as eight equal lines.
        <div key={i} className={i === 0 ? "font-semibold text-stone-900" : ""}>
          {line}
        </div>
      ))}
    </div>
  );
}

function Prose({ block }: { block: Extract<Block, { kind: "prose" }> }) {
  return (
    <p className="whitespace-pre-wrap">
      {block.segments.map((seg, i) =>
        seg.kind === "mon" ? (
          <MonArt key={i} species={seg.species} />
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </p>
  );
}

export function ReportProse({
  text,
  className = "",
}: {
  text?: string | null;
  className?: string;
}) {
  if (!text?.trim()) return null;
  const blocks = parseReportBlocks(text);

  const out: React.ReactNode[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const next = blocks[i + 1];
    if (block.kind === "art" && next?.kind === "set") {
      // Artwork over the set it introduces, tight together: they are one
      // entry, and the gap the card's own rhythm would put between them
      // reads as two unrelated things.
      out.push(
        <div key={i}>
          <MonArt species={block.species} />
          <SetBlock lines={next.lines} />
        </div>,
      );
      i += 1;
    } else if (block.kind === "art") {
      out.push(
        <div key={i}>
          <MonArt species={block.species} />
        </div>,
      );
    } else if (block.kind === "set") {
      out.push(<SetBlock key={i} lines={block.lines} />);
    } else {
      out.push(<Prose key={i} block={block} />);
    }
  }

  return (
    <div
      className={`space-y-3 rounded-lg border border-stone-200 bg-white px-5 py-4 text-sm leading-relaxed text-stone-700 ${className}`}
    >
      {out}
    </div>
  );
}
