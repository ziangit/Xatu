# Session handoff

> Updated 2026-08-07 (end of session). **Accounts are live and working**
> (user-directed; CLAUDE.md and PRODUCT.md amended). The user's Supabase project
> is created, schema applied, Google OAuth configured, and the user has signed
> in with Google successfully (megazchomp@gmail.com). Resume from "Next
> candidates" below — the user said "we're working on the rest of it tomorrow."

## 2026-08-07 session: what exists now

- **Landing page `/`** — Bricolage Grotesque display type, self-drawing mini
  turn-tree hero (real minisprites + branch arrow), CTAs → builder /
  My matchups / guide lookup. Reduced-motion respected.
- **Saved-matchup library (localStorage)** — multi-slot: `xatu-demo:matchups`
  list + `xatu-demo:active-matchup` pointer; legacy single-slot save migrates
  on first read. Sim SAVE upserts per team pair; Reset keeps the library
  entry; imports open as new unsaved matchups.
- **Auth** — `app/auth/client.ts` (`getSupabase()` returns null when env
  unset → whole app stays local-only), `app/auth/AccountLink.tsx` (in every
  header: landing, /demo, /demo/sim, /matchups, /login), `/login` page
  (Google + email/password, graceful unconfigured state).
  `.env.local` (gitignored) holds the user's project URL + anon key;
  `.env.local.example` is the template.
- **Cloud sync (`app/demo/cloud.ts`)** — `matchups` table rows keyed by the
  SavedMatchup uuid; **payload = the whole SavedMatchup as jsonb** (full
  verbatim exports — lossless; the compact codec stays a paste format;
  schema.sql comment updated to match). Sim SAVE mirrors to cloud when
  signed in ("synced to your account" / amber failure note, local always
  saved). RLS verified live: anonymous insert rejected with 42501.
- **`/matchups` (My Matchups)** — merged list of browser + account saves
  with badges (browser/account), open (pulls cloud-only entries down to
  local first), per-row upload (local→account), delete (removes everywhere,
  with confirm naming the places). Signed-out: local list + sign-in hint.
- **UX fixes from user feedback** — every flow can back out: TeamSlot header
  "← back", ImportPanel cancel button, "replace" reopens the Import/Use
  existing choice (not straight to import) and force-collapses the team card
  (`TeamPanel collapsed` prop) so the choice box is visible; lookup page got
  a "← builder" link; /demo title links home.
- **Not a legality checker**: the user's "Ursaluna shouldn't be here" report
  was their own paste containing Ursaluna — import is faithful by design.
  A per-regulation soft legality warning was floated, not committed to.

## Supabase facts (user's project)

- URL in `.env.local`; tables `teams` + `matchups` with owner-only RLS
  (`for all using/with check auth.uid() = user_id`), created from
  `supabase/schema.sql`. The `teams` table exists but is UNUSED so far —
  team sync is not built, only matchup sync.
- Google provider enabled (client id `5038415161-…apps.googleusercontent.com`);
  email/password enabled with default confirmations; localhost:7317 is in
  the redirect allow list. Service-role key: never used anywhere, by rule.

## Next candidates for 2026-08-08 (none committed to)

- **Team sync** — mirror saved teams (localStorage `xatu-demo:teams`) to the
  `teams` table like matchups; "Use existing" list could then show account
  teams too.
- Rename saved matchups (names are auto "My Team vs Opp Team").
- Auto-pull account matchups on sign-in (currently /matchups fetches on
  view; sim resume is local-first).
- Legality soft-warning per regulation (needs a legal-species list per reg —
  discuss before building; lenient warn-never-block rule applies).
- Compressed share codes; Mega/Tera as recorded state; damage calc
  discussion (prereq: amend no-battle-computation rule); hosting/deploy.

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
