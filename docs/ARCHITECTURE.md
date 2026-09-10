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

## Interface language — English ⇄ 中文 ⇄ 日本語 (2026-08-15, Japanese 2026-08-16)

`app/i18n/` holds the whole thing. It is **not** in `lib/`: a React context is
disqualified by the framework-free rule, and a UI dictionary isn't
extension-bound either. `app/auth/` is the precedent — cross-page chrome that
isn't a route.

**The locale is a cookie, read on the server.** `readLocale()` (`app/i18n/server.ts`)
reads `xatu-lang` in the root layout, which passes it to `<LangProvider initial>`
and stamps `<html lang>`. This is the only option of three where the **first
paint is already in the final language**:

- localStorage can't be read during SSR, so it means painting English and
  swapping after mount — a whole-page reflow on every load. Chinese sets ~40–60%
  narrower than the same English, so that is a big visible jump, and it is
  exactly what the "no layout shift from async state" rule exists to prevent.
- A pre-paint inline script can set `<html lang>` but cannot rewrite React-owned
  text, `title=` attributes, or `InlineConfirm`'s `question` prop.

**The cost, stated plainly:** `cookies()` is a request-time API, so every route
went from `○ (Static)` to `ƒ (Dynamic)`. Nothing in this app fetches on the
server, so what was a CDN file is now a server render of a shell — no data round
trip, no ISR to lose. Confirm it in `next build` output when touching the layout.
Do **not** reach for `cacheComponents` to win it back; it changes caching
semantics app-wide to buy something unmeasurable here.

Toggling does four things in order: set state (every client subtree re-renders in
the same tick, so the page is translated before anything touches the network),
write the cookie, set `document.documentElement.lang`, then `router.refresh()` —
which exists only so the `<title>` from `generateMetadata` follows. `app/page.tsx`
became a client component so the landing page translates instantly rather than
waiting on that refresh; it already rendered two client components, so the cost
is nil.

**Keys are the English sentence.** `t("Open the matchup builder")`. A missing
entry therefore falls back to correct English, which is what made it possible to
ship the first language one page at a time and the second one all at once — and
editing English copy drops the stale translation instead of silently keeping it.
Words this UI uses in two senses take a `context|` prefix (`nav|← back` is
leaving the page, `slot|back` is the two Pokémon behind your leads); everything
before the last `|` is stripped for the fallback.

**Adding a language** is a dictionary plus four one-line edits, and the type
system finds all four: widen `Lang`, add the dictionary to `DICTIONARIES`, add
its `<html lang>` subtag to `HTML_LANG`, and let `readLang` accept its cookie
value. Then a cell in the toggle and, if it is CJK, a look at the type rules
below. Nothing else in the app branches on the language — `htmlLang()` is the
only thing the three `toLocaleDateString` / `toLocaleTimeString` call sites need,
so keep it that way rather than reintroducing a ternary.

Two dictionaries also make completeness checkable: the test asserting **both
translate the same set of English keys** is what catches a string added to one
and forgotten in the other, which no per-dictionary check can see.

- **Plurals**: no `Intl.PluralRules`. The count-driven strings here are mostly
  verb agreement (`was`/`were`, `is`/`are`), which it wouldn't solve anyway. Write
  the **whole sentence per branch** and pick by the number. `count()` covers the
  common `"3 matchups"` noun phrase by making both English forms separate keys
  that a dictionary maps to one string — which is also where Japanese puts its
  counter word (`3 件のマッチアップ`), for free.
- **Watch the space before a `{count}`/`{places}` slot.** Those expand to a
  phrase ending in a CJK glyph, and the particle after it attaches directly. A
  trailing space inside the dictionary entry is invisible in review and obvious
  on screen; two Chinese entries shipped with one.
- **Never interpolate a translated fragment into another translated string**,
  except a noun phrase (`{count}`, `{places}`). Word order differs; a verb phrase
  or clause spliced in produces garbage.
- **Split sentences use `<T>`** (`app/i18n/T.tsx`) with numbered slots:
  `<T k="… {0} to also see …" parts={[<Link/>]} />`. The point is that the
  *spacing around the element becomes translatable* — English wants a space
  either side of an inline link, Chinese wants none. If you're about to write
  `{t("…")}{" "}<Link/>{" "}{t("…")}`, you've split a sentence; use `T`.
- **Punctuation joining two clauses is part of the key, not the builder.**
  `importSummary` joins its head and tail through `clause|{head}; {tail}`;
  English wants `; `, Chinese `；`, and Japanese ends the first clause outright
  with `。`. Freeze any of those into the code and the other two read wrong.

**Non-React emitters take a `lang` parameter defaulted to `"en"`**, so every
existing English test assertion keeps passing untouched. `importSummary(applied,
lang)`; `decodeWorkflowGroup(text, lang)`. In `workflow-io.ts` the `warn` channel
carries `(key, params)` and **only the collector renders** — that is what lets the
`Card 3 (turn 1)` label, the colon joining it, and the multi-board `vs X —`
wrapper all be translated, so Chinese and Japanese get their full-width `：`
instead of a concatenated ASCII one.

**The firewall — what must never pass through `t()`:**

| never translated                                                    | why                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| species, moves, items, abilities, natures, types                    | lookup keys for the icon sheet, `Dex.*`, and the `match_species` column |
| `FORMATS` / regulation strings                                      | `.eq("regulation", …)` filters on them                                  |
| `` `${my.name} vs ${opp.name}` ``, `"Imported team"`, `teamLabel()` | **persisted** to localStorage *and* Supabase                            |
| anything reaching `encodeGroup` / `boardPrint` / `fallbackDocId`    | identity and the board's dirty-check fingerprint                        |

If a stored name became locale-dependent, toggling the language would mark every
board dirty and re-upload it, and re-pasting a document in the other language
would fail its identity check and **fork a parallel group**. Guarded by tests in
`workflow-io.test.ts` → "language never reaches stored data".

Upstream English from Supabase Auth, PostgREST and Zod is passed through inside a
translated frame (`t("Couldn't reach the catalogue — {error}", { error })`).
Mapping error text we don't control is a trap; a translated frame around an
English detail is honest.

Author prose — the guide's `gameplan` and `reason` on `/demo/lookup` — stays as
written. It is content, not chrome, and a real user's guide would show in
whatever language they wrote it.

**Typography.** No CJK webfont: Geist has no CJK coverage and no subset to
request, so `--font-sans` carries a fallback chain (`PingFang SC`,
`Hiragino Sans GB`, `Microsoft YaHei`, `Noto Sans SC`) and per-glyph fallback
keeps Latin in Geist. Noto Sans SC would be megabytes for something every
platform already has. `body { font-family: Arial … }` — a create-next-app
leftover with no CJK fallback — is now `var(--font-sans)`.

**Japanese gets its own stack, and this is not optional.** Han unification puts
Chinese and Japanese drawings of hundreds of characters on the same code point,
font selection is per-glyph and stops at the first family that *has* the
character, and the shared chain names Chinese faces first — so without an
override the entire Japanese UI renders in Chinese letterforms. Legible, and
wrong in the way a Japanese reader notices instantly. `:lang(ja)` therefore
redefines `--font-sans` / `--font-mono` / `--font-display` with Hiragino / Yu
Gothic / Noto Sans JP in front. This works because the theme is `@theme inline`
(the utilities emit `var(--font-sans)` rather than a resolved value) and because
the block is **unlayered**, which beats Tailwind's `@theme` layer. Verify a
change here by reading `getComputedStyle(document.body).fontFamily` in a browser
with `<html lang="ja">`, not by reading the CSS.

Under `:lang(zh)` and `:lang(ja)` alike, `tracking-widest` is relaxed to `0.02em`
(0.1em inserts a gap between *every* glyph, which at 10px reads as broken) and
`text-[10px]` becomes 11px. That bump deliberately stops short of `text-[9px]`:
those are the board's move chips, which sit in a fixed-height row the SVG edge
measurement assumes is deterministic — and they hold move names, which stay
English anyway.

`:lang(ja) .font-display` also sets `word-break: auto-phrase`. Japanese has no
spaces so a line may break between any two characters, which the 60px landing
headline did mid-verb (見通/す). `auto-phrase` breaks at phrase boundaries
instead. Chrome-only; other engines ignore the declaration and keep the previous
behaviour, so there is no fallback to write. **Display type only** — it costs a
dictionary pass, and body text is small enough that nobody notices the break.

**The toggle** (`app/i18n/toggle.tsx`) lives in `HeaderNav` before `AccountLink`,
with its own leading hairline, outside the `onBeforeLeave` capture (it doesn't
navigate). The two headers that bypass `HeaderNav` — `app/page.tsx` and
`app/login/page.tsx` — mount it themselves; **check both when touching it**. Its
height is pinned (`h-[18px]`) because `中` has a taller line box than `EN` *and*
the `:lang(zh)` rule bumps its font size — either would grow the control by a
pixel the moment you used it. Its own box is identical in both languages;
its absolute position may move, because the nav labels beside it are translated
too and legitimately change width.

Each cell carries **its own `lang`** (`htmlLang(value)`). `中` and `日` are
shared code points, so without it a Japanese system font letters the Chinese cell
and vice versa — the same Han-unification problem as the body text, in two
glyphs. One glyph per language keeps the cells equal-width and the whole control
at 74×18 in every language (measured, all three). **Three cells is the limit**;
a fourth language turns this into a menu — still not a `<select>`, for the same
reason `window.confirm` is banned.

Tests: `app/i18n/__tests__/translate.test.ts` covers fallback, context stripping,
interpolation and the plumbing; a **placeholder-parity sweep over every entry of
every dictionary** — a dropped `{n}` silently loses a number and nothing else
would catch it; and the cross-dictionary key-set check described above.

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
  **Both matches are scoped to one provenance** (2026-08-14) — my teams merge with my
  teams, a shared document's team merges only with the same document. See "Two authors,
  one archetype".
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
- **Import never overwrites work the document doesn't own** — see the next section.
  Within the document's *own* group, a pairing is replaced rather than duplicated: the
  opponent keeps its library entry (and therefore its cloud row) and has its plan
  updated; the result line says how many, so it is never silent.
- Surfaces: `copy JSON (N)` on each `/matchups` group header (left of `＋ add teams`),
  `paste JSON` next to `＋ New matchup`, and the board's own `Copy JSON` / `Import`.
  A multi-opponent paste on the board opens the first opponent and saves the rest into
  the library, reporting where the others went.

### Two authors, one archetype: keep both (2026-08-14)

Importing a shared group used to destroy work. A team's identity was its roster
(`rosterCode`), so a guide someone else wrote for the same six Pokémon *was* my team as
far as `rememberTeam` was concerned: their boards landed on my ids, `upsertMatchup`
wrote their nodes over my plans, `upsertCloudMatchup` pushed that over my account rows,
and `rememberTeam`'s `name: team.name` renamed my team to theirs. The board's import had
the opposite bug — it left the first board unsaved, so Save minted a second entry for a
pair that already had one.

The rule now, in one line: **an import adds; deduplicating is a delete the author
performs.** (User's call: "keep both … if the user wants to dedup, he needs to manually
delete himself.") There is deliberately **no merge path** — no "adopt their plan"
button, no prompt at import time.

Identity is therefore *roster + provenance*:

- `StoredTeam.origin?: {docId, label, importedAt, keptApart}` — absent means "mine".
  **`docId` is recorded on every import**, collision or not; `keptApart` is the only
  field that changes behaviour (badge + merge scoping). Splitting the two is not
  optional: the first cut recorded provenance *only* on a collision, so an uncollided
  import kept no id, and pasting the very same document a second time found nothing to
  update, read its own first import as a rival team, and **forked a second group**
  (user hit this immediately). Read `docId` through `groupDocId`, `keptApart` through
  `isKeptApart` — the latter treats a legacy `origin` with no `keptApart` field as kept
  apart, since in that build provenance only ever meant a collision.
- The document carries `g`, the id of the group it was copied from (`groupDocId`:
  the team's own id, or the `docId` it was imported under, so passing a guide on keeps
  the identity it started with). Additive and optional — v2, legacy and pre-2026-08-14
  v3 documents decode to `docId: null` and fall back to `paste:<rosterCode>:<name>`,
  which is stable enough that re-pasting one doesn't fork a group.
- **`g` is written only by the copy buttons.** `encodeGroup` is also the board's
  dirty-check fingerprint (`hasUnsavedWork`), which must stay id-free — two copies of
  the same board have to encode identically even when their `StoredTeam` objects don't
  share an id.
- `planImport` (pure, tested) decides: a team here already heads this `docId` → update it
  in place, keeping its id *and* its provenance (a team of mine whose id the document
  carries has none, and must not acquire one); otherwise record the `docId` and set
  `keptApart` to whether the roster collides with any team here. **`keptApart` false is
  what makes an uncollided paste behave like a team of mine** — no badge, and it still
  merges with the full Showdown export pasted in next, which is what a restored backup
  needs.
- **Opposing teams stay shared across groups.** They carry no plan (the plan hangs off
  the *pair*), so reuse keeps the library tidy and is safe once `my.id` is what separates
  two authors. `rememberTeam(opp, {keepName: true})` stops a document renaming an
  opponent already here.
- **A pasted group is deletable as a unit and tinted as one.** `delete set` on the group
  header removes every board in it (browser and account), confirmed in place by turning
  the header into the question — undoing one paste took one confirmation per row before.
  `forgetTeams` then drops the teams that set used, but *only* the ones no remaining
  board and no in-progress `setup` still names, so a shared opponent survives and a team
  you imported but haven't paired with anyone isn't swept up.
- **Badge and highlight say different things.** The `IMPORTED` badge is provenance and is
  permanent. The `violet-50` wash marks only the set the *last paste* landed in
  (`justImported`, cleared when its import notes are dismissed and absent on the next
  visit) — it answers "where did that go?", which stops being a question once you've
  looked. Tinting every kept-apart set instead lit two of three same-roster groups up
  forever and pointed at nothing (user, 2026-08-14).
  (`#` + 8 hex, `select-all`) — two rows can now be identical on sight, and the id is
  the thing a delete removes, in localStorage and in the account alike.
- `/demo`'s "use existing" lists teams built here before pasted ones, so its
  species-level dedupe drops the *imported* row and never hides your own team.
- `applyGroupImport` is the single write path for both import buttons, which is what
  stops the two pages disagreeing again.
- **A board identical to the stored one is not rewritten.** Comparison is `encodeGroup`
  on the pair — the same id-free fingerprint the board's dirty check uses, so
  "identical" means one thing in both places. Re-pasting a document you already have
  writes nothing, keeps every `savedAt` (so the list doesn't reorder), re-uploads
  nothing, and says *"Nothing to import — you already have these exact N matchups"*.
  `importSummary` otherwise breaks the result down as `N new, N updated, N already
  identical`, and only `applied.written` is mirrored to the account.

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

### Partial match over the catalogue — BUILT 2026-08-13

Shipped as `lib/match/catalogue.ts` (ranking, pure) + `app/demo/catalogue.ts`
(the query) + `app/demo/catalogue-lookup.tsx` (a read-only panel in the species
picker). The design below was decided a day earlier and implemented unchanged;
what the implementation added is recorded after it. The user's intent:
*"gives matching teams with 4+ matching"*, refined to **read-only, on click**.

The reference SQL, run and timed against the real 712-row corpus (3ms, no tuning) —
the app expresses the same thing through PostgREST rather than a stored function,
because the ranking has to stay in `lib/`:

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

Settled when it was built (2026-08-13), with the measurements behind each:

- **Where it lives:** in the species picker, offered once **four slots are
  filled**, as a button. Nothing is fetched until it is clicked — verified: three
  species, zero requests; four species, still zero; one click, exactly one GET.
- **Read-only, by the user's decision.** Clicking a result does nothing to the
  team being typed; the panel says so. A catalogue guess must never quietly
  rewrite what an author wrote, and "show me what this looks like" is the whole
  need. If that changes, the row has `paste_url` and the table has `export_text`.
- **`contains` when the count equals the threshold, `overlaps` above it.** Four
  named with a threshold of four *is* "contains all four" — exact, not an
  approximation, and measured live at **13 rows / 5.4KB** against 481 rows /
  ~30KB gzipped for the overlap form. Six named uses overlap (569 rows, ~36KB
  gzipped) because expressing "at least 4 of 6" in PostgREST would need the
  C(6,4)=15 subset gymnastics that were deliberately not built.
- **One row per roster, with a `×N` paste count**, from `rankCatalogueMatches`.
  On the live corpus a six-species probe ranks 19 rosters out of hundreds of
  rows: `6/6, 5/6×4, 5/6×2, 5/6, 5/6, 4/6×9, …`. Ungrouped, the 4/6×9 roster
  alone would have filled a third of the list.
- **Sprites carry the reading**: the species you named render in colour, the rest
  greyed — the row explains its own score without a legend.
- The list scrolls inside a fixed height; a 19-row answer must not push the
  panel's own buttons off the screen.

Two consequences elsewhere:

- `matchOpponent` now normalises **both** sides. It used to expand only the
  observed species into forme candidates, so a matchup stored as "Garchomp-Mega"
  could never match an observed "Garchomp" — the mismatch ran both ways.
- `rememberTeam` identifies teams by `rosterCode`, not by species in paste order.
  Order-sensitivity was a latent bug: the same team imported twice in a different
  order became two teams and split its group.

## Community team catalogue (VGCPastes, 2026-08-12; M-C added 2026-09-10)

Champions teams from the public **VGCPastes Repository** sheet, ingested by
`scripts/vgcpastes/ingest.mjs` into `public.community_teams`
(`supabase/community-teams.sql`) — 780 rows: 709 M-B, 66 M-C, 5 M-A. These are
raw material for
choosing opponents — the user picks sample teams by hand, so nothing here is a
"sample team".

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
- Other regulations are one entry in the script's `TABS` array. Ingested: Champions
  M-C is gid 2001945654 (**no Featured tab** — `featuredGid` is simply omitted and
  the script skips that pass), Champions M-B is 1458357160 (featured 1774271567).
  Not ingested: Champions M-A is 791705272 (featured 417374305), SV Reg I is
  972834435 (featured 1863148622).
- **The tab is a fallback, and a weak one.** 2 of the 68 rows on the M-C tab are M-B
  pastes, exactly as 5 of the 712 on the M-B tab are M-A. The paste's own `Format:`
  string wins, which is why `FORMAT_BY_ID` must carry **both** the plain and the
  `…bo3` id for every regulation — a missing one falls back to the tab silently, and
  is right only by luck.
- **`FORMAT_BY_ID` and `TABS` are checked against the app at startup.** The script
  imports `FORMATS` from `app/demo/formats.ts` and exits if either table names a
  regulation the app doesn't list. Writing rows under a label `catalogue.ts` never
  asks for produces an empty lookup months later with nothing to debug.

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

Not built: any UI over this. 780 teams (and more as regulations land) is far past what
`/demo`'s "use existing" list can show, so surfacing it needs its own design pass —
storing it commits us to nothing.

## Regulation rotation — the runbook (written 2026-09-10, doing M-C)

Regulations rotate every few months, so this is a recurring chore rather than a
one-off. Done in this order it is about an hour, most of it waiting on pastes.

1. **Get the format string from Showdown, don't type it.**
   `curl -s https://play.pokemonshowdown.com/data/formats.js | grep -o 'Champions] VGC[^"]*'`
   The M-C strings were `[Gen 9 Champions] VGC 2026 Reg M-C` and its `(Bo3)` twin.
   Also worth reading: the new regulation becomes the base `champions` mod and the
   outgoing one moves to a legacy mod with `searchShow: false` — that is the signal
   it has actually left the ladder, and therefore that it should stop leading
   `FORMATS`.
2. **Check whether the dex moved.** Almost always it hasn't:
   `node scripts/gen-species.mjs --check` and `npm outdated @pkmn/dex @pkmn/img`.
   The decisive test is a diff of Showdown's live `pokedex.js` against
   `lib/species/names.ts` — for M-C it was zero new species (max dex number 1025
   either side; every "missing" forme was Gmax/Totem/cosplay, which
   `gen-species.mjs` drops on purpose, plus `Flabébé` differing only by NFC/NFD).
   Only if that diff is non-empty does any sprite or picker work exist.
3. **`app/demo/formats.ts`** — add the new string at the **front**. `FORMATS[0]` is
   the import default. Keep the outgoing regulations listed forever: saved teams and
   published guides reference them.
4. **Check nothing else was quietly pinned to `FORMATS[0]`.** This is where the one
   real bug was: `PRESETS` took it, so eight M-B sample teams would have relabelled
   themselves M-C. `grep -rn 'FORMATS\[0\]' app`.
5. **`scripts/vgcpastes/ingest.mjs`** — a `TABS` entry (find the gid from the sheet;
   a new regulation may have no Featured tab, and `featuredGid` is then omitted) and
   **both** `FORMAT_BY_ID` ids, plain and `…bo3`. The startup check against `FORMATS`
   will refuse to run if these disagree with step 3.
6. **Ingest just the new regulation**: `node scripts/vgcpastes/ingest.mjs --only
   "Champions M-C"`. It writes suffixed files, so the previous regulation's NDJSON
   record survives, and the seed upserts on `paste_url`, so applying it adds and
   refreshes only its own rows. Then `node scripts/vgcpastes/seed.mjs --file
   seed-community-teams.champions-m-c.sql`, which now prints a per-regulation count.
   **`SUPABASE_CONNECT_STRING` must be the Session Pooler**, not the direct
   `db.<ref>.supabase.co` host: direct is IPv6-only now (IPv4 there is a paid
   add-on), so on a machine without IPv6 getaddrinfo returns nothing and `pg`
   reports `ENOTFOUND` — indistinguishable from a deleted project, and it cost
   this session a confident wrong diagnosis. `seed.mjs` now detects that case
   and says so. The pooler (`aws-0-<region>.pooler.supabase.com:5432`, user
   `postgres.<ref>`) is dual-stack. The REST/API host is unaffected — it has A
   records — so the app never meets this and only the scripts do. **This project
   is `aws-0-ca-central-1`.** To find a region without dashboard access: every
   pooler hostname resolves, so probe them with user `postgres.<ref>` and a
   deliberately wrong password — the region hosting the tenant answers "password
   authentication failed", the rest answer "Tenant or user not found".
7. **Expect the new regulation's catalogue to be thin for a while.** VGCPastes had 68
   M-C teams against 861 M-B on the day M-C shipped, and no Featured tab yet. The
   lookup filters by regulation, so four-of-six hits are sparse at first. That is the
   honest state of the world and the panel's existing wording already says so; re-run
   the ingest in a few weeks rather than widening the filter.
8. **The sample teams are a separate, human decision.** They stay on their own
   regulation until the user replaces the set (see `SAMPLE_FORMAT`).

## Species type-ahead (`lib/species/`, 2026-08-13)

Typing "pika" offers Pikachu with its sprite. The second way to build a team, next to
pasting — same destination, since both end in `importTeams` and a picked team is stored
as the comma-separated species list that path has always accepted.

- **The list is generated, not fetched.** `scripts/gen-species.mjs` writes
  `lib/species/names.ts` — 1,317 rows of `base|forme|types` (**~9KB gzipped**; names alone
  were ~6.3KB, and the types are what make a row look like Showdown). Reading `@pkmn/dex`
  at runtime instead would mean a 1.8MB / 346KB-gzipped chunk for 1,317 rows — it stays a
  build-time tool and a lazy import on the board, where its move data earns the size.
  Re-run the script after a dex bump; `--check` fails if the committed file is stale.
- **Base and forme are stored apart** so a suggestion can be typeset the way Showdown's
  teambuilder does it — **Blastoise** with `-Mega` trailing in grey. The generator asserts
  `base + "-" + forme === name` for every row, which is what keeps `Ting-Lu` (a hyphen in
  a base name) and `Tauros-Paldea-Aqua` (a two-word forme) from being split by guesswork.
- **What's in it: every species the icon sheet can draw**, minus paint jobs. The icon
  test is the same one `isKnownSpecies` applies to a pasted roster, so the picker can
  never offer a name the board would then reject. Not a legality list — all generations,
  all regulations, Megas included. Names are stored **NFC**, so `"Flabébé" === name` holds.
- **What's excluded, and why each line is where it is.** Gmax and Totem formes (a doubles
  preview can't show them); the CAP/Pokestar/LGPE fictions (not Pokémon); everything the
  dex itself lists in `cosmeticFormes` — Unown letters, Vivillon patterns, Alcremie
  creams, Furfrou trims, Minior colours. **Plus one hand-written exclusion: Pikachu's
  fifteen costumes** (Cosplay, Libre, the travel caps, Partner). They are `otherFormes`,
  not `cosmeticFormes`, so no property in the data separates them from a real forme like
  `Maushold-Four` — and typing "pika" offered sixteen Pikachus, burying the only one
  anyone means (user, 2026-08-13). Do not "generalise" that exclusion by comparing base
  stats: Maushold-Four, Squawkabilly-Blue and Vivillon-Fancy are stat-identical to their
  bases, appear in real teams, and must stay.
- **Loaded lazily on picker mount**, so no page pays for it until someone opens the
  picker (verified: two chunks arrive on open, nothing on the `/demo` entry).
- **Showdown's look, not Showdown's behaviour** (user, 2026-08-13): rows carry the sprite,
  the bold-base/grey-forme name and coloured type badges, but the list stays **empty until
  you type** and is **capped at six**, with "more matches — keep typing" when it truncates.
  Showdown lists every Pokémon in a scrolling table; that is the part not to copy, because
  this list sits inline under the slots. The picker asks `searchSpecies` for one past the
  cap purely to know whether to show that line.
- **Ranking, not fuzzy matching**: exact → name prefix → forme-word prefix → substring,
  then base forme first, then shorter name. "pika" → Pikachu ahead of Pikachu-Libre;
  "dusk" still finds Lycanroc-Dusk. Deliberately no typo correction — a wrong species one
  Enter key away is worse than no suggestion. `speciesKey` folds case, punctuation and
  accents, so "iron h" finds Iron Hands and "flabebe" finds Flabébé.
- Unknown names are **not** offered ("no Pokémon by that name — paste the export
  instead"). That isn't a legality check; it's that a picker whose whole job is spelling
  can't confirm a spelling it doesn't know. Pasting remains the lenient path.
- **Six slots, and the slot is the input** (user, 2026-08-13, in two steps: first "6 slots
  instead of 0/6", then "select slot can enter the pokemon name"). A team preview has six
  places, and an empty slot says "two still to go" where "4/6" only says a number. Each
  empty slot holds its own `<input>`, so clicking one focuses it, Tab walks the row, and a
  pick lands where you were looking; a filled slot shows the sprite with a ✕, and
  backspace empties the slot you are standing in. Enter advances to the next *gap*, so six
  picks are six uninterrupted words.
- **Slot states are three, and they must look different from the panel** (user,
  2026-08-13: "it is currently ugly when there is '1 type …' and the slot same color as
  background"). Empty is a dashed border over `bg-white/60` on the cream panel with a
  drawn grey "?" disc — Showdown's placeholder, drawn rather than borrowed, because the
  icon sheet's fallback tile is not something to depend on. Active adds a solid border and
  ring; filled is white with the sprite and name. The slot number is a **corner label**,
  never a line of content: stacked above the input it read as "1 type…".
- **Slot positions are load bearing.** `slots` is always length 6 with `""` for empty, and
  only `ImportPanel` drops the blanks (`picked.filter(Boolean).join(", ")`). Filling slot 4
  first must not silently become slot 1 — that was the flaw in the earlier compact array.
- There is **no disabled state**: focus cannot land on a disabled element, so when the box
  below the row was disabled at six, freeing a slot left it dead and the next keystroke
  went to the body. Found by driving the keyboard in a browser, not by review.
- **Found by this work**: the dex has `-Mega-Z` formes (Absol, Garchomp, Lucario, off an
  "-ite Z" stone). No corpus team runs one, but the picker can now offer them, so
  `matchKey`'s in-battle-forme pattern accepts `z` alongside `x`/`y`. Stored roster codes
  are unaffected — nothing in the 712-team catalogue names one.

## Sample teams (`SAMPLE_TEAMS`, replaced 2026-08-13)

The eight built-in teams behind `/demo`'s "use existing" (`PRESETS` is exactly
`SAMPLE_TEAMS`) and `/demo/lookup`'s "or try" row. Chosen by the user, all Champions
Reg M-B. Rules, in order of how easy they are to break:

- **Their regulation is `SAMPLE_FORMAT`, never `FORMATS[0]`.** `PRESETS` used to take
  the first entry of `FORMATS`, which is whichever regulation is *current* — so the
  moment M-C shipped, eight real M-B pastes would have relabelled themselves M-C with
  nothing to notice. A sample's regulation describes the paste; it moves only when the
  sample set is replaced. Guarded by `app/demo/__tests__/formats.test.ts`.

- **Stored as the verbatim paste.** A preset is a real pasted team, not a special kind of
  one — the same `exportText` rule as `ownTeam`. Never hand-trim EVs, natures or trailing
  whitespace to tidy the source file: the round trip through `importTeamText` must come
  back byte-identical, and picking a sample must be indistinguishable from pasting it.
- **`label` is ours, the title is theirs.** VGCPastes titles ("zeen's Recreation of
  LexiconVGC's Grand Champions Festival Encore Champion Team EMHMY5SAK0") don't fit a
  picker row, so each entry carries a short archetype label plus a comment holding the
  paste's real title and URL. Keep the comment when editing — it is the only provenance.
- **Regenerate, don't retype.** To swap the set, fetch `https://pokepast.es/<id>/json`
  for each link, take `.paste`, normalise CRLF→LF, and emit the entries; then confirm
  each one parses to six species and re-exports identically. Hand-transcribing a paste is
  how a sample stops matching what the reader would get from the same link.
- **The lookup row shows the first three, deliberately** — it's a shortcut into the flow,
  not a catalogue. It doesn't need every sample to match `demoGuide`: a team with no
  matchup is a case the page handles anyway ("no matchup in this guide fits"), and the
  second sample (the guide's own team) is exactly that case.

## Key decisions

- Direct-manipulation editor shaped like the battle screen, grouped/collapsed **by
  matchup** (accordion), not by turn — the article this replaces has ~7 matchup sections
  with 2–3 branches each; the matchup list is what needs folding.
- Open Graph cards early (title, author, six team sprites) — authors share on X and in
  note articles; the card materially affects click-through and costs a few meta tags
  plus an OG image route. (Phase 3.)
