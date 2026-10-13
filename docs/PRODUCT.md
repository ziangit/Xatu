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
- **Reader view** — a published set at a short link: the author's description, then
  each opponent with the turn tree the author built, branches stepping down as
  alternates rather than reading as a sequence. Lead/back as sprites, notes as
  written. The earlier mock-up of a condition-by-condition walkthrough over the
  `lib/schema` guide format was deleted 2026-10-12 (see **Guide lookup** below).
- **Paste-first sharing** — the guide as JSON text is the canonical artifact; copy to
  clipboard, paste to import. Built before the hosted path.
- **Hosted publishing** — sign in, publish a group (one of your teams vs many
  opponents) → a short URL fit to post on X; one-click fork with `forkedFrom` and a
  new regulation; Open Graph cards with title, author, six team sprites. A published
  page is a **snapshot**: it changes only when its author re-publishes, so a posted
  link cannot shift under its readers. Viewers can fork it into their own builder
  and edit their copy; the original is immutable to everyone but its author.
- **A minimal forum** — a feed of published matchups (newest, most liked), each with
  the author's text description, likes, and a flat comment list. Signed in to post.
  Deliberately not: images, nested replies, following, or trending ranked by views.
- **Matching** — `matchOpponent(observedSpecies, matchups)`: fuzzy, IDF-weighted,
  returns top 3 with scores. The future extension's core dependency. **It has no UI
  in v1** — the page that demonstrated it is gone — but it is implemented and
  unit-tested, which is the point: the extension needs it correct, not visible.
  `lib/match` and `lib/schema` stay for that reason and are not dead code.

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
- ~~Accounts, login, or user profiles~~ — amended 2026-08-07, and again
  2026-10-11, both at the user's request. Accounts exist (Google +
  email/password via Supabase Auth) to sync private teams and matchup boards,
  and the tool stays fully usable signed out (local-first).
  Sign-up is **username + password, Showdown style** (amended 2026-10-13): no
  email field anywhere, because the built-in mailer caps confirmations at 2 an
  hour and an email path that fails on the third person is worse than no email
  path. An account is stored under a synthetic `name@xatu.invalid` address the
  user never sees. **The cost is accepted: there is no password reset** — there
  is no mailbox to send one to, exactly as on Showdown. Google sign-in keeps a
  real address and its own recovery, and is the recommended route.
  **Publishing and commenting now require signing in**, which replaces the
  earlier "anonymous publish + edit token" plan — ownership is just `user_id`
  under the same RLS the private tables use, so there are no edit tokens and no
  anonymous write endpoint to abuse.
  Public identity is **a username and nothing else**: no avatar, no bio, no
  join date, no followers. `public.profiles` holds only a username and
  timestamps, so a byline has nothing else to leak.
  A username **is derived at signup** (amended 2026-10-12, user-directed,
  matching teamsheet.gg): Google's profile name with non-alphanumerics
  stripped, or the email's local part when there is no Google name, assigned
  by a trigger in `supabase/initial-username.sql`. The cost was raised and
  accepted — a Google name is a real name, so the default byline does identify
  the person. What makes it acceptable is that renaming is one field in the
  account menu and the auto-assigned name is never the only option. The email
  itself is still never _shown_; there is no column for one.
- **Moderation tooling.** No report button, no flags, no queue — matching
  teamsheet.gg, which is the reference for this surface. Sign-in is required to
  post, authors can delete their own posts and comments, and the site owner can
  delete anything. If that stops being enough it is a decision to revisit, not
  a gap to quietly fill.
- **Quiz mode.** Dropped from the plan entirely. No `quiz` prop, no hidden-answer
  abstraction, nothing reserved for a mode we aren't building. The condition
  walkthrough that this rule used to be written against no longer exists either.
- **Guide lookup** — deleted 2026-10-12 at the user's request. Paste an opposing
  team, match it against a guide, step through the stored plan. It only ever
  searched **one hardcoded fixture guide** with two matchups, was linked from a
  single place, and was the only surface using the `lib/schema` guide format —
  which the board, publishing and the feed do not use. A reader-side lookup over
  _real_ published guides is a different feature; if it is ever wanted, build it
  against what people actually publish, not against a fixture.
- **The browser extension.** Separate project, later. But the schema, the paste format,
  and the matching function are all shared with it, so get those right.

These non-goals are the constraints most likely to be "helpfully" reverted in a later
session. They are deliberate. Do not revisit them without the user asking.

## Legal / attribution

xatu is an unaffiliated, non-commercial fan project. Pokémon is owned by Nintendo,
The Pokémon Company, Game Freak, and Creatures. This notice must appear in the UI.
