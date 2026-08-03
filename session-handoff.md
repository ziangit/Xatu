# Session handoff

**Current phase:** Phase 1 — Schema + paste round-trip. Schema is implemented and the
acceptance gate (hand-encoding yoshimap sections ② and ⑥) passes. Remaining Phase 1
work: `matchOpponent` with tests, and the own-team import module (`Team.import` from
@pkmn/sets, lossless export-string retention, lenient unknown-species warnings).

**Next concrete step:** User is reviewing the revised schema + the two encoded
matchups (presented 2026-08-03). Once confirmed: implement `lib/team/` (Showdown
import) and `lib/match/` (matchOpponent + IDF weighting + vitest tests) to finish
Phase 1.

## Phase plan (build in order, ship each; Phase 3 is the finished product)

1. **Schema + paste round-trip** ← current (schema done, matching + team import left)
2. **Editor** — drag-and-drop matchup + rule editors, local state only. Must catch
   the tier mistake: a lead set under a turn-tier condition → offer conversion to a
   species-presence plan guard (see ARCHITECTURE.md).
3. **Reader view + hosting** — Supabase, short links, edit tokens, OG cards, clickable
   walkthrough (plain progressive disclosure; quiz mode was dropped entirely).

Leave `// Phase N plugs in here` markers. Don't build phase 3 concerns into phase 1.

## Done so far
- Scaffolded Next.js 16 (App Router, TS, Tailwind 4); zod 4, @pkmn/sets 5, vitest.
  Harness docs in place. Remote: https://github.com/ziangit/Xatu (pushed).
- `lib/schema/` implemented per the 2026-08-03 schema revisions: rules inside Plan;
  actions keyed by species (0–2, omission = unspecified, no sentinel); lead + back
  with `bringOf()` derived; `hasSpecies` plan guards with specificity-ordered
  `selectPlan()` (≤1 unguarded plan per matchup, zero legal); GuideDraft vs Guide
  with `validateDraft()` at the publish/export boundary; `importGuideText()` branches
  on `schemaVersion` from v1; advisory `guideWarnings()` (lenient, display-only).
- Acceptance-gate fixture `lib/schema/fixtures/yoshimap-sand-staraptor.ts`: sections
  ② and ⑥ encoded; ②'s "lead under a turn-tier condition" trap encoded as a preview
  guard. 24 tests green (`npm test`), typecheck clean.
- Quiz mode (old Phase 4) dropped from all docs.

## Open questions
- One friction point found while encoding ②: "if Kingambit ever switches in → Haze"
  is turn-agnostic, but Rule.turn is required. Currently absorbed into the reason
  prose of the turn-1 rule (per the prose-absorbs-everything principle). If it recurs
  across more guides, consider making `turn` optional ("any turn") — user decision,
  not taken unilaterally.
