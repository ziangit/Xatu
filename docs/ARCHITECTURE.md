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
- `<HeaderNav back? onBeforeLeave?>` — renders `← back` and `⌂ home` first, then
  the page-specific links passed as children, then `<AccountLink />` (account
  state everywhere, not just the landing page). Links are `whitespace-nowrap
  shrink-0` so a long page title can't wrap the nav onto two lines.
- `<NavLink href>` — a page-specific header link at the nav's weight.
- `<BackLink fallback>` — added 2026-08-12 after "there is no back button" on the
  board. **`home` is not a back button**: the board is reached from two different
  places, and a link to `/` can't take the reader back to either. So this is real
  history (`router.back()`), which means the same board returns to `/matchups`
  when opened from the list and to `/demo` when opened from the builder —
  verified both ways in a browser. `fallback` covers the two cases where history
  is untrustworthy: nothing behind it (direct URL / new tab) and a previous entry
  on another origin (following it would leave xatu). Soft navigations don't update
  `document.referrer`, so an empty referrer with history behind it counts as an
  in-app hop.
- **Where back goes: with the page's action buttons if it has a row of them,
  otherwise in the nav** (both placements user-directed, 2026-08-12). The board puts
  it left of `Reset`; `/matchups` puts it left of `paste JSON` — one place to look for
  "leave here" and "do something here", styled like its neighbours via `className`.
  `/demo` puts it left of My Team's `＋ import`. `/demo/lookup` has no action row, so
  it passes `back` to `HeaderNav` and it renders at nav weight. `/` is exempt — it *is*
  home. A page must render exactly **one** back affordance: pass `back` to `HeaderNav`
  **or** place a `BackLink` yourself, never both.
- **A section's own way out of an open panel is "cancel", not "← back".** `/demo`'s My
  Team header used `← back` to close its import/choice panel; with the page-level back
  now in that same row, two identical labels would have sat side by side meaning
  different things. "← back" always means *leave this page*; a panel closes with
  `cancel`. (Verified: `backCount: 1` with the panel both open and closed.) On the board the standalone link is wrapped in its
  own capture handler so `saveIfDirty` runs for back without Reset ever triggering a
  save.
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
| `.late-fade-in` | a loading placeholder — invisible for 300ms, so a fast response replaces it before it was ever seen (the delay survives reduced-motion; only the fade is dropped) |

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
- **One list, one paint** (2026-08-12, after "initially there is only one team,
  and there is a flash and many teams appeared"). `/matchups` used to render the
  browser rows immediately and then re-render with the account rows merged in.
  Two paints of the *same list*: the page flashed, tripled in height, and — with
  nothing saved locally — said "No saved matchups yet" first. A list assembled
  from more than one source waits for all of them and renders once, behind a
  `.late-fade-in` placeholder. Corollaries: gate the empty state on the load
  being *finished*, never on "nothing has arrived yet"; and after a mutation,
  update the rows optimistically (`markInCloud`, filtering the deleted row) so
  the reconciling refetch is invisible rather than a second visible jump.
  Local-only builds skip the wait entirely — `supabaseConfigured()` is
  synchronous, so there is no request to wait for.
- **Leaving the board saves it** (2026-08-12, shipped with the back link). The
  board is the one page where navigating away could discard written work, so the
  header's links run `saveIfDirty` first — the same `hasUnsavedWork() && save()`
  the opponent switcher already used, passed in as `HeaderNav`'s `onBeforeLeave`
  (plus a capture handler on the wordmark, which is also a link). It deliberately
  does *not* fire for the account menu, which doesn't navigate. This is why there
  is no "you have unsaved changes" prompt: the honest fix for a footgun is to
  remove the footgun, not to add a dialog — and dialogs are banned anyway.
- **A copy always says it copied** (2026-08-12, after "copy json here and everywhere
  else should have the 'Copied' effect as well"). Writing to the clipboard is
  invisible, and one button confirming while another stays silent makes the silent one
  look broken. `useCopy()` in `app/ui.tsx` is the single implementation — it swaps the
  label to "Copied ✓" for 1.5s, clears its timer on unmount, and **returns false
  without claiming anything if `writeText` rejects** (denied permission, insecure
  context). Callers keep their own wording via the label, not their own timer. Used by
  the board's `Copy JSON`, each `/matchups` group's `copy JSON (N)`, and a team card's
  `Copy export`. Any new copy affordance uses it too.
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
- **Cloud calls check the session locally, not over the network.** `userClient()`
  in `app/demo/cloud.ts` uses `auth.getSession()` (a local read) rather than
  `auth.getUser()` (a round trip to `/auth/v1/user`). It only decides whether to
  *attempt* a query — owner-only RLS is what authorizes it, so a stale session
  gets an error from Postgres, never someone else's rows. This halves the latency
  before the matchup list can render. Don't "harden" it back to `getUser()`; the
  security boundary is RLS, and this is a browser client anyway.
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
- **`rememberTeam` returns the canonical team.** Re-importing the same team reuses the
  first `StoredTeam.id`, so a team keeps one identity across imports and its boards keep
  grouping together. Callers must use the returned team, not the one they passed in.
  It matches against the team library **and** the teams referenced by saved boards
  (a cloud-pulled board's team was never in the library, and the library caps at 40),
  by identical export text first and then by identical species list — a pasted matchup
  carries rosters only, so export-text equality alone would start a second group for a
  team the author already has. On a species-only match the copy with the longer export
  text wins, so pasting a roster over a team with real sets doesn't discard the sets.
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

### Copy/paste is one format for one or many opponents (v3, 2026-08-12)

The paste artifact (`app/demo/workflow-io.ts`) used to be a team *pair*, so a group
of six matchups could only be shared as six strings. It is now one document:

```
{ "v":3, "my": {n,f,s}, "b": [ {"op": {n,f,s}, "t":[…nodes…]}, … ] }
```

- **A single board is the same document with one opponent** (`encodeWorkflow` just
  calls `encodeGroup` with one board), which is the whole point: nothing in the UI or
  the format distinguishes "one vs one" from "one vs many", so there is no second
  code path and no wrong button to press.
- `my` is stated once — three boards cost ~760 bytes, not three full payloads.
- **v3 is the only thing written; v2 (a bare pair) and v1 (verbose) are still read.**
  `decodeWorkflowGroup` normalizes all three to "one of my teams + a list of boards",
  and `decodeWorkflow` is a thin single-board view of it for the board page.
- **An empty turn list `t: []` is legal** and means the same as storage's `nodes: []`
  — an opponent lined up but not planned yet. A shared group has to be able to carry
  the opponents the author hasn't got to; the board page substitutes a fresh board
  when it loads one.
- **Unknown species reject the whole paste**, including a group where only one
  opponent is unreadable: a half-imported set of matchups is worse than a refusal
  that names what's wrong. Sanitization warnings, by contrast, are per board and get
  prefixed `vs <opponent> — ` when there's more than one.
- **Import replaces a pairing rather than duplicating it.** An opponent already paired
  with the team keeps its library entry (and therefore its cloud row) and has its plan
  replaced; the result line says how many were replaced, so it is never silent.
- Surfaces: `copy JSON (N)` on each `/matchups` group header (left of `＋ add teams`),
  `paste JSON` next to `＋ New matchup`, and the board's own `Copy JSON` / `Import`.
  A multi-opponent paste on the board loads the first opponent and saves the rest into
  the library, reporting "Also added N more opposing teams".

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

## Roster identity vs. partial match (`lib/match/roster.ts`, 2026-08-12)

Groundwork for a future "find teams sharing 4+ of my six" search. The distinction
that shapes it, because it's easy to get backwards:

- **`rosterCode(species)` is identity.** Normalise, dedupe, sort, join with `|`.
  Same six in any order → same string. Use it to dedupe teams, to link a pasted
  team to a catalogue row, to notice that one roster appears 30 times.
- **A single code can never answer "4 of 6."** Two sets differing by one element
  hash to unrelated strings; there is no "off by one" query on a hash. Partial
  search is an *array* operation: `where match_species && $1`, ranked by
  `cardinality(intersect)`. The code is the prerequisite for that (it's what
  makes both sides comparable), not the mechanism.
- If the ≥4 test ever needs to be an equality join instead of a scan, the
  derivation is a subset table: all C(6,4) = 15 sorted 4-subsets per team,
  10,680 rows for 712 teams. Deliberately **not built** — the array query
  answers the whole 712-row corpus in 3ms, so there is nothing to optimise yet,
  and the codes make it a pure derivation whenever there is.

Normalisation, decided from the corpus rather than in the abstract:

- **In-battle formes collapse** (`-mega`, `-mega-x/y`): 34 catalogue rows name a
  Mega in their paste ("Garchomp-Mega", "Charizard-Mega-Y"), but team preview
  shows the base forme, so a key that keeps the suffix can never match what a
  reader observes.
- **Preview-visible formes stay distinct** — this is why it isn't blanket
  hyphen-stripping. The same corpus holds `Floette-Eternal` *and* `Floette-Mega`;
  collapsing the first to "floette" would erase a real difference.
  `Ninetales-Alola`, `Tauros-Paldea-Aqua`, `Rotom-Wash` likewise survive.
- Sorting is not cosmetic: 108 of the 712 teams differ from another team only in
  paste order, and Mega collapsing merges 4 more rosters (571 → 567 distinct).
- `formeCandidates` stays broader on purpose — it generates possibilities for the
  *observed* side, where over-matching is cheap. `matchKey` is a stored canonical
  form, where over-collapsing loses information. Don't unify them.

The module is **self-contained (no relative imports)** so the ingest script can
run it directly through Node: what lands in the database is computed by the same
code the app and the future extension use. A canonical form only one side of a
comparison knows about is worse than none.

### Partial match over the catalogue — planned, NOT built (2026-08-12)

The keys and indexes exist; the search does not. Written down here so a later
session implements the decided thing instead of re-deciding it. The user's intent:
*"gives matching teams with 4+ matching"*.

The query, run and timed against the real 712-row corpus (3ms, no tuning):

```sql
select source_team_id, name, paste_url, species,
       cardinality(array(select unnest(match_species)
                         intersect select unnest($1::text[]))) as shared
from public.community_teams
where match_species && $1::text[]              -- GIN-indexed prefilter
  and regulation = $2
group by 1, 2, 3, 4, match_species
having cardinality(array(select unnest(match_species)
                         intersect select unnest($1::text[]))) >= $3   -- 4
order by shared desc, source_team_id
limit 20;
```

`$1` is `matchSpecies(observed)` — always pass the **normalised** array, never raw
paste names, or `Garchomp-Mega` fails to find `Garchomp` (it correctly resolves to
`garchomp`, and that only holds if both sides go through `matchKey`).

Decisions already made, and the reasons:

- **Rank, don't cut off.** Return overlap counts in descending order and let the
  caller show `6/6` above `4/6`. The existing rule for `matchOpponent` applies
  unchanged: show candidates with scores, never assert one confident answer. On a
  real probe the corpus gave 30 teams at 6/6, 9 at 5/6, 46 at 4/6 — a bare
  "≥4" list of 85 rows would bury the exact matches.
- **4 is the caller's threshold, not the schema's.** `sharedSpecies()` returns the
  count; nothing in `lib/` hardcodes 4.
- **Filter by regulation.** A Reg I team sharing five species is not a Champions
  M-B opponent. The composite index `(regulation, featured desc)` is there for it.
- **`roster_code` equality is the exact-match fast path** (and how you find the
  roster that appears 30 times) — reach for it before the array query when you
  want "this exact team".
- **Where it lives:** the ranking belongs in `lib/` as a pure function over rows
  (extension-shareable, unit-testable); only the SQL belongs in the app. Do not
  put the overlap arithmetic in a component.
- **Degrade, don't break.** The catalogue is a Supabase read through the anon key
  and its world-readable SELECT policy. With Supabase unconfigured, or the table
  absent, the feature is simply unavailable — the local-first flow must keep
  working, same as every other cloud read.
- **Still no battle computation.** Overlap is set arithmetic on species names. No
  usage statistics, no threat scoring, no "this team beats yours".
- If the ≥4 test ever needs to be an equality join rather than a scan, see the
  subset-table note above — it is a derivation from `match_species`, not a
  refetch.

Not decided, and deliberately left open: how a reader *reaches* this (search box?
automatic on the opponent-import step?) and what a result row looks like. 712
teams is past what `/demo`'s "use existing" list can show, so that is a design
pass, not an implementation detail.

Two consequences elsewhere:

- `matchOpponent` now normalises **both** sides. It used to expand only the
  observed species into forme candidates, so a matchup stored as "Garchomp-Mega"
  could never match an observed "Garchomp" — the mismatch ran both ways.
- `rememberTeam` identifies teams by `rosterCode`, not by species in paste order.
  Order-sensitivity was a latent bug: the same team imported twice in a different
  order became two teams and split its group.

## Community team catalogue (VGCPastes, 2026-08-12)

712 Champions M-B teams from the public **VGCPastes Repository** sheet, ingested by
`scripts/vgcpastes/ingest.mjs` into `public.community_teams`
(`supabase/community-teams.sql`). These are raw material for choosing opponents — the
user picks sample teams by hand, so nothing here is a "sample team".

What the source does and doesn't give:

- The sheet is read through `gviz/tq?tqx=out:csv&gid=…` — no API key, no auth. Header
  row is the **third** row (two banner rows above it) and column positions differ between
  tabs, so the script locates columns **by header name**, never by index.
- Rows carry metadata and a pokepast.es link but **not the export**, so every paste is
  fetched from `pokepast.es/<id>/json`. That endpoint also returns the paste's own
  `Format: gen9…` string, which **wins** over the tab it was listed under — 5 of the
  712 M-B rows are actually M-A pastes.
- "…Featured Teams" tabs are **strict subsets** of their main tab (verified: all 184
  M-B featured IDs and paste URLs appear in the main tab), so they contribute
  `featured` + the archetype `category`, never extra rows.
- Other regulations are one entry in the script's `TABS` array: Champions M-A is gid
  791705272 (featured 417374305), SV Reg I is 972834435 (featured 1863148622).

Rules the ingest holds to:

- **Resumable and polite.** Each paste is cached as its own file under `data/pastes/`,
  so a re-run fetches only what's missing and an interruption costs nothing;
  concurrency 4 with a delay and backoff. The whole 712 took ~3 minutes once.
- **The repo's own parser.** Species come from `lib/team`'s `importTeamText` and the
  identity/overlap keys from `lib/match/roster`, both imported straight into the script
  (Node runs the `.ts` files), so the catalogue's idea of a team is identical to the
  app's. `export_text` is stored **verbatim** — round-trip verified byte-for-byte
  through Postgres.
- Three species columns, doing different jobs: `species` as pasted (display order),
  `match_species` normalised/sorted (GIN-indexed, for overlap search), `roster_code`
  their join (identity). See the roster section above.
- **No silent losses.** Dead pastes and unparseable exports are counted and listed at
  the end. (This run: zero of each, and all 712 have exactly six Pokémon.)
- **The seed is one atomic statement.** `jsonb_to_recordset` over a single
  dollar-quoted JSON payload, upserting on `paste_url`, so re-running refreshes
  rather than duplicating and a failure changes nothing. Verified against a real
  Postgres 18 (PGlite) before ever touching the project: DDL applies, 712 rows land
  in 20ms, a second run still leaves 712.
- **Schema through the CLI, data through a script** — learned the hard way,
  2026-08-12. The DDL is
  `supabase/migrations/20260812000001_community_teams.sql` and `supabase db push`
  applies it fine. The seed was tried the same way and **the CLI could not apply
  it**: one ~1.3MB statement carrying a dollar-quoted payload, which errored and
  left *nothing* in `supabase_migrations.schema_migrations` even though the DDL
  migration before it had already taken effect — so the next push then failed with
  "relation already exists". Sent as a single query over a normal Postgres
  connection (`node scripts/vgcpastes/seed.mjs`, `pg` as a devDependency) the same
  file applies in ~1.3s. Don't make the seed a migration again; if the history and
  the database disagree, `supabase migration repair --status applied <version>` is
  the fix.
- **Applied to the live project on 2026-08-12**: 712 teams, 567 distinct rosters,
  184 featured, 2 regulations. `supabase db push --dry-run` reports "up to date".
- **Write access is nobody's** — verified live against the project with the real
  anon key the app ships: SELECT 200 (712 rows, and the `match_species` overlap
  query works through PostgREST's `ov.` operator), INSERT **401 / 42501 "new row
  violates row-level security policy"**. Note DELETE answers **204**, which looks
  like success but isn't: RLS filters every row out first, so nothing is deleted —
  re-checked that all 712 rows and MB712 specifically survived it. Judge write
  protection by whether rows changed, not by the status code. Seeding is out of
  band over a direct owner connection; the service-role key stays unused.
- `data/` is gitignored — the database is the artifact and the script is the way there,
  so 2MB of generated JSON/SQL doesn't belong in git history.
- Attribution: every row keeps `author`, `owner`, `source_link` and `paste_url`, so
  anywhere these surface can credit the player and the repository.

Not built: any UI over this. 712 teams (and 3,096 if the other regulations land) is far
past what `/demo`'s "use existing" list can show, so surfacing it needs its own design
pass — storing it commits us to nothing.

## Key decisions

- Direct-manipulation editor shaped like the battle screen, grouped/collapsed **by
  matchup** (accordion), not by turn — the article this replaces has ~7 matchup sections
  with 2–3 branches each; the matchup list is what needs folding.
- Open Graph cards early (title, author, six team sprites) — authors share on X and in
  note articles; the card materially affects click-through and costs a few meta tags
  plus an OG image route. (Phase 3.)
