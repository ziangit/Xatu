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
 * It renders as **a white card** holding the whole passage — text, artwork
 * and set alike. The page has exactly two surfaces, white for content and
 * cream for chrome, and prose laid straight onto the cream read as unplaced
 * among the white boards it sits between.
 *
 * That was tried both ways on 2026-10-15 and this is the user's call, so do
 * not take the card off again: the measure and the headings were the parts
 * worth changing, and they stayed.
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
 * - **Everything else** is a paragraph at a reading measure — capped at
 *   48rem — about 96 characters at 16px, which is the measure the reference
 *   article runs. That is wider than the 45-to-75 the typography books give,
 *   and it is the width that was asked for; 36rem measured right and read as
 *   though something had cut the lines short.
 *
 *   The cap is in rem rather than `ch` on purpose: `ch` measures the "0"
 *   glyph, which in Geist is 0.66em, so a 68ch cap came out at 90 characters
 *   rather than the 68 it promises.
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
 * and no frame**: it already sits inside the passage's card, and a box inside
 * a box reads as a quotation from somewhere else rather than as the author's
 * own team. It still hugs its own lines rather than stretching to the
 * measure, so it cannot read as a 96-character-wide block of code.
 */
function SetBlock({ lines }: { lines: string[] }) {
  return (
    <div className="w-fit whitespace-pre font-mono text-[13px] leading-[1.6] text-stone-600">
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
    // The paragraph is capped, the card is not. A line of 150 characters —
    // which is what the full 1,062px card gave at 14px — is about twice what
    // an eye can track back to the next line, and that single number is most
    // of what made a report look wrong. Capping the *card* instead would have
    // broken its alignment with the matchup below it, which is load-bearing.
    <p className="max-w-3xl whitespace-pre-wrap">
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
      // Artwork on its own is an illustration, not an entry — no frame.
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
      className={`space-y-4 rounded-lg border border-stone-200 bg-white px-5 py-4 text-base leading-[1.7] text-stone-700 ${className}`}
    >
      {out}
    </div>
  );
}
