# Session handoff

**Current phase:** Between Phase 1 and Phase 2. Schema is implemented and gated
(yoshimap ② and ⑥ encode cleanly; 24 tests green). The Phase 2 UI direction has been
reframed: the board is the primary input, JSON is an export artifact only, the schema
never appears in any product surface (see docs/UI-SPEC.md §0 — this is a hard
constraint, also in CLAUDE.md).

**Next concrete step:** User is reviewing docs/UI-SPEC.md (Matchup Designer, guide
shell, reader view — written 2026-08-03). **No UI code until they react to it.**
After approval, remaining work in order: finish Phase 1 (`lib/match/` matchOpponent +
tests; `lib/team/` Showdown import via `Team.import`), then build Phase 2 per the
spec.

## Phase plan (build in order, ship each; Phase 3 is the finished product)

1. **Schema + paste round-trip** — schema done; matchOpponent + team import remain
2. **Editor** — the Matchup Designer per docs/UI-SPEC.md: battle-scene direct
   manipulation, three verbs (drag to posts / drag enemies as conditions / click
   moves + drag switches), spotlight for alternate plans, tier guard-rail offering
   the preview-guard conversion in author language
3. **Reader view + hosting** — article register per docs/UI-SPEC.md §4; Supabase,
   short links, edit tokens, OG cards

## Done so far
- Next.js 16 scaffold, harness docs, remote https://github.com/ziangit/Xatu.
- `lib/schema/` complete per the 2026-08-03 revisions (rules inside Plan,
  species-keyed actions, lead+back, specificity-ordered guards, draft/published
  split, schemaVersion-branching import, advisory warnings). Acceptance fixture:
  `lib/schema/fixtures/yoshimap-sand-staraptor.ts`. 24 tests, typecheck, lint green.
- **/playground built, then deliberately deleted** — it made JSON the primary surface
  and anchored the wrong metaphor. Do not rebuild it; its coverage lives in vitest.
- docs/UI-SPEC.md written (workbench + article registers, full surface-by-surface
  spec, §5 typing inventory, §6 open questions). frontend-design skill was read
  first; dark-dashboard aesthetic rejected per user.
- Dev server port pinned to 7317 in package.json.

## Open questions (awaiting user's spec review — see docs/UI-SPEC.md §6)
- Per-species notes vs. "only gameplan and why are typed"
- T2+ pad occupants as unrecorded stage direction (second gesture) — acceptable?
- "Switches in" vs. "already out" toggle on T2+ enemy placements
- Scene furniture replacing the brief's "small dropdown" for extra predicates
- Turn-agnostic branches still pin to a turn (schema limitation, carried forward)
