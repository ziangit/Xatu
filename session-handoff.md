# Session handoff

> Updated 2026-08-13: a **species type-ahead** (type "pika", get Pikachu with a
> sprite) so a team can be built without a paste, a read-only **"does this look
> like a known team?"** lookup over the 712-team catalogue once four species are
> named, and the **sample teams** are now the user's own eight. Sections below,
> newest first.
>
> Updated 2026-08-12. That session: the **VGCPastes catalogue** (712 Champions
> M-B teams, ingested *and live in Supabase*), **roster identity/partial-match
> groundwork**, one copy/paste format for
> one-vs-one *and* one-vs-many, a real `← back` on every page, and `/matchups`
> no longer flashing a partial list. Sections below, newest first.
>
> Still true from before: one team vs. many opposing teams is built (2026-08-08),
> accounts are live, and the site is deployed to production. **The Supabase
> URL-config item is DONE** (user, 2026-08-13) — ignore the older section that
> still calls it open.

## 2026-08-13: "does this look like a known team?" — partial match, built

User: *"if user enters >= 4 pokemons, we provide the match function… the match
should only show when user click it."* Built on the groundwork from 2026-08-12;
the decided design in docs/ARCHITECTURE.md → "Partial match over the catalogue"
was implemented unchanged, and that section is now marked BUILT with the
measurements. Answer to the open question there (user's call): **read-only** —
clicking a result changes nothing about the team being typed.

- `lib/match/catalogue.ts` — `rankCatalogueMatches(observed, rows, {min, limit})`,
  pure, 10 new tests. Groups by `roster_code` so one popular archetype can't
  crowd the list (712 teams are 567 rosters; the top one is copied 30×), ranks by
  shared count then paste count, and marks which of the six were named.
- `app/demo/catalogue.ts` — the query. **`contains` when the number named equals
  the threshold** (four named ⇒ "contains all four" is exact, and measured live
  at 13 rows / 5.4KB against 481 rows / ~30KB gzipped for overlap); `overlaps`
  above that. Lean column list — no `export_text`, which would make it megabytes.
- `app/demo/catalogue-lookup.tsx` — the panel: score badge, six sprites with the
  named ones in colour and the rest greyed, team name, `×N` pastes, a link to the
  paste, and a line saying it changes nothing. Scrolls inside a fixed height.
- Degrades to nothing when Supabase is unconfigured, like every other cloud read.
  Still no battle computation: set arithmetic on species names, ranked not asserted.
- Verified end to end against the **live** database in a browser: no request at
  three species, none at four until clicked, then exactly one GET using `cs.`;
  six named switches to `ov.` and ranks `6/6, 5/6×4, 5/6×2, …, 4/6×9`; the typed
  team is byte-identical after looking; closing re-offers without refetching.
  120 tests.

## 2026-08-13: species type-ahead — a team without a paste

User: "can you support type ahead? which when user types 'pika' it will show
pikachu and pokemon sprite. Is it costly? I want user able to enter pokemon
besides just import". Built; the cost is **~6.3KB gzipped, loaded only when the
picker opens** (~9KB once type badges were added). Rules in
docs/ARCHITECTURE.md → "Species type-ahead".

- `lib/species/` — `names.ts` is **generated** by `scripts/gen-species.mjs`
  (1,317 species; `--check` fails if stale), `search.ts` is pure and ranked
  (exact → prefix → forme word → substring; base forme first), 14 new tests.
  Reading `@pkmn/dex` at runtime was the alternative: 1.8MB / 346KB gzipped.
- The list is *every species the icon sheet can draw* — the same test the board's
  paste import already applies, so the picker can't offer a name the board would
  reject. Not a legality list.
- `app/demo/species-picker.tsx` — six slots with Showdown-style suggestion rows,
  ↑/↓/Enter/Escape. `MonIcon` moved to its own
  `app/demo/mon-icon.tsx` (re-exported from `components.tsx`, so no importer
  changed) to keep the picker and the panel from importing each other.
- `ImportPanel` now has **paste / type names** modes. Both end in the same
  `importTeams` call — a typed team is stored as the comma-separated species
  list that path already understood, so nothing downstream knows the difference.
- **`matchKey` now collapses `-Mega-Z` too** (Absol, Garchomp, Lucario exist with
  "-ite Z" stones). No catalogue row names one, so stored roster codes are
  unchanged — but the picker can now offer them, which is how it surfaced.
- **Follow-up pass, same day (user feedback on the first cut):**
  - *"remove the pikachu variant just keep the origin pikachu"* — the list now
    drops everything the dex calls `cosmeticFormes` **plus** Pikachu's fifteen
    costumes, which are `otherFormes` and so needed one hand-written exclusion.
    1,368 → 1,317 names (~6.3KB gzipped); "pika" returns exactly one row.
    Do NOT generalise this by comparing base stats — Maushold-Four,
    Squawkabilly-Blue and Vivillon-Fancy are stat-identical to their bases and
    appear in real teams. Catalogue coverage re-checked: 186/186, no misses.
  - *"make the pokemons 6 slots instead of 0/6"*, then *"select slot can enter
    the pokemon name"* — six slots always render, and **the slot is the input**:
    each empty slot holds its own `<input>`, clicking one focuses it, Tab walks
    the row, Enter advances to the next gap, ✕ or backspace empties a slot.
    Positions are load bearing — `slots` is length 6 with `""` blanks and only
    `ImportPanel` drops them, so filling slot 4 first stays slot 4.
  - *"change import teams to 'New Team'"* — that button plus its three siblings
    (`＋ import` ×2, `Import a team`) now read **New team** / **＋ new team**,
    since the panel behind them also builds a team by typing.
  - *"can you make it pokemon showdown style? Just don't show all pokemon when
    not entering, and the max type ahead give it a limit"* — suggestion rows are
    now sprite + **bold base**/grey forme + coloured type badges, which meant
    putting types in the generated data (`base|forme|types`, ~6.3KB → ~9KB
    gzipped). The two things NOT copied from Showdown are the ones the user
    named: nothing is listed until you type, and the list is capped at six with
    "more matches — keep typing". `TYPE_COLORS` moved to `app/demo/type-colors.ts`
    (re-exported from `components.tsx`) to avoid a picker↔components cycle.
  - *"improve the ui, it is currently ugly when there is '1 type …' and the slot
    same color as background"* — the slot number became a corner label (it was
    stacking above the input), empty slots got a drawn grey "?" disc and a
    `bg-white/60` fill so they read against the cream panel, and the active slot
    gets a ring. Three visually distinct states: empty / active / filled.
  - Fell out of the slot work: there is **no disabled state anywhere in the
    picker**. Focus can't land on a disabled element, so freeing a slot left the
    box dead and the next keystroke went to the body — caught in the browser,
    not in review. Same reason the single bottom box is gone entirely.
- Verified over CDP by clicking and typing: six slots each with their own input,
  slot 1 focused on open, clicking slot 3 puts the letters *in slot 3*, "pika"
  offers Pikachu alone, Enter fills that slot and moves to slot 4, ↓+Enter takes
  the second match, backspace empties the slot you're in, ✕ clears just that one,
  and submitting drops the blanks while keeping slot order. Console clean.
  109 tests.

## 2026-08-13: the sample teams are the user's eight

The user supplied eight pokepast.es links and asked them to replace the existing
samples. `SAMPLE_TEAMS` in `app/demo/demo-data.ts` is now those eight, fetched
verbatim from `pokepast.es/<id>/json` and pasted in whole — EVs, natures, items,
the lot — because `exportText` must round-trip losslessly and a sample has to
behave exactly like a team the user pasted in themselves (verified: all eight
re-export byte-identical through `importTeamText`).

- All eight are Champions Reg M-B, six Pokémon each, 29 distinct species.
- `label` is ours (a short archetype tag that fits a picker row — "Mega
  Tyranitar sand"); the paste's real title and URL sit in a comment above each
  entry so provenance survives. Regenerate with the snippet in
  docs/ARCHITECTURE.md rather than hand-editing the export blocks.
- **`PRESETS` in `app/demo/page.tsx` is now exactly `SAMPLE_TEAMS`** — the
  yoshimap fixture team is no longer offered as a preset (one of the eight is a
  sand + Mega Staraptor team anyway). The fixture itself is untouched and still
  backs `demoGuide`, `/demo/lookup`, and the schema tests.
- `/demo/lookup`'s "or try" row shows the **first three**, not all eight: it is a
  shortcut into the flow, not a catalogue. The first sample scores 100% against
  `mu-aero-zard`; the second is the guide's own team and matches nothing, which
  the page already handles ("no matchup in this guide fits").
- Verified in a real browser: eight offered, each with six sprites resolving to
  its own icon-sheet tile (no silent fallback icons), old samples gone, picking
  one fills the My Team card, console clean.

## 2026-08-13: Google sign-in consent screen (no code change)

The user asked why Google says "to continue to twvwwxhbqsjplduujfcz.supabase.co".
That is the OAuth callback host, and Google will only show an app name for a
domain whose ownership can be proven — `supabase.co` isn't ours. The Google
Cloud side is fully configured (app name `xatu`, **In production**, External,
scopes `openid`/`email`/`profile`, all non-sensitive so the 100-user cap never
applies). Nothing to fix; the only route to a friendly name is a domain of our
own plus Supabase's paid custom-domain add-on. Don't "fix" this in code.

## 2026-08-12: roster identity + partial-match groundwork

The user asked for team encoding ahead of a future "4+ matching" feature. Built
`lib/match/roster.ts` (13 new tests) with the correction that mattered: **a
single team code answers identity, never "4 of 6"** — two sets differing by one
element hash to unrelated strings. So the code is the prerequisite and the
`match_species` array + GIN index is the mechanism. Full reasoning in
docs/ARCHITECTURE.md → "Roster identity vs. partial match".

- `rosterCode` / `matchSpecies` / `matchKey` / `sharedSpecies`, plus
  `looseKey` + `formeCandidates` moved here (re-exported from `matchOpponent`,
  so existing importers are unaffected). Module is deliberately
  **self-contained** — no relative imports — so the ingest script runs it
  through Node and the DB can't disagree with the app.
- Normalisation was decided from the corpus: 34 rows name a Mega in their paste
  but preview shows the base forme, so `-mega`/`-mega-x/y` collapse; everything
  else stays distinct because the same corpus has `Floette-Eternal` *and*
  `Floette-Mega`. Sorting matters too — 108 teams differ from another only in
  paste order (571 → 567 distinct rosters once Megas merge).
- `community_teams` gained `match_species text[]` + `roster_code text` with a
  GIN and a btree index; seed regenerated from the paste cache with **no
  refetching**. Verified in PGlite: all 712 rows sorted and consistent, no
  `-mega` leaked into `match_species`, and the real 4+ query runs in **3ms** —
  histogram for the most-copied roster: 30 at 6/6, 9 at 5/6, 46 at 4/6, 91 at
  3/6.
- **Subset table deliberately not built** (C(6,4)=15 codes/team, 10,680 rows).
  Nothing to optimise at 712 rows, and the codes make it a pure derivation.
- **The search itself is not built, by the user's direction** ("we will implement
  matching logic in future… write the matching part in doc"). The decided design
  — the exact SQL, rank-don't-cut-off, regulation filter, threshold belongs to
  the caller, ranking lives in `lib/`, degrade when Supabase is unconfigured, no
  battle computation — is written up in docs/ARCHITECTURE.md → "Partial match
  over the catalogue — planned, NOT built". Implement from there; don't
  re-decide it. Confirmed with the user: `Garchomp-Mega` matching `garchomp` is
  the intended behaviour and is what ships.
- Two fixes fell out: `matchOpponent` now normalises **both** sides (a matchup
  stored as "Garchomp-Mega" could never match an observed "Garchomp"), and
  `rememberTeam` identifies teams by `rosterCode` instead of paste order (the
  same team imported twice used to split its group).
- 93 vitest tests. Re-verified the group copy/paste round-trip and the `/demo`
  dedupe in a browser after the identity change.

## 2026-08-12: VGCPastes catalogue ingested (712 Champions M-B teams)

New `scripts/vgcpastes/ingest.mjs` + `supabase/community-teams.sql`. Full
rationale in docs/ARCHITECTURE.md → "Community team catalogue". Status:

- **Ingest has already run**: 712 teams fetched, 0 failures, 0 unparseable, all
  six Pokémon. Output sits in `scripts/vgcpastes/data/` (gitignored):
  `community-teams.ndjson` (1.1MB) + `seed-community-teams.sql` (1.2MB) +
  a per-paste cache, so a re-run is nearly free.
- 707 rows are M-B, **5 are M-A** — the paste's own `Format:` string wins over
  the tab it was listed on. 184 are `featured` with an archetype `category`.
- **DONE — applied to the live project** (the user put
  `SUPABASE_CONNECT_STRING` in `.env.local`, which both tools read): the table and
  all 712 rows are in. `supabase db push --dry-run` says "up to date"; the count
  check is `node scripts/vgcpastes/seed.mjs --check` → 712 teams / 567 rosters /
  184 featured / 2 regulations.
- **How it went wrong, so nobody repeats it:** the seed was originally a second
  migration, and `supabase db push` **could not apply it** — one ~1.3MB statement
  with a dollar-quoted payload. It errored while recording nothing in
  `supabase_migrations.schema_migrations`, even though the DDL migration had
  already taken effect, so the retry failed with "relation already exists". Fixed
  by: applying the seed as a single query over a normal connection (new
  `scripts/vgcpastes/seed.mjs`, `pg` devDependency, ~1.3s), deleting the seed
  migration, and `supabase migration repair --status applied 20260812000001`.
  **Schema through the CLI, data through the script.**
- The Supabase CLI was already installed and logged in — but to a *different*
  account that can't see this project. Neither `login` nor `link` was needed in
  the end: `supabase db push --db-url "$SUPABASE_CONNECT_STRING"` skips both.
- RLS verified live with the real anon key: SELECT 200 (and the `match_species`
  overlap query works through PostgREST `ov.`), INSERT **401/42501**. Careful:
  anon DELETE returns **204** — RLS filters the rows out first, so nothing is
  deleted. All 712 rows survived it. Judge write protection by row counts, not
  status codes.
- Scope was **M-B only, by the user's choice**. Adding Champions M-A (1104) or
  SV Reg I (1280) is one entry in the script's `TABS` array — gids are recorded
  in ARCHITECTURE.
- Verified against a real Postgres 18 via PGlite before handing it over (DDL,
  712-row seed in 20ms, idempotent second run, export text byte-identical).
- **No UI over it** — 712 teams needs its own design pass; that's the next
  decision, not something this pass assumed.
- Also fixed the 3 duplicate-key console errors the user reported: `/demo`'s two
  "use existing" lists concatenated `loadSavedTeams()` with `PRESETS` and a
  remembered preset appeared in both (same id since `rememberTeam` canonicalises
  by roster). New `existingTeams()` helper dedupes by id and by species.
  Verified over CDP: each preset offered once, my-team and already-added
  opponents excluded, console clean.

## 2026-08-12: one copy/paste for one-vs-one and one-vs-many

User: "for one team vs many team match up, is it possible to add a copy json
here? … they are basically the same. the copy json can be located at the left
of + add teams". Done — **v3** in `app/demo/workflow-io.ts`:
`{v:3, my, b:[{op,t},…]}`, my team stated once, a single board being just N=1.
Rules and rationale in docs/ARCHITECTURE.md → "Copy/paste is one format for one
or many opponents". Highlights:

- `encodeGroup(my, boards)` is the only writer; `encodeWorkflow(setup, nodes)`
  calls it with one board (and is still the id-free dirty-check fingerprint).
  v2/v1 are still read — `decodeWorkflowGroup` normalizes all three.
- `t: []` is legal = "lined up, not planned yet" (matches storage's `nodes: []`),
  so an unplanned opponent survives a round trip with its roster.
- Warnings are prefixed `vs <opponent> — ` only when there's more than one
  board; one unreadable opponent rejects the whole paste (no half imports).
- Surfaces: `copy JSON (N)` on each `/matchups` group header (left of
  `＋ add teams`, where the user asked for it), `paste JSON` beside
  `＋ New matchup`, plus the board's existing Copy JSON / Import — a
  multi-opponent paste on the board loads the first and saves the rest.
- Import **replaces** an existing pairing (keeping its id, so its cloud row
  survives) and says how many it replaced.
- **`rememberTeam` got stricter about identity** (needed, found by the browser
  check): it now also matches teams referenced by saved boards, and falls back
  to species-list equality, because a pasted matchup carries rosters without
  sets. Without it, pasting a group for a cloud-pulled team started a second
  group. Longer export text wins so sets aren't discarded.
- **Every copy button confirms** (follow-up ask: "copy json here and everywhere
  else should have the 'Copied' effect as well"). `useCopy()` in `app/ui.tsx` is
  now the one implementation — "Copied ✓" for 1.5s, timer cleared on unmount,
  and it claims nothing if `writeText` rejects. Used by the board's Copy JSON,
  the group's copy JSON (N), and the team card's Copy export (which had its own
  copy of the logic before). Verified all three flip and the clipboard really
  receives the payload — note `writeText` rejects on an unfocused document, so
  a headless check needs `Emulation.setFocusEmulationEnabled`.
- 80 vitest tests (10 new codec tests). Verified over CDP: copy a 3-opponent
  group → wipe localStorage → paste → all three boards return under one team
  with note, declared move and recorded Mega intact, the unplanned one still
  unplanned, re-import replaces instead of duplicating; and on the board, Copy
  JSON is v3 and a 3-opponent paste keeps the extras.
## 2026-08-12: `← back` on every page

User report on the board: "there is no back button." `home` was there; back was
not, and home can't stand in for it — the board is reached from `/matchups` *and*
from `/demo`. New `BackLink` in `app/nav.tsx` uses real history, with a
`fallback` for direct entry / an off-site previous page. `HeaderNav` takes
`back` and `onBeforeLeave`. **Placement rule (user-directed): back goes with the
page's action buttons when the page has a row of them, otherwise in the nav** —
left of `Reset` on the board, left of `paste JSON` on `/matchups`, left of My
Team's `＋ import` on `/demo`, in the nav on `/demo/lookup` and `/login`. Moving
it into `/demo`'s My Team row collided with that section's existing `← back`
(which closed its import panel), so **a panel now closes with `cancel`** and
`← back` only ever means "leave this page". `BackLink` takes a `className` so it can look like
the buttons it stands with; pass `back` to `HeaderNav` *or* place a `BackLink`,
never both (exactly one back per page — verified `backCount: 1`). On the board
it's wrapped in its own capture handler so Reset never triggers a save. The board
passes `saveIfDirty`,
so leaving the board saves it like switching opponents already did — no
"unsaved changes" dialog, ever. Rules in docs/ARCHITECTURE.md → the navigation
section. Verified over CDP: board opened from `/matchups` goes back there, the
same board opened from the builder goes back to `/demo`, direct entry falls back
instead of leaving the site, a note typed and not saved survives the trip, and
all four inner pages carry the link.

## 2026-08-12: `/matchups` painted its list twice

User report: "initially there is only one team, and there is a flash and many
teams appeared then." Reproduced in a real browser (CDP, fake session cookie +
a 700ms-delayed intercepted `/rest/v1/matchups` response) — before: `24ms` "No
saved matchups yet" → `40ms` one browser group → `761ms` three groups. After:
one paint at `769ms`, with an invisible-until-300ms placeholder before it.

- `refresh()` in `app/matchups/page.tsx` set the rows once, not twice: the
  account rows belong to the same list, so the list waits for them. Empty state
  is gated on the load being finished.
- New `.late-fade-in` in globals.css — a placeholder that is invisible for
  300ms, so a fast response replaces it before it was ever seen. The delay
  survives `prefers-reduced-motion` (only the fade is dropped); showing a
  placeholder instantly would be the flash we're removing.
- Upload/delete now update the rows optimistically (`markInCloud`, filtering the
  removed row) so the reconciling refetch behind them isn't a second jump.
- `userClient()` in `app/demo/cloud.ts` now uses `auth.getSession()` (local read)
  instead of `auth.getUser()` (network round trip) — RLS is the actual authority,
  so this only removes latency, not a check. Signed-out is now instant.
- Rules written up in docs/ARCHITECTURE.md → "One list, one paint" and the
  gotcha about `getSession` vs `getUser`. 70 tests / tsc / eslint green.

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
- **DONE (user, 2026-08-13)**: Supabase → Authentication → URL Configuration —
  Site URL https://xatu-six.vercel.app plus the redirect allow list, keeping
  localhost:7317. Before this, Google sign-in from production completed and then
  bounced back to localhost.

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
