# xatu — product

## What it is

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

## Features

- **Guide editor** — direct-manipulation, battle-screen-shaped (mock team preview, mock
  battlefield). Not a node graph. Autosaves; valid while incomplete; sparse by design.
- **Reader view** — reads like the article it replaces: accordion of matchups, lead/back
  as sprites, gameplan paragraph, branches as terse action lines with expandable
  `reason`, a clickable walkthrough of turn-1 conditions (plain progressive
  disclosure), prominent copyable team export.
- **Paste-first sharing** — the guide as JSON text is the canonical artifact; copy to
  clipboard, paste to import. Built before the hosted path.
- **Hosted publishing** — anonymous publish → short URL; edit token returned once (kept
  in localStorage, appended to author URL); one-click fork with `forkedFrom` and a new
  regulation; Open Graph cards with title, author, six team sprites.
- **Matching** — `matchOpponent(observedSpecies, matchups)`: fuzzy, IDF-weighted,
  returns top 3 with scores. The future extension's core dependency; barely used in v1
  but implemented and tested now.

The phases are 1 (schema) → 2 (editor) → 3 (reader + hosting), and **Phase 3 is the
finished product** — there is no phase after it.

## Non-goals (explicitly out of scope — do not build, do not design in hooks for)

- **Any battle computation.** No damage calculator, no simulation, no speed tiers, no
  solver, no "recommended play" generation. Numeric claims live inside the author's free
  text and xatu never parses or verifies them. This keeps xatu's role as "faithfully
  display what the author wrote," which is both a correctness boundary and the reason the
  eventual extension is uncontroversial.
- **Complete decision trees.** Authors write only the branches they care about, typically
  two or three per matchup, mostly on turns 1–2. Unwritten branches are simply absent.
- **A node-graph / Blockly-style canvas.** The wrong affordance — it buys expressiveness
  the schema doesn't have and quietly pressures the author to "fill in the graph," the
  opposite of the sparse-by-design intent.
- **Accounts, login, or user profiles** in v1. Anonymous publish + an edit token.
- **Quiz mode.** Dropped from the plan entirely. The reader's clickable walkthrough is
  a plain progressive-disclosure component — no `quiz` prop, no hidden-answer
  abstraction, nothing reserved for a mode we aren't building.
- **The browser extension.** Separate project, later. But the schema, the paste format,
  and the matching function are all shared with it, so get those right.

These non-goals are the constraints most likely to be "helpfully" reverted in a later
session. They are deliberate. Do not revisit them without the user asking.

## Legal / attribution

xatu is an unaffiliated, non-commercial fan project. Pokémon is owned by Nintendo,
The Pokémon Company, Game Freak, and Creatures. This notice must appear in the UI.
