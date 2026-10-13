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
 * straight onto the cream read as unplaced. The card is `w-fit`: a six-word
 * note in a 672px box reads as an empty input, not as a sentence.
 *
 * Inside, three things are set differently because they *are* different:
 *
 * - **A pasted Showdown set** gets monospace, tight leading and a tinted
 *   block. Set as prose it was a wall of hard-wrapped lines in a 1.6
 *   line-height sans, which is the one thing that made a report look broken.
 *   The lines are drawn verbatim; see `parseReportBlocks`.
 * - **A sprite alone on its line** is an illustration, not a word, so it
 *   leaves the text flow — and when a set follows it, the two sit side by
 *   side. That is how an RMT reads, and it fills the dead space a 96px sprite
 *   otherwise leaves beside it.
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

/** A pasted set, drawn the way every Pokémon site draws one. */
function SetBlock({ lines }: { lines: string[] }) {
  return (
    <div className="w-fit whitespace-pre rounded-md border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-[12px] leading-[1.55] text-stone-600">
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
      out.push(
        <div key={i} className="flex items-center gap-4">
          <MonArt species={block.species} />
          <SetBlock lines={next.lines} />
        </div>,
      );
      i += 1;
    } else if (block.kind === "art") {
      out.push(<MonArt key={i} species={block.species} />);
    } else if (block.kind === "set") {
      out.push(<SetBlock key={i} lines={block.lines} />);
    } else {
      out.push(<Prose key={i} block={block} />);
    }
  }

  return (
    <div
      className={`w-fit max-w-2xl space-y-3 rounded-lg border border-stone-200 bg-white px-5 py-4 text-sm leading-relaxed text-stone-700 ${className}`}
    >
      {out}
    </div>
  );
}
