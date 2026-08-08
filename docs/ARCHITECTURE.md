# xatu — architecture (living doc)

> Update this whenever a non-obvious decision or constraint is discovered.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind 4), scaffolded with create-next-app.
  Note: Next 16 has breaking changes vs. training data — see AGENTS.md and
  `node_modules/next/dist/docs/` before writing framework code.
- zod 4 for runtime schema validation, `@pkmn/sets` 5 for Showdown export parsing.
- vitest for unit tests.
- Phase 3: Supabase (persistence) + Vercel (hosting). **Not configured yet** — no
  Supabase client, env vars, or tables exist until phase 3 starts.
- No cron jobs (no vercel.json), no LLM integration (no ANTHROPIC_API_KEY). Deliberate.

## The schema (`lib/schema/`)

One definition serves three roles: platform storage format, copy-paste sharing format,
and the future browser extension's input format. TypeScript types + zod validators,
exported from `lib/schema/`, versioned with `schemaVersion` from day one. Changes are
breaking for pasted documents in the wild — migrate, don't mutate.

- **Guide**: `id`, `schemaVersion`, `regulation`, `title`, `authorName` (free text, no
  account), `createdAt`, `updatedAt`, optional `forkedFrom`, `ownTeam`,
  `matchups: Matchup[]`. `regulation` is an **open string, not an enum** — regulations
  rotate every few months and must not force a schema version bump; known values
  (`"champions-m-b"`, ...) are input hints in the UI only.
- **ownTeam**: the author's team as a **verbatim Pokémon Showdown export string**, stored
  as-is, plus a parsed view for UI use. Readers copy this to actually use the team, so it
  must round-trip losslessly. The export string is the source of truth; the parsed view
  is derived and never computed with.
- **Matchup**: `name` (author's label, e.g. `"Big Six"`); `opponentSpecies` — a list of
  species each tagged `required | common | optional` with an optional free-text note
  (`"usually Choice Scarf"`), deliberately *not* a full team paste (the author doesn't
  have the opponent's EVs and doesn't think in them); `plans: Plan[]`.
- **Plan**: `when?` (preview-tier guard), `lead` (exactly 2 own species), `back` (0–2),
  `gameplan` (free text), and `rules: Rule[]`. Two structural decisions live here:
  - **Rules belong to the Plan, not the Matchup.** A rule's meaning depends on which
    plan is active — if two plans lead different Pokémon, "X uses Shadow Ball" points at
    a different board under each. In the common single-plan case the layer is invisible
    (everything lives in the sole plan's `rules`).
  - **`lead` + `back`, with `bring` derived** (`bringOf()` in `lib/schema/plan.ts` —
    a getter would not survive JSON). This makes lead ⊆ bring *unrepresentable* rather
    than validated, and matches how authors write ("Bring: Milotic + Gholdengo,
    Tyranitar, Staraptor" — lead pair first, then the back). `back` may be short.
- **Plan guards**: `when` is an AND array of `{kind: "hasSpecies", species}` predicates —
  the same shape as rule conditions, not a separate mechanism, but a deliberately
  separate one-entry vocabulary (preview reveals species presence and nothing else).
  No `lacksSpecies`; "otherwise" is the unguarded plan. **At most one unguarded plan
  per matchup; zero is legal** (an author may only have an answer for the Swampert
  case). **Evaluation is by specificity, not array index** — `selectPlan()`: among
  satisfied guarded plans the most predicates win (ties → array order, stable); the
  unguarded plan is the fallback regardless of position. There is no "plans[0] is the
  default" convention — that would silently break first-match semantics. Covered by
  unit tests.
- **Rule** (one conditional branch): `turn` (integer, 1-based); `conditions` — an array
  of predicates combined with **AND only** (no OR, no nesting, no negation beyond what
  the vocabulary provides); `actions` — **keyed by own species, not slot position**
  (slot A/B is meaningless once switches happen): an array of 0–2
  `{species, action}` entries where `action` is `{move}` / `{switchTo}` /
  `{protect: true}`, chosen from the author's own team, never free text. **A species
  with no entry is unspecified — omission carries that meaning; there is no
  `unspecified` sentinel variant.** `reason` — optional free text, arbitrarily long,
  never parsed.
- **Draft vs published**: `GuideDraft` (permissive — empty title, underfilled lead,
  zero plans all saveable) is what the editor operates on end to end; the strict
  `Guide` schema runs only at the publish and export boundaries (`validateDraft()`).
  Without this split, autosave and "incomplete is legal" fight each other. Do not
  tighten the draft schemas.

### Predicate vocabulary (closed set — resist adding to it)

Every predicate must be mechanically detectable from the Pokémon Showdown battle
protocol, because the extension will evaluate these against a live battle:

- `opponentLeads(species)` — opponent's active Pokémon at the start of turn 1
- `opponentSwitchesIn(species)`
- `opponentUsesMove(move, species?)` — optional species qualifier ("if Incineroar uses
  Fake Out")
- `opponentMegaEvolves` / `opponentTerastallizes` (optionally constrained to a species)
- `weatherIs(x)` / `terrainIs(x)`
- `tailwindUp(side)` / `trickRoomUp`
- `ownFainted(species)`

Anything an author can't express here goes in `reason` or `gameplan` as prose. Don't
grow the vocabulary to chase expressiveness.

### Two condition tiers — a real timing constraint, not style

Team preview reveals the opponent's six Pokémon; their *lead* is revealed simultaneously
with yours on turn 1, when your lead is already locked. Therefore:

- **Preview-tier** conditions (opponent's six species only) may determine lead/back.
  Modeled as: a Matchup carries alternate `plan`s guarded by `hasSpecies` predicates
  (e.g. "if they have Swampert, lead Sinistcha + Gholdengo").
- **Turn-tier** conditions may only determine `actions`. A rule conditioned on
  `opponentLeads(...)` can never change your lead — it changes what you *do* on turn 1.

The schema encodes this structurally (plan guards are species-presence only; rules live
inside a Plan and have no lead/back fields to affect), and the editor must never offer
preview-tier outcomes under turn-tier conditions.

**Authors will naturally write the tier mistake.** Real guides word it as "★ if they
lead Aerodactyl + Sylveon, you must lead Gholdengo" (yoshimap section ②) — a turn-tier
condition with a preview-tier outcome, impossible as written since our lead locks
before theirs is visible. What the author means is a preview guard:
`hasSpecies(Aerodactyl) AND hasSpecies(Sylveon)` → the Gholdengo plan. The Phase 2
editor should catch this: when someone tries to set a lead under a turn-tier
condition, offer to convert it to a species-presence plan guard. The hand-encoded
fixture (`lib/schema/fixtures/yoshimap-sand-staraptor.ts`) demonstrates the correct
encoding.

## Matching (`lib/match/`)

`matchOpponent(observedSpecies: string[], matchups: Matchup[]): {matchup, score}[]` — a
pure, well-tested function in a shared module; the extension's core dependency.

- Fuzzy, not exact: ~4-of-6 overlap should match, but **weight species by inverse
  frequency within the guide's own matchup library** (IDF). Ubiquitous species
  (Incineroar-alikes) carry little signal; rare co-occurrences carry a lot.
  `required`-tagged species get a large weight multiplier — the tag is the author
  hand-calibrating the IDF.
- Return the top 3 with scores. Never assert a single confident answer.
- No external usage data; the corpus is only what's in the guide.
- This is the one non-trivial algorithm in the codebase — it gets real unit tests.

## Pokémon data

- Parse Showdown export text with `@pkmn/sets`. Verified against the installed v5.2.0:
  the entry point is **`Team.import(str)`** (not `Teams.import` as the brief guessed),
  which returns a `Team` whose `.team` property is the array of parsed sets; `Team` also
  has `unpack`, `fromString`, `fromJSON`, `canonicalize`. Pasting the text directly
  is the primary path; fetching a Pokepaste URL is a nice-to-have and must be done
  **server-side** (CORS blocks it client-side).
- Sprites and icons: hotlink Showdown's sprite CDN (play.pokemonshowdown.com). Do not
  commit any sprite or audio assets to the repo.
- **Lenient validation**: Champions-era data (Megas, new regulation sets) may lag in any
  dex package. Unknown species/moves produce a non-blocking warning, never a rejected
  import. The author is the authority; xatu is not a legality checker. zod validates
  document *structure*; species/move strings are free strings. Advisory consistency
  warnings (action species not on team, unlisted move) live in
  `lib/schema/warnings.ts` and are display-only — never enforced at parse, publish, or
  import time.

## Board rules (`app/demo/board.ts`, 2026-08-08)

Three rules the author shouldn't have to maintain by hand. They live in a pure,
unit-tested module (`app/demo/__tests__/board.test.ts`) — the sim page only wires
them up.

- **A Pokémon that switches in can't also move.** Switching *is* the turn's
  action. `switchedInSpecies(side, parentSide)` derives it — front members that
  weren't in front on the parent card — so nothing extra is stored. The picker
  refuses moves and Mega for them and the chip reads "switched in"; a switch also
  clears both Pokémon's declared moves.
- **Positions carry into the next turn.** A turn starts where the previous one
  ended, so a positional edit cascades to descendants via `cascadePositions` —
  but only into slots that still hold the old occupant, so a downstream
  arrangement the author chose themselves survives. Alternates share their
  sibling's parent and therefore inherit too. `addNextTurn` carries positions,
  faints and Megas forward but **not** moves: a move is that turn's action.
- **Mega Evolution is recordable.** `SideState.mega` names the Pokémon that is
  Mega Evolved on that side, declared on the turn it happens (a Mega and a move
  share a turn — the picker stays open after toggling it) and carried forward,
  since a Mega-Evolved Pokémon stays Mega on the field or the bench. On the board
  it renders as the Mega forme's sprite plus a ⟡ on the chip.

Still no battle computation: the dex is consulted only for *whether an item is
the Mega Stone for its holder* (`Dex.items.get(item).megaStone`, same class of
metadata as move type colors) so the option can be offered. No forme stats, no
legality check, no once-per-battle enforcement — that's the author's business.

**Codec change (still v2):** a side packs as
`front|back|fainted|moves|mega`, mega being the front Pokémon's roster digit.
Trailing empty groups are stripped, so every previously copied payload still
imports; a Mega pointing off-roster or at a benched Pokémon is dropped with a
warning, like every other sanitized field.

## Navigation rule — no page is a dead end (2026-08-08, after user feedback)

Every page must be exitable without the browser back button, and the way out has
to be *visible* — a wordmark that happens to be a link does not count, because it
doesn't look like one. The chrome lives in **`app/nav.tsx`**:

- `<Wordmark tag?>` — the "xatu" wordmark, always a link to `/`, underlined on
  hover, with a title attribute.
- `<HeaderNav>` — renders `⌂ home` first, then the page-specific links passed as
  children, then `<AccountLink />` (account state everywhere, not just the landing
  page). Links are `whitespace-nowrap shrink-0` so a long page title can't wrap the
  nav onto two lines.
- `<NavLink href>` — a page-specific header link at the nav's weight.
- `<HomeLink>` — the home link on its own, for headers that can't use
  `HeaderNav` wholesale (`/login`). The icon is a drawn SVG house: the `⌂`
  character renders as a lopsided box in most UI fonts — do not go back to it.
- `Wordmark heading={false}` on pages whose own `h1` is their content (the
  board's matchup title, the lookup page's guide title) — one `h1` per page.

Top bar composition, after "the top bar is crowded as heck" (2026-08-08):

- Labels are plain nouns — `home` / `builder` / `matchups`. No arrows, no
  possessives; four decorated links read as a wall of text.
- The account is an **initial-avatar menu** (`AccountLink`), not `email + sign
  out` spelled out inline. A 24px circle is fixed-width no matter how long the
  address is; the email, "My matchups" and "Sign out" live in the popover
  (Escape and click-outside close it). It renders its own leading hairline, so
  local-only builds (`getSupabase()` → null) show no dangling divider.

Motion vocabulary (`app/globals.css`, added 2026-08-08 at the user's request) —
small and fast, so it reads as responsiveness, not decoration. All four are
disabled wholesale under `prefers-reduced-motion`:

| class | for |
| --- | --- |
| `.rise-in` | content arriving (cards, grouped rows, panels) — fade + 6px rise |
| `.fade-in` | arriving content **whose position is measured** — opacity only |
| `.pop-in` | menus/popovers, anchored at their trigger |
| `.grow-in` | something revealed in place (import panel, choice box, help) |
| `.step-1…4` | stagger delay for a short sequence |

`.fade-in` exists because the board's cards feed the SVG edge layout: the edges
are measured on the next frame, so a card that moves while animating would have
its connector drawn in the wrong place. Never give a measured element a
transform animation.

Two more rules that came out of the same pass:

- **No layout shift from async state.** The account widget sits in a fixed-width
  slot (`w-14`) and `supabaseConfigured()` answers synchronously, so the header
  never reflows (or pops an avatar in) when the session check resolves. Same rule
  for status text that appears after an action: the board's save line lives in a
  fixed-height row (`h-5`) that always says something ("not saved yet — Save
  keeps this board"), so the first save doesn't shove the board down and the row
  isn't a mystery gap before it. A conditionally-rendered status line is a layout
  shift waiting to happen — reserve the row instead.
- **Reference text is a disclosure, not a banner.** The board's rules live behind
  "▸ how the board works", collapsed by default — a paragraph of instructions
  across the top of a tool is read once and then it is noise.

**Never `window.confirm` / `window.alert`.** The native dialog is unstyleable,
says "localhost:7317 says", and blocks the page. Destructive actions confirm in
place with `InlineConfirm` (`app/ui.tsx`): the row's own controls swap for
"Delete from this browser and your account?" + Delete/cancel. Used by the
`/matchups` delete and the builder's opponent ✕.

The board header is three stacked bands — (1) wordmark + site nav, (2) matchup
title with the opponent switcher under it / board actions right, (3) the usage
hint full width. Cramming them into one row put the site nav, the switcher and
Reset/Import/Copy/Save in a single ambiguous strip; keep them separated.

Use these in every new page's header; do not hand-roll one. The only exceptions are
`/` (it *is* home) and `/login` (its own account page, so it hand-rolls the nav
without `AccountLink` — it still shows the wordmark and `⌂ home`). The same rule
applies inside flows: every multi-step panel needs a cancel/back affordance
(ImportPanel's cancel, TeamSlot's "← back").

`scratchpad/check-nav.mjs`-style CDP checks can assert this: load each route and
require at least one visible `a[href="/"]`.

## Known constraints & gotchas

- Regulations rotate every few months and invalidate guides — `regulation` is a
  first-class field, and fork-to-new-regulation is the primary survival path.
- Edit access is a bearer token issued once at publish (localStorage + author URL).
  Losing it means losing edit access — the UI must say so plainly. (Phase 3.)
- Paste-first: import/export as JSON text must work with zero backend — it's the
  fallback when the service is down and the extension's ingestion path.
- Reader view branches render in two layers (terse action line + expandable reason)
  because the extension will later show only the action line — same data, different
  density.
- The reader's clickable walkthrough is a plain progressive-disclosure component —
  condition buttons reveal branches. No quiz mode exists or is planned; do not add a
  hidden-answer abstraction or reserve props for one.
- **The schema is plumbing, never a product surface.** The board (drag-and-drop) is
  the primary input; JSON is an export artifact only — copied and pasted, never
  displayed or edited. No JSON textareas, no predicate names, no schema field names,
  no plan-comparison views anywhere in the product. A /playground page that rendered
  the schema was built and deliberately deleted (2026-08-03) for anchoring the wrong
  metaphor — do not rebuild it. The UI contract lives in docs/UI-SPEC.md.

## One team vs. many teams (decided 2026-08-08)

The sim tool's unit of work is a **board**: one team pair (`setup.my` + `setup.opp`)
plus its turn tree, stored as one `SavedMatchup` in localStorage and one `matchups`
row in the account. "My team vs. many opposing teams" is expressed by **grouping
boards, not nesting them**: every board sharing the same `setup.my.id` is one group
(`groupByMyTeam` in `app/demo/storage.ts`).

Decisions and why:

- **Group, don't nest.** The alternative — one document holding N opponents — would
  need a jsonb migration, a new table shape, and new save/sync/delete semantics for a
  nested child. Grouping needs none of that: boards saved before this existed group
  themselves, and boards pulled down from the account group identically. It is also
  already the shape `docs/PRODUCT.md` wants for a published guide (`ownTeam` + N
  matchups), so a group compiles into a guide later with no data change.
- **A group is derived, never stored.** No group record, no group id, nothing to keep
  in sync or repair. The only requirement it places on the rest of the app is a stable
  team identity, hence:
- **`rememberTeam` returns the canonical team.** Re-importing identical export text
  reuses the first `StoredTeam.id`, so a team keeps one identity across imports and its
  boards keep grouping together. Callers must use the returned team, not the one they
  passed in.
- **`nodes: []` means "lined up, not planned yet."** Adding an opponent on `/demo`
  creates its board immediately with no nodes; the sim page seeds a fresh board on
  open. This keeps the matchup library the single record of "my team vs. these teams"
  instead of introducing a parallel roster key.
- **Visiting an opponent must not fake a plan.** The sim page's opponent switcher
  auto-saves before moving, but only when the board differs *both* from what's stored
  *and* from a fresh board. The comparison uses `encodeWorkflow` (the compact codec is
  id-free, so it is a stable structural fingerprint) — not deep equality on nodes.
- **Multi-team paste lives in `lib/team/import-many.ts`**, pure and framework-free like
  the rest of `lib/`, with unit tests. Recognised: `=== [format] name ===` delimited
  exports (pokepaste folders / Showdown backups), one comma-separated species list per
  line, and several pokepaste links (the links are resolved by the caller — CORS forces
  the `/api/pokepaste` proxy). A format tag inside a `===` header is deliberately
  **ignored**: `FORMATS` in the UI stays the closed authority.
- Ambiguity is not guessed: blank-line-separated blocks are *not* treated as multiple
  teams, because that is exactly how one team separates its six sets.
- Fallback team name is the first two species ("Aerodactyl + Charizard") — how people
  refer to opposing archetypes anyway.
- Pairings are mirrored to the account as soon as they're created (signed in), before
  any plan exists. A failed mirror is **not** surfaced on `/demo`: the row simply stays
  browser-only on `/matchups`, where an upload button is the honest signal.

Entry points (a list view must be able to *start* work, not only show it) —
`/demo` reads intent from the query string, via `window.location.search` rather than
`useSearchParams` so the page needs no Suspense boundary:

| link | meaning |
| --- | --- |
| `/demo?new=1` | new matchup — clear the team and show the picker |
| `/demo?team=<teamId>` | plan with this team of mine |
| `/demo?team=<teamId>&add=1` | …and open the add-opponents box immediately |

Reached from: **＋ New matchup** (`/matchups` header), **＋ add teams** (per group
header on `/matchups` — a button, not a link, because it first pulls the group's
freshest board local so an account-only group can resolve `?team=`), **＋ add
opponent** (the board's switcher row), and **＋ new matchup with a different team**
on `/demo` itself (a button that clears state in place — an in-page `Link` to
`/demo?new=1` would not re-run the mount effect).

Unchanged by this: no battle computation anywhere near it, and the group is storage +
presentation only — nothing about it reaches the guide schema in `lib/schema/`.

## Key decisions

- Direct-manipulation editor shaped like the battle screen, grouped/collapsed **by
  matchup** (accordion), not by turn — the article this replaces has ~7 matchup sections
  with 2–3 branches each; the matchup list is what needs folding.
- Open Graph cards early (title, author, six team sprites) — authors share on X and in
  note articles; the card materially affects click-through and costs a few meta tags
  plus an OG image route. (Phase 3.)
