/**
 * The regulations a team can be tagged with, newest first — `FORMATS[0]` is the
 * default for anything imported without a choice, so the current ladder leads.
 *
 * These strings are **lookup keys, not labels**. They are verbatim Showdown
 * format names; `catalogue.ts` filters `.eq("regulation", …)` on them and
 * `scripts/vgcpastes/ingest.mjs` maps pasted `Format:` ids onto them. So they
 * are never translated, never reworded, and a new one is copied from Showdown
 * rather than typed from memory.
 *
 * Older regulations stay listed after they leave the ladder: teams already
 * saved reference them, and a guide written for one is still a guide.
 *
 * Its own module so it can be unit-tested without pulling in `components.tsx`
 * (React, the picker, the dex) — `components.tsx` re-exports it, so every
 * existing importer is unaffected.
 */
export const FORMATS = [
  "[Gen 9 Champions] VGC 2026 Reg M-C",
  "[Gen 9 Champions] VGC 2026 Reg M-B",
  "[Gen 9 Champions] VGC 2026 Reg M-A",
  "[Gen 9] SV VGC Reg I",
];
