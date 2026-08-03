# Session handoff

**Current phase:** Phase 1 — Schema + paste round-trip. Types, zod validator,
`matchOpponent` with tests, import own team from a Showdown export string,
export/import a full guide as JSON text. No hosting, no persistence, no UI beyond
what's needed to exercise the round-trip.

**Next concrete step:** User is reviewing the proposed schema and phase plan
(presented 2026-08-03). Once approved: implement `lib/schema/` (types + zod), then
`lib/team/` (@pkmn/sets import — verify the installed API first), then `lib/match/`
(matchOpponent + vitest tests). Then hand-encode two real matchups from
<https://note.com/n411fe0271c75> (full link in the brief) to verify
the model survives real content **before building any UI on it**.

## Phase plan (build in order, ship each)

1. **Schema + paste round-trip** ← current
2. **Editor** — drag-and-drop matchup + rule editors, local state only
3. **Reader view + hosting** — Supabase, short links, edit tokens, OG cards,
   clickable walkthrough
4. **Quiz mode** — walkthrough with answers hidden + scoring

Leave `// Phase N plugs in here` markers. Don't build phase 3 concerns into phase 1.

## Done so far
- Scaffolded Next.js 16 (App Router, TS, Tailwind 4) via create-next-app; git repo
  initialized by the scaffold.
- Installed zod 4, @pkmn/sets 5, vitest.
- Harness docs written: CLAUDE.md, docs/PRODUCT.md, docs/ARCHITECTURE.md, this file.
- Original brief preserved at repo root: xatu-claude-code-prompt.md.
- No application code yet — schema shown to user for approval first, per the brief.

## Open questions
- None blocking. The user's `nextjs-supabase-vercel-bootstrap` skill was not present
  on this machine; bootstrap was done manually + via the project-harness skill.
