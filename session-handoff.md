# Session handoff

> Updated 2026-08-06. The project pivoted: instead of building Phase 2 from
> docs/UI-SPEC.md, the user drove an interactive **matchup simulation builder**
> (reference sketch: `xatu.png` in repo root) built iteratively at `/demo`.
> docs/UI-SPEC.md was never reviewed and is now partially superseded — do not
> build from it without asking.

**Current state:** A working two-page tool, evolved through many rounds of
user feedback (all in the 2026-08-06 session):

- **`/demo` (Page 1)** — pick My Team + Opposing Team: champscope-style import
  panel (pokepast.es link via `/api/pokepaste` proxy, Showdown export, or bare
  species list), or reuse saved/preset teams (localStorage). Champscope-style
  collapsible team detail. Red **Simulate** → `/demo/sim`.
- **`/demo/sim`** — the board: turn columns **Turn 0 (team preview, positions
  only) → Turn 1 → Turn 2 (max)**; one state card per node (roster row +
  Front 2 + Back 2 per side, aligned 64px columns, 560px cards); SVG
  parent→child edges (amber dashed = branch); **⑂ branch = alternate of the
  same turn** (multiple turn-0 roots legal); bring-4 lock from turn 0;
  right-click = faint; per-card collapsible note with save button; front-slot
  picker = moves (Showdown type colors via lazy `@pkmn/dex`, spread/self moves
  skip the target step) + target (on-field four) + switch-out (swap with back)
  + bench; chips stack one per line: attacker icon + move + → target icon.
- **Workflow JSON codec** (`app/demo/workflow-io.ts`): compact v2 format —
  teams as name+species, nodes as `[parentIdx, myState, oppState, note?]`,
  side state as `"front|back|fainted|moves"` digit groups, moves as
  `digit:Name>f1` target suffixes; turn = tree depth. Import: structurally
  broken or **unknown-species payloads are rejected** (icon-sheet-as-dex
  check); rule-breaking states are **sanitized with an amber warnings banner**.
  Legacy verbose form still accepted. Save/resume via localStorage.
- **`/demo/lookup`** — earlier demo of the reader-side flow (paste opposing
  team → matchOpponent → plan → turn toggles). Kept, linked from Page 1.

**Phase 1 lib work is done:** `lib/match/matchOpponent` (IDF-weighted fuzzy,
required-tag multiplier, forme candidates, top-3) and `lib/team/importTeamText`
(lenient, lossless exportText) with real tests. 46 tests green total.

## Known divergences from the original docs (deliberate, user-directed)
- Sim workflow JSON is its own format, NOT the `lib/schema/` guide schema.
  Reconciliation (compile board → plans/rules, or new document type) is an
  open decision the user was told about.
- Unknown Pokémon **block** sim import (dev-phase choice) — CLAUDE.md's
  "warn, never block" rule still governs the guide schema side.
- **Damage calc**: user wants to discuss in future; answer given was
  `@smogon/calc` (local library, no API). Building it requires amending the
  "no battle computation" non-goal in CLAUDE.md/PRODUCT.md first.
- Turn cap (0–2), turn-0 preview semantics, and branching-as-same-turn are
  sim-tool concepts the schema doesn't model yet.

## Next candidates (none committed to)
- Reconcile workflow format with lib/schema, or promote it to a first-class
  document type.
- Compressed share codes (deflate + base64url → ~150–250 chars, URL fragment).
- Mega/Tera as recorded per-mon state (currently note text only).
- Damage calc discussion (see above).
- Hosting phase (Supabase, short links) per original plan.

## Stack additions this session
`@pkmn/img` (minisprite icon sheet + species-existence check), `@pkmn/dex`
(move type colors + targeting shapes, lazy-loaded client-side). Dev server:
port 7317. `xatu.png` (repo root) = the user's reference sketch for the tool.
