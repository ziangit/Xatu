# Session handoff

> Updated 2026-08-08 (afternoon). **One team vs. many opposing teams is
> built** — see the section directly below. Accounts are live, the site is
> deployed to production, and the Supabase URL-config item below is still the
> user's to do.

## 2026-08-08: one team vs. many teams

The builder now plans **one of your teams against many opponents**, and one
paste can add several opposing teams at once. Rationale and the rules that
follow from it are written up in **docs/ARCHITECTURE.md → "One team vs. many
teams"** — read that before changing any of it. Summary of the mechanism:

- A **group** = every `SavedMatchup` sharing `setup.my.id`. Derived, never
  stored (`groupByMyTeam` in `app/demo/storage.ts`); old and cloud-pulled
  boards group themselves. A group is also the future published guide
  (`ownTeam` + N matchups), so no migration was needed.
- `rememberTeam` now **returns the canonical team** — same export text reuses
  the first id, so grouping is stable across re-imports. Use its return value.
- `nodes: []` = "opponent lined up, not planned yet". `/demo` creates the board
  on add; the sim page seeds a fresh board on open.
- **`/demo`**: My Team (one, replaceable) + **Opposing teams** list — add via
  import (multi), "Use existing", per-row `plan →` / `✕`, status chip
  (`no plan yet` / `N states`). Red button opens the first unplanned opponent.
  "Your other teams" at the bottom switches which of your teams you're
  planning with.
- **Multi-team paste** (`lib/team/import-many.ts`, pure + unit-tested, 11 new
  tests): `=== [format] name ===` delimited exports, one comma-separated
  species list per line, or several pokepast.es links (one per line, fetched
  through the existing proxy). Blank-line blocks are NOT split (that's how one
  team separates its sets). Header format tags are ignored — `FORMATS` stays
  the authority. Fallback name = first two species.
- **`/demo/sim`**: opponent switcher in the header (‹ / dropdown / › and
  "2 of 3 · 1 planned"). Switching auto-saves first, but only if the board
  differs from both the stored copy and a fresh board — comparison via
  `encodeWorkflow` (id-free, so a stable fingerprint). Merely visiting an
  opponent never turns "no plan yet" into a plan.
- **`/matchups`**: rows grouped under a my-team header (sprites, name,
  "N matchups") with a group-level **upload all (N)**; rows show the opponent,
  badges, upload, delete as before.
- Cloud: adding a pairing mirrors it immediately when signed in (before any
  plan exists); removing on `/demo` deletes the account copy too. A failed
  mirror is silent by design — the row stays browser-only on `/matchups`.
- **Motion + polish pass (user feedback: hint text too long, avatar "blink and
  suddenly appears", "add some animation", "no import option at /demo")** —
  (1) the board's instruction paragraph is now "▸ how the board works",
  collapsed by default; (2) the account widget lives in a fixed-width slot and
  `supabaseConfigured()` resolves synchronously, so the bar no longer reflows or
  pops the avatar in (verified: nav width + link positions identical before and
  after the session check); (3) a small motion vocabulary in globals.css
  (`.rise-in` / `.fade-in` / `.pop-in` / `.grow-in` / `.step-1…4`) applied to
  panels, popovers, rows and the board's turn columns, all off under
  reduced-motion — `.fade-in` is opacity-only for measured elements (board
  cards feed the SVG edge layout); (4) `/demo` now shows real **＋ import** /
  **switch team** / **use existing** buttons on both sections instead of a faint
  "replace" link, and the team card's sprites shrank to 0.7 so the team's own
  name actually fits. Table + rules in docs/ARCHITECTURE.md.
- **Board styled after the landing hero (user liked the hero's graph/arrow and
  asked the board to match)** — the SVG edges were already the hero's exact
  geometry (origin dot, bezier, 1.75 stroke, amber dashed branch, triangular
  markers); what was missing: cards now `self-start` so they hug their content
  (which also gives the edges a real curve instead of a flat arrow), a hairline
  + "vs" between the two sides, the alternate label in amber caps with wide
  tracking ("⑂ ALTERNATE TURN 1 · AFTER TURN 0"), and move chips as `rounded-md`
  10px pills. Fixed chip-row height went 19px → 22px (still fixed — the edge
  measurement depends on deterministic heights).
- **Board rules: switch-in, carry-forward, Mega (user feedback: "when tyranitar
  switch in, it should not make a move… the next turn should have the previous
  turn front and back as default… for any mon that have a mega stone, it should
  have a mega as an option (and move as well)")** — new pure module
  `app/demo/board.ts` + 12 unit tests: `switchedInSpecies` (derived from the
  parent card, so no new stored state) and `cascadePositions` (propagates a
  positional edit down the tree, but only into slots that still hold the old
  occupant, so downstream edits survive). `SideState.mega` records the Mega
  Evolved Pokémon — offered only for a holder of its own Mega Stone (dex
  `megaStone` metadata), coexists with a move (picker stays open), renders as the
  Mega forme sprite + ⟡, and carries forward. Codec stays v2 with a 5th
  `mega` group; old payloads still import. Details in docs/ARCHITECTURE.md →
  "Board rules". Verified in-browser: switch → "switched in" chip and a picker
  that refuses moves → next turn shows the switched-in Pokémon → Mega + Rock
  Slide on the same turn → all three persisted correctly on Save.
- **Board save-status row (user feedback: unsaved boards left "a gap between
  the top part and downside teams" because the saved-as line is added later)** —
  the line is now a fixed-height row that always renders: "not saved yet — Save
  keeps this board" → "saved as … · time · synced to your account" → amber sync
  failure. Verified the board's TURN 0 label and first card sit at identical
  y-positions before and after the first save.
- **No native dialogs; compact top bar (user feedback: "why is this window
  popping" + "the top bar is crowded as heck")** — `window.confirm` is gone:
  `InlineConfirm` in `app/ui.tsx` turns the row itself into the question
  (`/matchups` delete, builder opponent ✕). The bar is now `home · builder ·
  matchups │ (avatar)` — plain-noun labels, and the account collapsed into an
  initial-avatar popover holding the email / My matchups / Sign out. Both rules
  are in docs/ARCHITECTURE.md under the navigation section.
- **Entry points (user feedback: "where is the button for New Match Up and add
  more teams for current match up?")** — `/matchups` gained a red **＋ New
  matchup** button and a per-group **＋ add teams**; the board gained **＋ add
  opponent**; `/demo` gained **＋ new matchup with a different team**. They all
  route through `/demo`'s new query-string intents (`?new=1`, `?team=<id>`,
  `?team=<id>&add=1`) — table in docs/ARCHITECTURE.md. Rule of thumb recorded
  there: a list view must be able to *start* work, not only display it.
- **Navigation (user feedback: "no back to home page button, don't let me
  remind you all these stuff")** — shared chrome now lives in `app/nav.tsx`
  (`Wordmark`, `HeaderNav`, `NavLink`). Every page shows a visible `⌂ home`
  plus a hover-underlined wordmark: /demo, /demo/sim, /demo/lookup, /matchups,
  /login. Nav links are nowrap/shrink-0 so a long title can't wrap them.
  **The standing rule is written in docs/ARCHITECTURE.md → "Navigation rule —
  no page is a dead end": use these components in every new page, don't
  hand-roll a header.** The home icon is a drawn SVG house (`⌂` renders as a
  lopsided box — don't go back to it), and the board header is now three
  stacked bands (site nav / title + switcher + board actions / hint) instead of
  one cramped strip.
- Verified in a real browser over CDP (Node's built-in WebSocket, no new deps):
  import team → 3 opponents from one paste → Simulate → switcher → note saved
  → grouped `/matchups`. 57 vitest tests, tsc, and eslint all green.

## Production deployment (added late 2026-08-07)

- **Live at https://xatu-six.vercel.app** — the user created the Vercel
  project ("xatu", team michaels-projects-1009e4b5) via dashboard GitHub
  import; pushes to main auto-deploy. Repo is `vercel link`ed locally
  (`.vercel/` is gitignored; CLI logged in as ziangit).
- Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY`) added to
  Vercel Production + Preview via CLI and verified live — /login shows the
  real form in production. Reminder: `.env.local` is gitignored, so any new
  env var must also be added to Vercel or prod silently runs local-only
  (that's exactly what happened; anon key in client bundles is by design).
- **Vercel Analytics enabled** — `@vercel/analytics` + `<Analytics />` in
  app/layout.tsx (commit 79bab26); deployment serves /_vercel/insights/
  script.js (the tag is injected at runtime, so don't grep the HTML for it).
- **OPEN ITEM (user's dashboard, not done yet as of exit)**: Supabase →
  Authentication → URL Configuration — set Site URL to
  https://xatu-six.vercel.app and add it (or `/**`) to the Redirect URLs
  allow list, keeping localhost:7317. Until then, Google sign-in FROM
  PRODUCTION completes but redirects back to localhost. Email/password on
  production is unaffected. Verify Google login on prod after this.

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

## Next candidates (none committed to)

- **Team sync** — mirror saved teams (localStorage `xatu-demo:teams`) to the
  `teams` table like matchups; "Use existing" would then show account teams
  too. This is the natural follow-on now that opponents are a library: it was
  explicitly held back from the one-vs-many pass.
- Rename saved matchups / teams (names are auto "My Team vs Opp Team", and a
  single import with no name typed still gets the slot label "My Team").
- Reader view over a whole group — the group is exactly the "vs. archetypes"
  section of an RMT, so it is the obvious input for the Phase 3 reader.
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

- **`/demo` (Page 1)** — *(single-pair flow, superseded 2026-08-08 by one team
  vs. many — see the top section; the import/reuse mechanics below still hold)*
  pick My Team + Opposing Team: champscope-style import
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
