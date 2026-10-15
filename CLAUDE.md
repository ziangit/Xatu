# xatu

A web platform for publishing structured matchup (MU) guides for competitive Pokémon
doubles — the "vs. common archetypes" section of an RMT as data instead of prose.

@AGENTS.md
@docs/PRODUCT.md
@session-handoff.md

## Conventions

- TypeScript throughout; the schema lives in `lib/schema/` with zod runtime validators
  and a `schemaVersion` field. The schema is simultaneously storage format, copy-paste
  sharing format, and the future browser extension's input format — treat changes to it
  as breaking.
- Shared, extension-bound logic (schema, `matchOpponent`, paste parsing) is pure and
  framework-free — no React, no Next.js imports in `lib/`.
- Build in shippable phases (see session-handoff.md). Leave `// Phase N plugs in here`
  markers instead of building later-phase concerns early.
- Test the non-trivial: `matchOpponent` gets real unit tests (vitest). UI does not need
  exhaustive tests in early phases.

## Hard constraints (never violate)

- **No battle computation, except one opt-in calculator** (amended 2026-10-15, at the
  user's request). Still forbidden, and still load-bearing: simulation, speed tiers,
  solvers, recommended plays, and any computation xatu performs on its own initiative.
  What is now allowed is a **damage calculator the author switches on and invokes
  deliberately**, off by default, behind an enable/disable control.
  **Its output is an opaque string attached to the move it describes** — the same
  sentence the author pastes from Showdown's calculator today. It is stored, never
  re-derived on read, and never read back as data by anything: the extension reads
  positions and moves, not calc strings. It lives beside the move rather than in the
  note for one reason — a note cannot know which move it describes, so it cannot tell
  when it has gone stale.
  **A stored calculation is always true for the sets as they are now.** Its inputs are
  fingerprinted; if a set, move or target changes so the fingerprint no longer matches,
  the calculation is dropped rather than shown. xatu never displays a number it cannot
  stand behind, and never verifies or re-computes one that still matches.
  **The toggle changes the interface, never the document.** A guide written with the
  calculator on must read identically with it off. Two versions of the app is the
  decision; two versions of the data is not. Existing saved and published guides are
  untouched and are never recomputed — a published page stays a snapshot, so a later
  change to the maths cannot move numbers under its readers.
  Do not widen this amendment. See the non-goals in docs/PRODUCT.md.
- The predicate vocabulary is a **closed set**. Do not add predicates to chase
  expressiveness; prose fields (`reason`, `gameplan`) absorb everything else.
- Preview-tier vs turn-tier separation: turn-tier conditions may never determine
  `bring`/`lead`. The editor must not offer that combination.
- `ownTeam` stores the verbatim Showdown export string; it must round-trip losslessly.
- **The schema is plumbing, never UI.** Drag-and-drop composition is the primary
  input; JSON exists only as a copy/paste export artifact. No product surface shows
  or edits JSON, schema field names, or predicate vocabulary. See docs/UI-SPEC.md §0.
- Lenient validation: unknown species/moves warn, never block. The author is the
  authority; xatu is not a legality checker.
- Accounts (user-directed change, 2026-08-07): Google + email/password via Supabase
  Auth only — xatu never stores credentials. All user tables get owner-only RLS;
  the service-role key is never used by the app. The anonymous local-first flow
  must keep working with accounts unconfigured (`getSupabase()` returns null).
  No cron jobs, no vercel.json, no LLM integration, no ANTHROPIC_API_KEY.
- Do not commit sprite or audio assets — hotlink Showdown's sprite CDN.

## Where to look

- Technical reference & gotchas: docs/ARCHITECTURE.md (read on demand)
- Original brief: xatu-claude-code-prompt.md (repo root)
