"use client";

import { MonIcon } from "../demo/components";
import { parseReportText } from "../demo/report";

/**
 * A paragraph of the author's report.
 *
 * Plain text and sprite tokens, nothing else — no markdown, no HTML. This is a
 * public page on a site with no moderation tooling, and rendering
 * author-supplied markup there is an XSS surface with nobody watching it.
 * Newlines are honoured by `whitespace-pre-wrap`, which is the only formatting
 * a team report actually needs.
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
          <span key={i} className="inline-block align-middle">
            <MonIcon species={seg.species} scale={0.7} />
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </div>
  );
}
