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

## Key decisions

- Direct-manipulation editor shaped like the battle screen, grouped/collapsed **by
  matchup** (accordion), not by turn — the article this replaces has ~7 matchup sections
  with 2–3 branches each; the matchup list is what needs folding.
- Open Graph cards early (title, author, six team sprites) — authors share on X and in
  note articles; the card materially affects click-through and costs a few meta tags
  plus an OG image route. (Phase 3.)
