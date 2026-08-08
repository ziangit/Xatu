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
- **No battle computation, ever.** No damage calc, no simulation, no speed tiers, no
  solver, no recommended plays. Numeric claims live in author free text; xatu never
  parses or verifies them. Do not "helpfully" add any of this — see the non-goals in
  docs/PRODUCT.md; they are load-bearing.
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
