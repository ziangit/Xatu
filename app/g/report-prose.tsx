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
 * It renders **straight onto the page, with no card** (user-directed,
 * 2026-10-15, by reference to teamsheet.gg's report layout — which reverses
 * the white card this had since 1284208). The card was arguing that white is
 * content and cream is chrome; what actually placed the text was never the
 * box but the heading above it and a column it keeps to. An article does not
 * put its paragraphs in a panel, and a report is an article.
 *
 * Inside, three things are set differently because they *are* different:
 *
 * - **A pasted Showdown set** gets monospace, tight leading and a white card
 *   of its own. Set as prose it was a wall of hard-wrapped lines in a 1.6
 *   line-height sans, which is the one thing that made a report look broken.
 *   The lines are drawn verbatim; see `parseReportBlocks`.
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
 * It carries no vertical margin of its own; the caller owns the spacing.
 */

/** The frame a set entry sits in. `w-fit` so it hugs its own lines. */
const CARD = "w-fit rounded-lg border border-stone-200 bg-white px-4 py-3";

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
 * Monospace and tight leading, because that is what a set is — and, since the
 * prose around it stopped being a card, **a card**. The two decisions are the
 * same one seen from either side: exactly one thing on this page should look
 * like an object, and it is the set, not the paragraph. It hugs its own lines
 * rather than stretching to the measure — a set is about 30 characters wide
 * and a panel four times that reads as a mistake.
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
        <div key={i} className={CARD}>
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
      out.push(
        <div key={i} className={CARD}>
          <SetBlock lines={block.lines} />
        </div>,
      );
    } else {
      out.push(<Prose key={i} block={block} />);
    }
  }

  return (
    <div
      className={`space-y-4 text-base leading-[1.7] text-stone-700 ${className}`}
    >
      {out}
    </div>
  );
}
