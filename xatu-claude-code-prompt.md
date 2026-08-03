# Claude Code bootstrap prompt — `xatu`

Copy everything below the line into a fresh Claude Code session in an empty directory.

---

I want to build a new project called **xatu**. Please bootstrap it.

If you have a skill named `nextjs-supabase-vercel-bootstrap`, use it — this project is on
that stack. Skip the cron and LLM parts; xatu needs neither. Don't re-interview me on the
basics below, they're all here. Do ask if something is genuinely ambiguous.

## What xatu is

A web platform for publishing **matchup guides** (MU guides) for competitive Pokémon
doubles, designed to be linked from an RMT / team report.

Today, the most useful part of an RMT is the "vs. common archetypes" section — which four
Pokémon to bring, which two to lead, and what to do on the first couple of turns. It's
written as prose, so it can't be looked up while you're actually playing. xatu turns that
section into structured data that an author edits with direct manipulation, a reader
browses or drills against, and (later, separate project) a browser extension surfaces
in-battle at the moment of team preview.

Named after the Pokémon known for seeing the future.

Target metagame: Pokémon Champions VGC regulations (Reg M-A, M-B, ...) as played on the
Pokémon Showdown ladder, plus the older SV VGC regulations. Doubles, bring 6 / pick 4.
Regulations rotate every few months and invalidate guides, so regulation is a first-class
field on every document and forking a guide to a new regulation must be cheap.

Reference for the shape of the content this replaces:
<https://note.com/yoshimap/n/n411fe0271c75> — a Champions Reg M-B team guide with seven
"vs. archetype X" sections. That article is the target output format for the reader view.

## Explicit non-goals

Do not build, and do not design in hooks for:

- **Any battle computation.** No damage calculator, no simulation, no speed tiers, no
  solver, no "recommended play" generation. Numeric claims live inside the author's free
  text and xatu never parses or verifies them. This keeps xatu's role as "faithfully
  display what the author wrote," which is both a correctness boundary and the reason the
  eventual extension is uncontroversial.
- **Complete decision trees.** Authors write only the branches they care about, typically
  two or three per matchup, mostly on turns 1–2. Unwritten branches are simply absent.
- **A node-graph / Blockly-style canvas.** See the editor section — the wrong affordance.
- **Accounts, login, or user profiles** in v1. Anonymous publish + an edit token.
- **The browser extension.** Separate project, later. But the schema, the paste format,
  and the matching function are all shared with it, so get those right.

## Data model

This schema is simultaneously the platform's storage format, the copy-paste sharing
format, and the future extension's input format. Define it once in TypeScript with a
runtime validator (zod), export it from a `lib/schema/` module, and version it with a
`schemaVersion` field from day one.

A **Guide** is one document:

- `id`, `schemaVersion`, `regulation` (e.g. `"champions-m-b"`), `title`, `authorName`
  (free text, no account), `createdAt`, `updatedAt`, optional `forkedFrom`
- `ownTeam`: the author's team as a **verbatim Pokémon Showdown export string**, stored
  as-is, plus a parsed view for UI use. Readers copy this to actually use the team, so it
  round-trips losslessly. Nothing in the system computes with it.
- `matchups: Matchup[]`

A **Matchup** is one "vs. archetype" section:

- `name` (author's label, e.g. `"Big Six"`, `"Aerodactyl + Charizard core"`)
- `opponentSpecies`: a list of species, each tagged `required` | `common` | `optional`,
  each with an optional free-text note (`"usually Choice Scarf"`). Deliberately *not* a
  full team paste — the author doesn't have the opponent's EVs and doesn't think in them.
- `plan`: the team-preview-level decision — `bring` (up to 4 species from own team),
  `lead` (2 species), and `gameplan` (free text, the "Milotic sets up board states where
  Tyranitar has the advantage" paragraph).
- `rules: Rule[]`

A **Rule** is one conditional branch:

- `turn`: integer, 1-based
- `conditions`: an array of predicates, combined with **AND only**. No OR, no nesting, no
  negation beyond what the predicate vocabulary provides.
- `actions`: for each of the author's two active slots, one of:
  `{move: <one of that Pokémon's four moves>}` | `{switchTo: <own species>}` |
  `{protect: true}` | `{unspecified: true}`. Structured, chosen from the author's own
  team — never free text.
- `reason`: free text, optional, arbitrarily long. Never parsed. This is where
  "Milotic always lives Life Orb Dragon Claw + Solar Beam at -1" goes.

### Predicate vocabulary (closed set — resist adding to it)

Every predicate must be mechanically detectable from the Pokémon Showdown battle protocol,
because the extension will evaluate these against a live battle:

- `opponentLeads(species)` — opponent's active Pokémon at the start of turn 1
- `opponentSwitchesIn(species)`
- `opponentUsesMove(move)`
- `opponentMegaEvolves` / `opponentTerastallizes` (optionally constrained to a species)
- `weatherIs(x)` / `terrainIs(x)`
- `tailwindUp(side)` / `trickRoomUp`
- `ownFainted(species)`

Anything an author can't express here goes in `reason` or `gameplan` as prose. Don't grow
the vocabulary to chase expressiveness.

### Two condition tiers — keep them separate

This is a real timing constraint, not a stylistic choice. Team preview reveals the
opponent's six Pokémon; their *lead* is revealed simultaneously with yours on turn 1, when
your lead is already locked.

- **Preview-tier** conditions (opponent's six species only) may determine `bring` and
  `lead`. Model this as: a Matchup may carry alternate `plan`s guarded by a
  species-presence condition (e.g. "if they have Swampert, lead Sinistcha + Gholdengo").
- **Turn-tier** conditions may only determine `actions`. A rule conditioned on
  `opponentLeads(...)` can never change your lead — it changes what you *do* on turn 1.

The editor must not offer preview-tier outcomes under turn-tier conditions.

## Matching (implement now, barely used in v1)

A pure, well-tested function in a shared module — the extension's core dependency:

```
matchOpponent(observedSpecies: string[], matchups: Matchup[]): {matchup, score}[]
```

- Fuzzy, not exact. Roughly 4-of-6 overlap should match, but **weight species by
  inverse frequency within the guide's own matchup library** (IDF). Two mediocre teams
  both running Incineroar and Garchomp will trivially hit 4/6; "Basculegion + Whimsicott
  co-occurring" carries far more signal. `required`-tagged species get a large weight
  multiplier — the tag is the author hand-calibrating the IDF.
- Return the top 3 with scores. Never assert a single confident answer.
- No external usage data. The corpus is only what's in the guide.

Unit-test this properly; it's the one non-trivial algorithm in the codebase.

## Editor UI — direct manipulation, not a node graph

The author's mental model is the battle screen, so the editor should look like the battle
screen. A Blockly-style canvas buys expressiveness the schema doesn't have and quietly
pressures the author to "fill in the graph," which is the opposite of the sparse-by-design
intent.

- Matchup setup: a mock **team preview** — drag species into the opponent's six slots and
  tag each required/common/optional; drag from your own team into `bring` (4) and `lead`
  (2) slots.
- Turn rules: a mock **battlefield**. Drag an opponent Pokémon onto an enemy slot to
  express `opponentLeads(...)` / `opponentSwitchesIn(...)`. Add extra predicates from a
  small dropdown. Set each of your two slots' actions by clicking a move from that
  Pokémon's four, or picking a bench Pokémon to switch to.
- Everything autosaves and is valid while incomplete. A matchup with a `plan` and zero
  rules is a legitimate, publishable document.
- Group and collapse **by matchup** (accordion), not by turn. The article this replaces
  has seven matchup sections with two or three branches each — the matchup list is what
  needs folding; three rules on turn 1 do not.

## Reader view — should read like the article

This is what the RMT links to, so it must feel native embedded in a team report, and it
must be readable by someone who's never heard of xatu.

- Accordion of matchups. Each expands to: bring 4 / lead 2 (as sprites), the gameplan
  paragraph, then the branches.
- Each branch renders as a short **action line** (icons + terse text) with the `reason`
  as expandable detail beneath it. Two layers, because the extension will later show only
  the action line — same data, different density.
- Make it **clickable-walkthrough**: under a matchup, offer the turn-1 conditions as
  buttons ("they lead Zard + Aero" / "Zard + Chomp" / "Aero + Sylveon"); clicking reveals
  that branch. Build this component so a later `quiz` mode — hide the answer, make the
  reader choose, then reveal — is a prop, not a rewrite.
- The full `ownTeam` export string with a copy button, prominently. Readers came for the
  team too.
- No login wall. Public read, always.

## Sharing and persistence

- **Paste-first.** The canonical shareable artifact is the JSON document as text: copy to
  clipboard, paste to import. Zero dependencies, works even if the service is down, and
  it's what the future extension ingests. Build this before the hosted path.
- Hosted: anonymous publish → short URL. An edit token returned once, stored in
  `localStorage` and appended to the author's URL. Losing it means losing edit access;
  say so plainly in the UI. No email, no password.
- **Fork**: one click, copies the whole document, sets `forkedFrom`, lets the author pick
  a new regulation. This is the primary path for surviving a regulation rotation, so make
  it obvious rather than hiding it in a menu.
- **Open Graph cards** early — title, author, and the six team sprites. Authors share
  these links on X and in note articles; the preview card materially affects whether the
  link gets clicked, and it costs a handful of meta tags plus an OG image route.

## Pokémon data

- Parse Showdown export text with `@pkmn/sets` (`Teams.import`) — verify the current API
  rather than assuming it. Support **pasting the text directly** as the primary path;
  fetching a Pokepaste URL is a nice-to-have and must be done **server-side** (CORS).
- Sprites and icons: hotlink Showdown's sprite CDN. Do not commit any sprite or audio
  assets.
- **Be lenient about species/move validation.** Champions-era data (Megas, new regulation
  sets) may lag in whatever dex package you use. Unknown species should produce a
  non-blocking warning, never a rejected import. The author is the authority; xatu is not
  a legality checker.
- Include a fan-project notice: xatu is an unaffiliated, non-commercial fan project;
  Pokémon is owned by Nintendo, The Pokémon Company, Game Freak, and Creatures.

## Phases — build in this order, ship each

1. **Schema + paste round-trip.** Types, zod validator, `matchOpponent` with tests, import
   own team from an export string, export/import a full guide as JSON text. No hosting,
   no persistence. Verify the model survives hand-encoding two real matchups from the
   note.com article linked above before building any UI on top of it.
2. **Editor.** The drag-and-drop matchup and rule editors, local state only.
3. **Reader view + hosting.** Supabase persistence, short links, edit tokens, OG cards,
   the clickable walkthrough.
4. **Quiz mode.** The walkthrough component with answers hidden and scoring.

Leave `// Phase N plugs in here` markers. Don't build phase 3 concerns into phase 1.

Start with phase 1 and the harness. Before writing code, show me the schema and the phase
plan so I can react to them.
