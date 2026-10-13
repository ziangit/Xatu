# Session handoff

> Updated 2026-10-12: the team chooser's panels have a **step back** to the
> New team / Use existing choice — `cancel` threw the draft away instead.
> Fourth missing-back report; the rule is now in docs/ARCHITECTURE.md.
>
> Updated 2026-10-12: the picker can **search VGCPastes by code** (`MB860`,
> `MC20`) — the id was already a column and had simply never been queried.
> Samples stay the default. Saved teams can now be **deleted** (there was no
> way at all before). Catalogue re-ingested: **1,443 teams**.
>
> Updated 2026-10-12: **guide lookup is deleted** (user's call) — it searched
> one hardcoded fixture guide and was the last surface using the `lib/schema`
> guide format. `lib/match` and `lib/schema` stay: the extension needs them.
> Six routes left.
>
> Updated 2026-10-12: **a published post can be taken down** — from the post
> itself, or with the set. Fixed on the way: re-publishing a set used to mint a
> _second_ public post. docs/ARCHITECTURE.md → **"Taking a post down"**.
>
> Updated 2026-10-12: **the builder is gone — `/demo` merged into
> `/matchups`.** They were a list and a detail view of one noun; a set now
> expands in place. Routes are `/`, `/matchups`, `/board`, `/lookup`, `/feed`,
> `/g/<slug>`, `/login`. Rules in docs/ARCHITECTURE.md → **"One page for a
> set"**. Top section, newest first.
>
> Updated 2026-10-12: the landing page **shows the three newest published
> matchups** as real cards, under the hero — the feed is what the site is for,
> and a button asked people to imagine what was behind it. Card markup is now
> shared with `/feed` (`app/feed/post-card.tsx`) so the two cannot drift.
>
> Updated 2026-10-12: **accounts get a username at signup** (Google's profile
> name, or the email's local part), and **posting is capped** — 5 new posts and
> 30 comments per account per day, enforced by a Postgres trigger the client
> cannot go around. Registration still has no per-IP cap and cannot have one
> from here; see docs/ARCHITECTURE.md → **"Abuse limits"**. Top section,
> newest first.
>
> Updated 2026-10-12: **switching language no longer moves the page.** The
> landing hero was 364px tall in 日 and 228px in 中, so the toggle shifted the
> tree and every section under it. Fixed by reserving the tallest language's
> height — rules in docs/ARCHITECTURE.md → **"Reserving height so the toggle
> doesn't move the page"**. Top section, newest first.
>
> Updated 2026-10-11: sharing is **finished** — a feed (`/feed`), an **Open
> Graph card** so a `/g/<slug>` link unfurls on X with its title, byline and six
> sprites, and **fork**, which copies a published guide into your own builder
> without touching your existing plans. Found and fixed on the way: the reader
> **flattened branch trees**, so two alternates of turn 0 read as if one
> followed the other. Rules in docs/ARCHITECTURE.md → **"Sharing: publish, read,
> fork"**. Top section, newest first.
>
> Updated 2026-10-11: the free-tier Supabase project was **deleted** after ~4
> weeks idle (not paused — an absent project is gone). Rebuilt as
> `hcbhzgkuzlxcdpbzarkf` in **ziangit's Org (Pro)**, +$10/m, which does not
> auto-pause. Schema, 1,295 catalogue rows and both Vercel env vars are restored
> and verified. Google auth is rebuilt too, on a new GCP project
> (`xatu-511402`, client `61459340118-…`) and configured via the Management API.
> Top section, newest first.
>
> Updated 2026-09-10: **Regulation M-C** is live on Showdown and xatu knows it —
> `FORMATS` leads with it, and the catalogue has its 68 teams. A runbook for the
> next rotation is in docs/ARCHITECTURE.md → **"Regulation rotation"**. One real
> bug found and fixed on the way: the eight sample teams were pinned to
> `FORMATS[0]`, so they would have silently relabelled themselves M-C.
> **Seeded: the catalogue now holds 780 teams** (66 M-C, 709 M-B, 5 M-A), and the
> built-in sample teams now cover **both regulations** — eleven M-C (temporary,
> first-weekend tournament teams) and the eight M-B, behind a `M-C · M-B · all`
> tab row on the samples divider.
> `SUPABASE_CONNECT_STRING` had to move to the Session Pooler — the direct host
> is IPv6-only now. Top section, newest first.
>
> Updated 2026-08-16: the interface **also speaks Japanese** — same mechanism,
> a third cell in the toggle (`EN·中·日`). Adding a language is now a dictionary
> plus four one-line edits the type checker points at. Japanese needed one thing
> Chinese did not: its **own font stack**, or every kanji renders in Chinese
> letterforms. Top section, newest first.
>
> Updated 2026-08-15: the whole interface **speaks Chinese**, behind an `EN·中`
> toggle in every header. The locale is a cookie read on the server, so the
> first paint is already in the right language — no flash, no reflow. Pokémon
> data and every persisted name stay English, deliberately and with tests.
> Top section, newest first.
>
> Updated 2026-08-14: importing someone else's shared group **no longer
> overwrites your own plans**. Team identity is now roster _plus_ provenance,
> documents carry the id of the group they came from, a re-paste that changes
> nothing says so and writes nothing, and `/matchups` gained per-row matchup
> ids, `delete set`, and a highlight on whatever the last paste landed in. Top
> section, newest first.
>
> Updated 2026-08-13: a **species type-ahead** (type "pika", get Pikachu with a
> sprite) so a team can be built without a paste, a read-only **"does this look
> like a known team?"** lookup over the 712-team catalogue once four species are
> named, and the **sample teams** are now the user's own eight. Sections below,
> newest first.
>
> Updated 2026-08-12. That session: the **VGCPastes catalogue** (712 Champions
> M-B teams, ingested _and live in Supabase_), **roster identity/partial-match
> groundwork**, one copy/paste format for
> one-vs-one _and_ one-vs-many, a real `← back` on every page, and `/matchups`
> no longer flashing a partial list. Sections below, newest first.
>
> Still true from before: one team vs. many opposing teams is built (2026-08-08),
> accounts are live, and the site is deployed to production. **The Supabase
> URL-config item is DONE** (user, 2026-08-13) — ignore the older section that
> still calls it open.

## 2026-10-12: the landing hero was showing an illegal play

User, of the hero turn-tree: _"did you change this image? excadrill is using
highhorse power on aerodactyl, and milotic did nothing on the second part"_.

**Not changed by this session** — `git log -S` puts the moves in `f6b7595`
(the original landing page, 2026-08-07), with the only later touch being the
2026-08-15 translation pass, which changed labels. But the report was right,
and there were **three** errors, all checked against `@pkmn/dex` rather than
from memory:

| was                                    | problem                                                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Excadrill High Horsepower → Aerodactyl | Ground vs Rock/**Flying** is **0x**. The play does nothing.                                                                                                 |
| Gholdengo Make It Rain → Charizard     | Make It Rain is `allAdjacentFoes`; the board never offers a target for a spread move, so the arrow contradicted the product. 0.5x into Fire/Flying as well. |
| Milotic, no move                       | Standing idle while its partner acted.                                                                                                                      |

Now: High Horsepower → **Kingambit** (Dark/Steel, 2x), Make It Rain with **no
arrow** (correct as a spread: 0.5x Charizard, 2x Sylveon), and Milotic on
**Icy Wind** — the speed control it is actually brought for, which is also the
thing turn-one planning is about. All four moves confirmed learnable in gen 9.
The chips also stopped hardcoding type hexes and read `TYPE_COLORS` now, so a
chip can no longer drift from the board's palette.

**No test guards this, deliberately.** Catching the type error would mean
computing effectiveness, which is the first hard constraint in CLAUDE.md. And
that is the honest situation: xatu never verifies a numeric or type claim for
its authors either — "faithfully display what the author wrote" is the whole
boundary. The hero is editorial content and needs an eye, not a check. Worth
remembering that the audience is competitive players who spot a 0x play
instantly, so the marketing surface has to be as correct as a real guide.

## 2026-10-12: a panel needs a step back, not just an exit

User, on the import panel inside a new set: _"here should be a back button to
choose from new or existing"_. Right — `cancel` there ran the chooser's
`onCancel`, which throws the whole draft away, so opening the import panel was a
one-way door. **Fourth** time a missing way back has been reported.

- Both non-initial modes (import, existing list) now carry a control back to the
  choice box. Where nothing is behind it (`startOn: "import"`), backing out is
  still cancelling and says so.
- **It names its destination — `← back to options`, not `← back`.** My first cut
  used `← back` and the browser check caught it hitting the _page's_ BackLink
  instead: `/matchups` already renders `← back` in its action row. That is the
  collision docs/ARCHITECTURE.md's navigation rule exists to prevent, and I had
  reintroduced it. Verified after: one `← back` on the page, panels say
  something else.
- `ImportPanel` took a `cancelLabel` prop rather than growing a second button —
  the control was already there, only its meaning changed.

Verified in a browser, including the screenshot's exact spot: from a draft set's
opponents import, back returns to New team / Use existing, stays on `/matchups`,
and the draft set survives.

## 2026-10-12: VGCPastes search, and deleting a saved team

User: delete _"Hard Trick Room team"_, and _"I want user able to search like
'MB860', 'MC20' for teams from vgcpastes … but to prevent too many teams,
default only show the sample teams. Is this hard to achieve?"_

**Not hard — the id was already in the table.** `community_teams.source_team_id`
has carried the sheet's code since the first ingest and had never been queried,
so this was an index, a query and a search box. Rules in docs/ARCHITECTURE.md →
**"Reaching the catalogue"**.

**"Hard Trick Room team" is not in the app and has not been since 2026-08-13.**
`git log -S` puts it in `780eafb` as a shipped demo team, removed in `02a4115`
when the samples became the user's own eight. It survives in _their browser_,
because picking a team copies it into the library — and **nothing could delete a
saved team**. `forgetTeams` existed but only ran when a matchup was deleted, so
a team no board referenced sat in the list forever. That was the real bug; the
picker's rows now carry a ✕, and `forgetTeams`' refusal (while a board or the
in-progress setup still names the team) is now unit-tested, since it went from
an internal tidy-up to a user-facing delete.

**The re-ingest trap, worth knowing before the next rotation**: `ingest.mjs`
caches each tab's CSV and will re-run against a stale copy without saying so —
my first run reported the same 712 M-B teams from August while the sheet held 861. **`--refresh-sheet`** is the flag. The paste cache is separate and worth
keeping; only the sheet goes stale.

Catalogue now **1,443 teams** (564 M-C, 874 M-B, 5 M-A). 874 exceeds the 860
the ingest kept because a re-seed upserts on `paste_url`, so 19 teams since
removed from the sheet survive — real teams, codes not reused, no ambiguity
(checked: zero duplicate codes).

Verified in a browser: the box is empty by default and only samples show; typing
`MB860` returns _"cona's Worlds 2026 Runner Up Team"_, `MC20` returns
_"WyatVGC's Salamence Kingambit Team"_, a nonsense code says so, and picking
`MB861` saves _"Takuma Yamazaki's Worlds 2026 Champion Team"_ with six Pokémon.
A stale team is removable in place; a team a board still uses survives.

## 2026-10-12: guide lookup, deleted

User asked what it did, then: _"we can delete this feature"_.

What it was: paste an opposing team, `matchOpponent` ranks it against a guide's
matchups, `selectPlan` picks the plan, turn toggles reveal the author's calls.
What it actually searched: **one hardcoded fixture** (`demoGuide`, built from
`lib/schema/fixtures/yoshimap-sand-staraptor`) with **two** matchups. Not your
sets, not published posts, not the feed. 535 lines, linked from one place, and
the only surface still using the **`lib/schema` guide format** — which the
board, publishing and the feed do not use, a divergence open since 2026-08-06.

Gone with it: the page, the landing link, `demoGuide` / `demoRulesByPlan` in
`demo-data.ts`, and **39 dictionary entries per language** (302 each now).

**Kept, deliberately:** `lib/match/matchOpponent`, `lib/schema`, and the
yoshimap fixture. PRODUCT.md calls matching the extension's core dependency and
says to get it right; three test files use the fixture. The library is not dead
code, it is code with no UI — PRODUCT.md now says so in those words rather than
the old "barely used in v1", which stopped being true.

Routes are now **`/`, `/matchups`, `/board`, `/feed`, `/g/<slug>`, `/login`**.

If a reader-side lookup is ever wanted, build it against **real published
guides**, not a fixture. That is a different feature and worth doing properly.

## 2026-10-12: unpublish, and one post per set

User: _"Can I delete my published match up?"_ **No** — the RLS policy existed
(`published groups are author-deletable`) but had never been given a caller.
Checking turned up a worse, quieter bug beside it.

**Re-publishing a set made a second post.** `publishGroup` takes an
`existingSlug` parameter and nothing ever passed one, so every publish minted a
fresh slug — while the panel said "Publish again to update it" and PRODUCT.md
called a published page a snapshot. Only one row existed live, so it had not
bitten yet. Same root cause as the missing delete: nothing recorded where a set
had been published. Fixed with `published_groups.team_id` + a partial unique
index; rules in docs/ARCHITECTURE.md → **"Taking a post down"**.

- **Two delete paths, deliberately.** On the post (`AuthorControls`) the
  question is just "is this mine", which works for **every** post — including
  the one published before `team_id` existed. On `/matchups` the group header
  shows a `public ↗` chip, the publish panel offers `unpublish`, and
  `delete set` now takes the public copy with it and says so in the
  confirmation.
- **`adoptLegacyPost`** stops the one pre-existing post being orphaned: a
  publish with no `team_id` match adopts a single unstamped post of mine with
  the same team name. Requires _exactly one_ match, so same-named sets cannot
  swap pages.
- **Judge a delete by rows, not status** — verified live: a stranger's DELETE
  and an anonymous DELETE each return **204 having changed nothing**, because
  RLS filters first. `unpublishGroup` asks for the row back and treats empty as
  failure. (The 2026-08-12 catalogue note warned about exactly this.)

Verified against the live database with throwaway accounts: second publish of
the same set is refused by the index (23505), a _different_ set is still its own
post, stranger and anonymous deletes change nothing, the author's delete returns
the row, and a legacy post with no `team_id` is still removable. Then in a
browser: signed out there is **no** unpublish control; signed in as the author
it appears, confirms in place (no dialog), and lands on `/feed` with the row
gone. The user's own post was never touched.

## 2026-10-12: first principles — the builder merged into /matchups

User: _"Let us work on the 'first principal' to simplify the project. First
tell me what is the diff btw 'match up' and 'builder', can we merge them?"_
then _"Work on it, use your choice"_.

**They were one noun split across two pages.** A group is every `SavedMatchup`
sharing `setup.my.id`; `/demo` edited one, `/matchups` listed them all. The
evidence was in the code, not in taste: a duplicated grouping rule with a
comment saying so, a second weaker group list on `/demo` whose own link read
_"all matchups (incl. account) →"_, three query intents that existed only for
one page to drive the other, and `＋ add teams` navigating away to edit what
you were already looking at. Full write-up in docs/ARCHITECTURE.md → **"One
page for a set"**.

- **The board stayed separate.** Planning turns is a different activity from
  composing rosters. That split is real; the other one was not.
- **`/demo` is gone**; `/demo/sim` → **`/board`**, `/demo/lookup` → **`/lookup`**.
  The modules under `app/demo/` stayed — library code, not routes, and moving
  50 import paths is churn with no user-visible payoff.
- **One intent survives**: `/matchups?team=<id>` opens that group's add panel,
  for the board's `+ add opponent`. That is a deep link to a place on a page,
  not a control protocol between two halves of one screen.
- **`app/demo/team-picker.tsx`** is now the single team-choosing flow; the
  builder had two near-copies differing only by `multi`.
- **A set with no opponents has no storage representation** (a group is derived
  from its rows), so the picked-but-empty state is React-only and drawn in the
  same shape. If that team already heads a group there is no draft — its add
  panel opens instead, so a team can never appear twice.
- **Two landing buttons became one.** "Try New Match Ups!" and "My matchups"
  were the new-vs-existing split of one page; after the merge they pointed at
  the same URL, which is the confusion they were added to solve. Same for the
  nav: `builder` and `matchups` were two labels for one destination.

Net **1,502 → 1,204 lines**, one route gone, and **34 dictionary entries**
removed after checking each against the whole live tree (the first pass at that
used a regex that orphaned wrapped values and broke both dictionaries — revert
and redo; an entry ends at the first line closing with a comma, not at the
first newline).

Verified by clicking, not by reading: from an empty browser, `＋ New matchup` →
pick a sample → paste two opposing teams → 2 rows written and the group listed
with both unplanned; `＋ add teams` adds a third **without leaving the page**;
renaming the team from the group header propagates into every stored board;
a row opens `/board`; the board's `+ add opponent` returns to
`/matchups?team=…` with the panel already open; publish, copy JSON and
`delete set` still work; `/demo`, `/demo/sim` and `/demo/lookup` all 404.
Console clean throughout. 213 tests, tsc / eslint / build green.

**Not done, deliberately**: `app/demo/*` module paths, and deleting `/lookup`
— it is a leftover demo of `matchOpponent` that only the landing page links to,
but removing a user-facing page is a product call, not a simplification.

## 2026-10-12: the feed, on the landing page

User: _"Also show 'Published Match Ups' under 'guide lookup' and the line, it
is the core feature so user should see it at first glance"_ — with a screenshot
of teamsheet.gg's "Featured · HAND-PICKED REPORTS" row as the reference.

- **`PostCard` is extracted to `app/feed/post-card.tsx`** and used by both
  `/feed` (a one-column list) and the strip (a three-column row), so they
  cannot drift — the `ExistingTeamList` / `BoardView` precedent. It carries
  `h-full` and pushes its sprite row down with `mt-auto`, which squares up a
  grid row and does nothing in a list, so **no variant prop was needed**.
- **Exactly three, then `see all →`.** A landing page that keeps scrolling
  buries everything under it; this is a shortcut into the feed, not the feed.
- **It renders nothing when Supabase is unconfigured** —
  `supabaseConfigured()` answers synchronously, so the local-first build has no
  hole where the strip would be, and no shift.
- **The grid reserves `md:min-h-[12.5rem]`, and that number earns its keep
  twice**: the fetch lands after first paint, _and_ the card's byline wraps to
  two lines in English and Japanese but one in Chinese (195 / 180 / 197px),
  which would otherwise have reintroduced the drift fixed earlier the same day.
  Re-measured after: all four sections identical in all three languages.
  It cannot cover everything — a card is mostly somebody's title and
  description, and that is author content, not chrome.
- **A dashed "Publish yours →" tile fills the gap while fewer than three posts
  exist.** With one real post the row was two-thirds empty and read as a
  failed load. It is `md:flex`, so it never appears on a phone, where the grid
  is one column and there is no gap to fill.

## 2026-10-12: usernames at signup, and daily caps

User asked three things: does register check the name is taken, can email
signup get a default name like teamsheet.gg does, and can we rate-limit by IP.

**Taken names were already handled** — a unique index on `lower(username)`, so
"Phalap" and "phalap" cannot both exist, and `saveMyUsername` turns `23505`
into "taken". Decided by the database rather than a pre-flight SELECT, which
two people typing at once would both pass.

**The default name: teamsheet.gg reads it from Google, not from the email.**
The user sent its consent screen — "Name and profile picture" — so the name
they saw was Google's `name`, i.e. their real name. We already request the same
scopes, so the field was sitting there unused.

I raised the cost twice and the user confirmed twice by showing the behaviour
they wanted, including its rename screen. **So this is now user-directed and
PRODUCT.md is amended**: the old "a username is never derived from the email
address" rule is gone. `supabase/initial-username.sql` assigns one in a trigger
on `auth.users` — Google's name with non-alphanumerics stripped, else the
email's local part — because a trigger runs once inside the signup transaction
next to the unique index, while a client-side "if no username, make one" races
across two tabs and never runs for someone who signs up and never returns.
**The email itself is still never shown; `profiles` has no column for one.**

Verified against the live database, every branch: `Ziang Sun` → `ZiangSun`, a
second one → `ZiangSun2`, an email local part straight through, `Admin` →
`trainer-0c286a` (the reserved list is mirrored in the SQL, or Google's "Admin"
would have been handed it), `Jo` and an emoji-only name → the same fallback, a
42-character name truncated to 20. Throwaway accounts deleted afterwards and
`profiles` was back to one row.

**The trigger swallows its own errors on purpose.** A username is a
convenience; signing up is not. Anything unexpected and the account is created
without one, and the account menu prompts exactly as before.

**Caps: 5 posts and 30 comments per account per 24h**, in a trigger, counting
an append-only `rate_events` log rather than surviving rows — otherwise
post-five-delete-five-post-five defeats it. Rules and the table in
docs/ARCHITECTURE.md → **"Abuse limits"**.

**The IP cap the user asked for cannot be built from here**, and the doc says so
so nobody re-litigates it: signup never touches our server or database. The
lever is CAPTCHA, which needs a key from the user and was offered. Also found:
`rate_limit_email_sent` is **2 per hour project-wide** on Supabase's built-in
SMTP — a hard ceiling on real signups that needs a mail provider before launch.

## 2026-10-12: the language toggle moved the page

User, with two screenshots of the landing page in EN and 中: _"one thing is when
you change language, the layout changed. Anyway to fix it?"_

Measured at 1440px before touching anything — the hero section was **484px in
en, 452 in 中, 508 in 日**, from three independent causes: the headline is two
lines in en/ja and one in 中 (63px), the paragraph three lines vs two (22px),
and the CTA row wraps differently in all three (40 / 68 / 90). The tree also
slid sideways 924 → 953 → 929, because the text column is a content-sized flex
child and 中 sets narrower.

Fixed by reserving the tallest language; the rules and the numbers are in
docs/ARCHITECTURE.md → **"Reserving height so the toggle doesn't move the
page"**. The part worth remembering:

- **Where the slack goes decides whether it looks fixed or broken.** The first
  cut reserved two lines on the `h1` as well, which measured perfectly and
  looked wrong — 中 fits on one line, and a 63px hole under a 60px headline
  reads as a bug. Dropping that reserve and letting the column's `min-h` absorb
  it puts the slack _below the buttons_, where it is just section padding.
  Judge this kind of change from a screenshot, not from the numbers.
- English is deliberately unchanged: the pinned width (`lg:w-[31.25rem]`) is
  what English already measured, so the other two come to it.
- `lg:` only — on a phone nothing sits beside the text and reserved height
  would be dead scroll.

Verified by toggling in a real browser at 1440px and 1100px: tree, both section
dividers and total document height byte-identical across all three. Other pages
drift 0–38px and were left alone on purpose — they flow top to bottom, so a
longer paragraph moves only what follows it.

## 2026-10-11: the share card, and fork

The two pieces of the sharing spec that were still missing. 211 tests, tsc /
eslint / `next build` green.

**The Open Graph card.** A `/g/<slug>` link is meant to be posted on X, and X
runs no JavaScript — so none of what the client component rendered was visible
to it. `app/g/[slug]/page.tsx` is now a **server** component with
`generateMetadata`, rendering the old body as `view.tsx`. Three things that
followed, all written up in docs/ARCHITECTURE.md → **"Sharing: publish, read,
fork"**:

- `publish.ts` is `"use client"`, so the slug helpers moved to
  `app/demo/slug.ts` (re-exported, no importer changed — the `formats.ts`
  precedent) and the server reads via `app/g/published-meta.ts`, a plain
  PostgREST fetch against `feed_posts`. It selects **no `document`** — a card
  never needs the plan, and that column is the big one.
- **`SITE_URL` is stated, not inferred** (`app/site.ts`). Next falls back to
  `VERCEL_URL`, which on Vercel is the _deployment-specific_ host — a new
  hostname on every push, while X caches the card and re-fetches it later.
- **Sprites are the individual PNGs, fetched and inlined as data URLs.** The
  icon sheet is positioned by `background-position`, which the renderer behind
  `ImageResponse` doesn't do; and `ImageResponse` streams, so a remote image
  that 404s fails _after_ the response has started — which is no card at all,
  not a card without sprites. My first cut wrapped `new ImageResponse(...)` in
  a try/catch, which cannot work for exactly that reason.

**Fork is a paste whose clipboard happens to be a published row.** `ForkButton`
calls `applyGroupImport` — the one write path a document may land through — so
it inherits the "an import adds, it never overwrites work that isn't the
document's own" rule for free. The only addition is the document id: a
published document has no `g` stamp, so the fork stamps **`pub:<slug>`** rather
than falling back to roster-plus-name. That makes re-forking a page update one
set instead of forking two, and stops two authors who publish the same
archetype under the same name from colliding. 3 new tests.

Verified in a browser, twice. From an empty browser: fork writes 2 matchups and
3 teams stamped `pub:h8tpybyd`, lands on `/demo?team=<id>` with the team and
both opponents loaded, and forking the same page again writes nothing. Then
with my own plan already present for the same six species: **my plan survives,
my team keeps its name**, the fork is a separate team with `keptApart: true`,
and `/matchups` shows both groups with one `IMPORTED` badge. Card checked by
rendering it — 1200×630, title, `by testaccount · 2 opposing teams · VGC 2026
Reg M-B`, six sprites.

**Phase 3 is the finished product and this was the last of it.** Nothing is
queued. Older parked items, if they ever come up: a static catalogue (78KB
gzipped), carrying movesets in documents (3x raw / 1.8x compressed), and
re-ingesting M-B (the tab has grown 712 → 861).

## 2026-10-11: the feed — a minimal forum, and branches that read as branches

User: _"here I cannot see the published match ups"_. Publishing worked and the
short link worked; there was simply **no feed** — the only way to a post was
its URL. Built the forum, deliberately minimal to the user's spec (_"no media,
no replies inside replies features, but user can add text description before
the match ups"_). 208 tests, tsc / eslint / `next build` green.

- **`supabase/forum.sql`** (applied live) — `post_likes` with PK
  `(slug, user_id)`, so a second like is a **23505, not a duplicate row**, and
  `post_comments`. `post_comments` has **no UPDATE policy at all**: comments
  can be written and deleted but never edited, which is a property of the
  schema rather than a rule the UI remembers to apply.
- **`feed_posts`** is a view with `security_invoker = on` — it joins
  `published_groups` to `profiles` for the byline and sub-selects the two
  counts. `security_invoker` matters: without it the view would run as its
  owner and quietly bypass the RLS on its base tables. An earlier draft made it
  `security definer` to stop slug enumeration; **reverted, because a feed's
  whole job is to enumerate.**
- **Only a username is ever selected.** `profiles` has no email column to leak
  (see 2026-10-11 "Public identity"), and the view names `pr.username` alone.
  Verified by reading the wire: the feed response contains no `@`.
- `app/demo/forum.ts` (queries), `app/feed/page.tsx` (Newest / Most liked
  tabs), `app/g/discussion.tsx` (likes + flat comments on the reader).
- **The feed's loading flag is `loadedSort !== sort`**, not a `setLoading(true)`
  in an effect — setting state synchronously in an effect is a lint error here
  and the second time this session I wrote it. Derive the flag from what has
  actually loaded.
- Verified writes through **real RLS with two throwaway users**, not as the
  service role: like ok, duplicate like 23505, liking as the wrong user 42501,
  cross-user delete refused, comment UPDATE refused, counts correct, own delete
  ok, then both users deleted and the counts went back to zero.

**The reader was misrepresenting branches, and that is the part worth
remembering.** A screenshot of the user's own post showed two cards both
reading "TURN 0 · TEAM PREVIEW". Their boards contain **alternates** — two
roots with `parentId: null` — and `BoardView` laid every node out in one row
with carets between them, so siblings read as a _sequence_: do this, then this.
That is not a cosmetic bug; it says something false about the plan.

- Cause: the tree layout lived **inside `app/demo/sim/page.tsx`**, so the
  reader could not share it and grew its own flat version. `layoutRows` and
  `isAlternate` now live in **`app/demo/board.ts`** (pure, with the rest of the
  board rules) and the editor and the reader both place cards on the same
  CSS grid — `gridColumn: node.turn`, `gridRow` from `layoutRows`. A branch
  steps **down**; it cannot be read as the next turn.
- 5 new tests in `app/demo/__tests__/board.test.ts`. **The rule: anything that
  decides what the board means belongs in `board.ts`, not in the page** — the
  reader is a second renderer and will diverge silently otherwise.
- Verified in a browser against the user's real published document: board 1
  places cards at `1/2 → 2/2 → 3/2` plus its alternate at `1/3` (y 397 vs 562,
  a visibly separate row), board 2 at `1/2 → 2/2` plus `1/3`, two
  `⑂ alternate turn 0` labels, console clean.

## 2026-10-11: publish a group, read it at a short link

First half of sharing. `supabase/published.sql` + `app/demo/publish.ts` +
`/g/[slug]`. Sign-in required, per the PRODUCT.md amendment the same day.

- **A published row is a snapshot.** `document` is the exact `encodeGroup`
  string at publish time, stored as **text not jsonb** so no key reordering or
  number normalisation can touch it. Re-publishing overwrites the same slug; a
  link already posted never changes under its readers until the author says so.
- **SELECT is public, and that is a reversal.** The earlier design called for
  reads through a `security definer` function taking the slug, to stop anyone
  enumerating shared plans. The forum inverts that requirement — a feed exists
  to enumerate — so the policy is simply `using (true)`. Insert/update/delete
  stay author-only. Verified: a signed-out visitor reads it, and a PATCH as anon
  touches 0 rows.
- **Slugs** are 8 characters from a 28-letter alphabet **with no vowels**, so a
  random slug cannot spell something unfortunate in someone's tournament post.
  Generated client-side and retried on `23505`, because the primary key is the
  only arbiter. Shape is duplicated as a CHECK constraint and a test asserts the
  two regexes are identical.
- **The reader is a separate renderer** (`app/g/board-view.tsx`), not a
  `readOnly` flag on the sim page's `SideBoard` — that component takes eleven
  callbacks, and threading "none of these" through all of them would make the
  editor worse to serve the reader. Nothing in the reader has a handler, which
  is what makes read-only structural: there is nothing to forget to disable.
  Confirmed in a browser: 0 inputs on the page.
- **It does not draw the SVG edges.** Those are measured from laid-out cards at
  runtime; a public page that must survive a phone is the wrong place for it.
  Turns read left to right with a caret.

**Two traps worth knowing before touching the wire format.** Hand-authoring a
`v3` document for a test is a waste of time — the side-state string is
`front|back|fainted|moves`, so a three-group form silently puts moves in the
`fainted` slot, and `parentIdx` did not behave as guessed. Generate test
documents with `encodeGroup` instead. And **stored turns start at 1 while the
board displays them one lower** — the first card is `turn === 1` shown as
"turn 0 · team preview". The reader had this wrong until it was checked against
a real document.

**Not done yet**: the OG card (most of the value of a link on X), fork, likes,
comments, the feed.

## 2026-10-11: the Supabase project was deleted, and rebuilt

After ~4 weeks idle the free-tier project **`twvwwxhbqsjplduujfcz` was deleted**,
not merely paused. Symptom: NXDOMAIN on the API host and an empty project list in
the `xatu` org. Rebuilt from scratch; everything needed was in the repo or the
local cache, so nothing was lost but the auth account and any cloud-only matchup.

**New project**: ref `hcbhzgkuzlxcdpbzarkf`, name `xatu`, in **ziangit's Org
(Pro)** `qhmynvilacqntnfrlbrr`, region `ca-central-1`.

Four facts worth keeping, each of which cost time to learn:

- **A paused project still appears in listings** (`Porygon` shows `INACTIVE`).
  An _absent_ project is deleted. Don't read NXDOMAIN as "paused".
- **The free-tier cap is per person, across every org you own** — 2 _active_
  free projects. Paused ones don't count, so deleting the paused `Porygon`
  would have freed nothing. The two slots were `Champscope` and
  `ziangit's Project`.
- **The CLI could see every org all along.** An earlier note here claimed it was
  logged into a different account; that was wrong. `supabase orgs list` returns
  all five. `projects list` just never showed `xatu` because that org was empty.
- **Pro bills compute per project** — a third Micro is +$10/m on top of the
  existing $10. That is what this rebuild costs, and it buys a backend that does
  not auto-pause.

**Pooler host is `aws-1-ca-central-1`, not `aws-0`** as the old project was. The
prefix does not follow from the region — probe it (connect with the real
credentials; the wrong prefix answers "Tenant or user not found").

Done, all verified: schema applied (3 tables, 9 indexes, RLS on all three, 3
policies); catalogue reseeded to **1,295 teams — 564 M-C, 726 M-B, 5 M-A** (M-C
refreshed 68 → 564 from VGCPastes, every row round-trip-validated); `.env.local`
rewritten; **both Vercel env vars replaced for Production and Preview**. Checked
live: anon read returns 1,295, the picker's containment query returns real M-C
teams, anon insert into `matchups` is refused with `42501`, and the lookup works
end to end in a browser with a clean console.

**Auth is back too** (same day). The old Google Cloud project could not be
found, so a new one was made: GCP project **`xatu-511402`**, new OAuth web
client **`61459340118-…apps.googleusercontent.com`** — the `5038415161-…` id in
the older note below belongs to the lost project and is dead.

Configured through the **Management API**, not `supabase config push`:
`config.toml` here is the untouched local-dev scaffold with
`site_url = "http://127.0.0.1:3000"`, so pushing it would have pointed
production auth at localhost. A `PATCH /v1/projects/<ref>/config/auth` with just
`site_url`, `uri_allow_list`, `external_google_enabled|client_id|secret` is
surgical and leaves everything else alone. The CLI's personal access token lives
in the macOS keychain under service **`Supabase CLI`**
(`security find-generic-password -s "Supabase CLI" -w`).

Live settings now: site URL `https://xatu-six.vercel.app`, allow list
`https://xatu-six.vercel.app/**,http://localhost:7317/**`, Google enabled.

Verified: `/auth/v1/authorize?provider=google` redirects to Google with the new
client id and the new callback; Google serves its sign-in page with no
`redirect_uri_mismatch`, no "Access blocked", no verification warning; and the
"Continue with Google" button reaches `accounts.google.com` from **both**
localhost and production. _Not_ verified — completing a real sign-in and
round-tripping a matchup to the account needs the user's own Google credentials.

`CLIENT_ID` / `CLIENT_SECRET` are in `.env.local` for the record; nothing in the
app reads them, they were only needed for that one PATCH.

## 2026-10-11: sharing design, discussed not built

User wants a share feature: a player posts a tournament result on X with a
**short link** to their one-team-vs-many plan, and viewers can **read but not
edit**. That requirement settles several things that had been left open.

- **Fragment links are out.** Measured: one team vs 6 opponents _with_ movesets
  is 2,614 URL chars; vs 10 is 3,847, against a ~2,000 practical ceiling. The
  exact case the feature is for is the case fragments cannot carry. Hosted short
  links are the only fit.
- **Documents must carry movesets**, kept _out_ of the `encodeGroup`
  fingerprint. Today a shared plan opens with every move picker reading "no
  moves in this import", which makes a shared plan close to useless. Hosting
  removes the size pressure entirely, so this becomes free for shared links.
- **Read-only should be structural, not a permission check**: publish a
  _snapshot_ (so a posted link cannot change under its readers), open a reader
  page rather than the board, block writes with owner-only RLS, and serve reads
  through a `security definer` function taking the slug — otherwise anon can
  enumerate every shared plan through PostgREST. No service-role key needed.
- **The OG card is most of the value on X** — team name, author, six sprites.
  Already specified in PRODUCT.md. Shipping without it will look like the
  feature failed when the problem is presentation.
- **This is the real argument for a paid tier.** A public link must not 404; a
  free project that auto-pauses after a week is disqualifying for a link someone
  posted next to a tournament result.

Three decisions still open: sign-in-to-publish vs PRODUCT.md's anonymous +
edit-token (accounts now exist, which would delete both the token machinery and
the abuse surface); whether a viewer can fork into their own matchups; and
whether the reader renders the board tree read-only or compiles to the guide
schema's accordion — the two formats are still unreconciled.

**Also considered, not done**: moving the catalogue out of the database into a
static file. It is read-only reference data; the lean payload the lookup
actually selects is **78 KB gzipped for all 1,295 teams**. Cheaper, faster, and
cannot evaporate. Deferred only because the rebuild restores what already works;
still worth doing.

## 2026-09-15: the board still opened with the old team

Re-importing My Team under a new name showed the new team in the builder, but
"Open board" opened the board under the **old** name with the **old** sets.

The storage layer was right; the page was stale. `rememberTeam(authoritative)`
rewrites every saved board via `syncTeamIntoBoards`, but the builder keeps those
boards in React state (`library`) and `openBoard` does `saveSetup(board.setup)`
— so it wrote its pre-import snapshot straight back over the setup the import
had just corrected. `addOpponents` and `renameAndRefresh` already re-read the
library; the My Team pick path did not. One line.

**The rule, now in docs/ARCHITECTURE.md → "Which copy of a team wins": whatever
writes storage must re-read it.** Anything that touches `syncTeamIntoBoards` has
to refresh `library`, because `openBoard` will happily undo it otherwise.

No unit test — this is React state, not storage, and the suite has no DOM
environment. Verified in a browser by reverting the line: the board goes back to
"Y Sand" and loses the edited move, then recovers both.

## 2026-09-13: landing copy, a fresh-start flow, and a calc link

Three small user-requested changes.

- **Landing CTA is now "Try New Match Ups!"** (was "Open the matchup builder");
  "My matchups" deliberately unchanged, since the two buttons are exactly the
  new-vs-existing split that was reading as confusing.
- **That CTA goes to `/demo?new=1` and lands on the import panel**, skipping the
  New team / Use existing choice box — from empty, that box only ever leads to
  import anyway. Note the intent is read in an effect (localStorage is
  browser-only), so it arrives _after_ `MyTeamSlot` has picked its initial mode;
  a `key` remounts the slot when it resolves. Without that the panel stays shut
  and the change looks like it did nothing.
- **The board links out to the Showdown damage calculator**, as a bordered
  button beside `+ add opponent`. It shipped first as a hairline link on the
  "how the board works" row and the user could not see it — worth remembering
  that the reference row is genuinely invisible for anything people need to
  find. It still stays out of the right-hand button row, which acts on the
  board. Rationale and the measurements from the reverted embed are in
  docs/ARCHITECTURE.md → **"The damage-calculator link"**.

## 2026-09-13: edited teams stuck, and naming opponents

Two bugs the user hit on production.

**1. Re-importing an edited team kept the old sets.** Changing Rillaboom's
`High Horsepower` to `Superpower` and re-importing left the old move in place;
deleting the team first didn't help either. Two causes, both now fixed and
tested (`app/demo/__tests__/storage.test.ts`, the first storage test in the
suite — it stubs `window.localStorage` with a Map):

- `rememberTeam` decided which copy survived by **export length**, so the
  shorter edit lost to the longer stored copy. The caller now says whether the
  team is authoritative — a paste is, a shared document is not (its teams are
  bare rosters and must never overwrite real sets). Rules in
  docs/ARCHITECTURE.md → **"Which copy of a team wins"**.
- Deleting didn't help because `knownTeams()` is the saved teams **plus every
  team a saved board references** — a board kept handing the old one back. And
  because a board stores its own copy, fixing the library alone left every
  existing board stale; `syncTeamIntoBoards` now propagates an authoritative
  team into boards and the in-progress setup. Plans are deliberately untouched:
  a recorded move is what you intended that turn.

**2. Opposing teams could not be named.** The import panel hid the name field
whenever it was in multi mode, and the opponents panel is always multi (you can
paste several at once) — so a single opponent silently got the paste header or
`teamLabel()` ("Incineroar + Rillaboom"). The field now always shows; the typed
name applies when the paste yields exactly one team, and several teams each keep
their own. Plus **rename after the fact**, via a new `InlineRename` in
`app/ui.tsx` (Enter commits, blur commits, Escape reverts — no `window.prompt`,
same rule as `InlineConfirm`): on each opponent row, and inside the expanded My
Team card. `renameTeam` propagates everywhere the name is shown.

189 tests (8 new). Verified in a browser: re-importing a shorter move sticks and
does not fork the team; naming an opponent on import works; renaming from the
row and from the card updates the library, the board and the setup together.

**Still open from the design discussion** (2026-09-11, no code written): whether
documents should carry verbatim pastes so shared boards keep their sets — with
sets kept _out_ of the `encodeGroup` fingerprint — plus a dex learnset fallback
for genuinely set-less teams, and fragment-based share links before hosted ones.
Measured there: pastes cost 3x raw but only 1.8x compressed, and move ids save
only 4% over move names so an index table is not worth its version-stability
risk.

## 2026-09-10: Regulation M-C

User: _"Regulation M-C just updated on Pokemonshowdown. We need to do the update.
First check what do we need to update before writing code."_ Audited first, then
built. 177 tests (6 new), tsc / eslint / `next build` green.

**What the audit ruled out, so nobody re-checks it.** No new Pokémon: Showdown's
live `pokedex.js` diffed against `lib/species/names.ts` is max dex 1025 on both
sides, and every "missing" forme is Gmax/Totem/cosplay that `gen-species.mjs`
drops deliberately (plus `Flabébé`, which differs only by NFC vs NFD). All three
`@pkmn` packages are already at latest and `gen-species --check` is clean. So the
species list, sprite sheet, Mega-stone metadata and deps needed **nothing** —
this was a string-and-data job, not a dex job.

- **The exact string is `[Gen 9 Champions] VGC 2026 Reg M-C`**, taken from
  Showdown's `formats.js`, never typed from memory — it is a lookup key that
  `catalogue.ts` filters `.eq("regulation", …)` on. Showdown also moved M-B to a
  legacy `championsregmb` mod with `searchShow: false`, which is how you can tell
  a regulation has actually left the ladder and should stop leading `FORMATS`.
- **The bug**: `PRESETS` built the eight sample teams with `format: FORMATS[0]` —
  whichever regulation is _current_. Putting M-C first would have relabelled eight
  real M-B pastes as M-C, silently. They now take a `SAMPLE_FORMAT` constant that
  states their own regulation. Verified in a browser: the dropdown defaults to M-C
  while a picked preset still reads "VGC 2026 Reg M-B".
- **`FORMATS` moved to `app/demo/formats.ts`** (re-exported from `components.tsx`,
  so no importer changed — the `type-colors` precedent). Two reasons: it is now
  unit-testable without pulling React in, and **`ingest.mjs` imports it and exits
  if `TABS` or `FORMAT_BY_ID` name a regulation the app doesn't list.** Writing
  catalogue rows under a label the app never asks for is invisible until someone
  wonders why a lookup is empty; that class is now dead rather than tested for.
- **A pre-existing gap found while there**: `FORMAT_BY_ID` mapped `…regibo3` but
  no `…regmbbo3`. Every regulation ships a Bo3 ladder with its own id, and a paste
  from it declares that id; a missing entry falls back to the tab, which is right
  only by luck. All four regulations now carry both ids.
- **`ingest.mjs --only "<tab>"`** ingests one regulation and writes suffixed files
  (`community-teams.champions-m-c.ndjson` / `seed-…champions-m-c.sql`), so the
  712-row M-B record isn't clobbered; `seed.mjs --file <name>` applies one, and
  now prints a per-regulation breakdown. That is the shape of every future
  rotation. **Ran it: 68 teams, 66 M-C + 2 M-B** (the paste's own `Format:` wins
  over the tab, same as the 5 M-A strays in the M-B ingest), 0 fetch failures, 0
  malformed. All 68 validated locally: lossless `export_text` round-trip, and
  `match_species` / `roster_code` byte-equal to what `lib/match` recomputes.
- **VGCPastes has no M-C Featured tab yet**, so `featuredGid` is omitted; the
  script already did `if (!tab.featuredGid) continue;`. 0 featured is correct, not
  a miss.

**Done — seeded 2026-09-10.** `community_teams` now holds **780 teams: 66 M-C,
709 M-B, 5 M-A** (M-B gained the 2 M-B pastes that were sitting on the M-C tab).
Applied in 346ms. Verified through the app, not just the database: the picker
defaults to M-C, four named species offer the lookup, and it returns five real
M-C teams at 4/4 with their paste links. RLS still refuses an anon insert (401).

**Getting there needed a connection-string change, and this is the durable bit.**
`SUPABASE_CONNECT_STRING` pointed at `db.<ref>.supabase.co`, Supabase's direct
connection, and **that host is IPv6-only now** — IPv4 there became a paid add-on.
This machine has no global IPv6, so getaddrinfo drops the AAAA under
AI_ADDRCONFIG, finds nothing, and `pg` reports a bare `ENOTFOUND` that reads
exactly like a deleted project. It is not one. _(An earlier draft of this section
guessed "paused" — wrong cause, same symptom. `seed.mjs` now diagnoses it.)_

It is now the **Session Pooler**: `aws-0-ca-central-1.pooler.supabase.com:5432`,
user `postgres.<ref>` — dual-stack, same password, nothing else changed. The
old value is not kept anywhere; `.env.local` carries a comment saying why.

**Finding the region without dashboard access** (the Supabase CLI is logged in to
an account that cannot see this project — `supabase projects list` shows five
others): every `aws-{0,1}-<region>.pooler.supabase.com` resolves, so DNS says
nothing. Connect to each with user `postgres.<ref>` and a deliberately wrong
password: the region that hosts the tenant answers _"password authentication
failed"_, every other answers _"Tenant or user not found"_. One host replied
differently — ca-central-1. No real credential is sent anywhere it doesn't
belong. Worth remembering; it beats hunting for dashboard access.

**Sample teams: both regulations, user-selectable.** The M-B eight were first
replaced outright by ten M-C teams, then restored alongside them when the user
pointed out that old teams are still viable. `SAMPLE_TEAMS` entries now each
carry their own `format` (19 total), `SAMPLE_FORMAT` is gone, and the "use
existing" list grew a `M-C · M-B · all` tab row.

- **The tabs scope only the samples**, and sit on a `SAMPLES` divider below your
  own saved teams. Hiding a user's own teams behind a regulation tab is how
  someone concludes their work is gone; putting the tabs on the samples header
  makes the scope obvious without explaining it. Default is the newest
  regulation that actually has samples — not `FORMATS[0]` (may have none), not
  "all" (19 rows is a scroll).
- `ExistingTeamList` is a new component because that list was **two copies of
  the same markup** (My Team, Opposing Teams) and the filter would have made it
  three. `SAMPLE_REGULATIONS` is derived from `FORMATS` ∩ what the samples
  actually carry, so a new regulation needs no second edit and an empty one
  never shows a dead tab.
- **If you see M-B teams in that list badged `saved`, those are yours** — the
  badge is literally `id.startsWith("preset-") ? sample : saved`. Picking a
  sample writes it into your library under a fresh id, so it stops reading
  "sample" from then on. Nothing from the old M-B sample set leaks in.
- Verified in a browser: default M-C shows 11, M-B shows 8, all shows 19, and
  saved teams stay put through every switch.

**Provenance comments are now tested.** Inserting the Gardevoir team by script
put it between the _next_ entry's comment lines and that entry's object, so one
team carried two titles and `Mega Aerodactyl + Zard Y` carried none — silently,
because a comment type-checks as nothing. Fixed, and `formats.test.ts` asserts
every sample has exactly one title line and one pokepaste URL above it (verified
by re-introducing the break). Worth knowing before the next scripted edit of
`demo-data.ts`: expand to the whole block including comments, and assert the
boundaries rather than trusting a backwards scan.

**The M-C eleven** (user-supplied, 2026-09-10): teams from the
opening weekend of M-C online tournaments, all by LenVGC, fetched verbatim from
pokepast.es and validated — six Pokémon each, byte-identical on re-export, every
species drawable by the icon sheet, all declaring `gen9championsvgc2026regmc`.
`SAMPLE_FORMAT` is M-C accordingly. **Explicitly temporary**; the M-B eight are in
git history.

Two consequences worth knowing. The samples now share a regulation with
`FORMATS[0]`, so the old "samples aren't pinned to the current regulation" test
could no longer say anything by comparing values — it checks the **wiring**
instead, asserting `page.tsx` never reaches for `FORMATS[0]` (with comments
stripped, since the comment explaining the rule names the thing it forbids;
verified it still fails when the bug is reintroduced). And `/demo/lookup`'s "or
try" row now shows a **weak** match — sample 1 reads "Aerodactyl + Charizard core
· 6% fit" — because `demoGuide` is an M-B guide. That is `matchOpponent` behaving
as designed and the percentage is right there; **do not add a score threshold to
hide it.**

**Deliberately not done**: M-B was not re-ingested (user's call) — the tab has
grown to 861, so a `--only "Champions M-B"` re-ingest would add ~149 whenever
wanted, and 712 pastes are already cached so it is nearly free. The sample teams
stay M-B until the user picks a new set.

## 2026-08-16: the interface also speaks Japanese

User: _"work on the japanese translation feature, similar to the chinese
version."_ Done for the same whole UI — one new dictionary, `app/i18n/ja.ts`,
332 entries, and the toggle became `EN·中·日`. The mechanism from 2026-08-15 took
it without an argument; read docs/ARCHITECTURE.md → **"Interface language"**
before touching any of it. 171 tests (9 new), tsc / eslint / `next build` green,
all routes still `ƒ (Dynamic)`.

- **The generalisation is small and now written down**: `Lang` widened,
  `DICTIONARIES` and `HTML_LANG` became records, `readLang` accepts one more
  value. `joinList` uses `、` for anything that isn't English. That is the whole
  core change — everything else was the dictionary.
- **`htmlLang()` is now the only place a language is branched on.** Three
  `toLocaleDateString` / `toLocaleTimeString` call sites had `lang === "zh" ?
"zh-Hans" : "en"` inlined, which would have silently given Japanese users US
  dates; they call `htmlLang(lang)` instead. **A fourth was found doing it
  wrong** — `/matchups` row dates called `toLocaleDateString()` with no argument
  at all, so they read `8/16/2026` in every language. Now `2026/8/16` under both
  中 and 日, verified in the browser.
- **Japanese needs its own font stack, and this is the one real trap.** Han
  unification means Chinese and Japanese drawings of hundreds of characters share
  a code point; font matching is per-glyph and stops at the first family that has
  the character; the existing chain names PingFang SC first. Without an override
  the whole Japanese UI renders in Chinese letterforms — perfectly legible and
  immediately wrong to a Japanese reader. `:lang(ja)` redefines `--font-sans` /
  `--font-mono` / `--font-display`; it works because the theme is `@theme inline`
  and the block is unlayered. Verified by reading the resolved `font-family` in
  the browser: `Geist, "Geist Fallback", "Hiragino Kaku Gothic ProN"`.
  Same reason each toggle cell carries its own `lang` — `中` and `日` are shared
  code points too.
- **`word-break: auto-phrase` on `:lang(ja) .font-display`**: the 60px landing
  headline broke 見通す across two lines, splitting one verb. Chrome-only, other
  engines ignore it, so there's no fallback to write. Display type only.
- **The terminology is the part worth a second opinion.** Where the Japanese VGC
  scene has a word it beat a literal translation: 先発 / 後発 for the lead and
  back pairs, 選出 for team preview and bring-4, **未選出 for the bench** (which
  says "not picked" rather than inventing a bench), ひんし, メガシンカ,
  テラスタル. `team` is **パーティ**, not チーム. `set` is two different words —
  グループ for a set of matchups, 構成 for a Pokémon's moves/EVs. Glossary at the
  top of `app/i18n/ja.ts`; edit a value there and every use follows.
- **Two dictionaries make completeness checkable.** New test: both translate the
  same set of English keys. A string added to one and forgotten in the other is
  exactly the failure a per-dictionary check cannot see. The placeholder-parity
  and numbered-slot sweeps now run over both via `describe.each`.
- The firewall tests were parametrised over both languages rather than copied:
  decoding in Japanese yields identical teams, nodes and `docId`, re-encodes
  byte-identically, and an untitled team is still named `"Imported team"`.
  Confirmed live too — after a Japanese paste, storage held
  `["Sand vs Miraidon","Sand vs Zard"]`.
- Verified over CDP in a real browser: all six pages Japanese with `lang="ja"`,
  one toggle and exactly one back link each, the choice surviving navigation;
  the toggle's own box **74×18 in all three languages** while the nav around it
  re-lays out; the species type-ahead still finds Pikachu from "pika"; a real
  2-board paste (_"Sand に 2 件のマッチアップを読み込みました。"_), the re-paste
  no-op (_"読み込むものはありません——Sand のこの 2 件のマッチアップは、まったく
  同じ内容ですでにあります。"_) and the delete confirm (_"このブラウザからこの
  グループ（2 件のマッチアップ）を削除しますか？"_). Console clean.
- **Not done, deliberately**: same as last time — `lib/schema/warnings.ts` and
  `lib/schema/io.ts` still have no UI callers, so `lib/` stays innocent of
  locales. The sample guide's author prose on `/demo/lookup` stays English.

## 2026-08-15: the interface speaks Chinese

User: _"provide a button on home page and all other page which provides chinese
translation (only for the necessary parts, not the pokemon name)."_ Built for
the **whole** UI — ~350 strings across six pages, the board included — after
confirming scope: everything translated, the sample guide's author prose left
English, and an `EN·中` pill in the nav. Rules in docs/ARCHITECTURE.md →
**"Interface language"**; read that before changing any of it.

- **`app/i18n/`** — `translate.ts` (pure, React-free, so the non-component string
  builders use the same function as the JSX), `zh.ts` (one dictionary, ~285
  entries, glossary at the top), `provider.tsx`, `T.tsx`, `toggle.tsx`,
  `server.ts`. Not in `lib/` — a React context is disqualified by the
  framework-free rule and a UI dictionary isn't extension-bound.
- **The locale is a cookie read in the root layout**, not localStorage. The
  reason is the project's own no-layout-shift rule: localStorage can't be read
  during SSR, so it would mean painting English and swapping after mount, and
  Chinese sets 40–60% narrower — a whole-page reflow on every load. **Price:
  every route is now `ƒ (Dynamic)`** instead of static. Nothing here fetches on
  the server, so it's a shell render, not a data round trip. Check `next build`
  output if you touch the layout.
- **Keys are the English sentence**, so a missing translation falls back to
  correct English — which is what let this ship page by page. `context|` prefix
  for the words used twice (`nav|← back` vs `slot|back`).
- **The firewall, and it is the whole risk of this change**: species, moves,
  items, types and `FORMATS` are lookup keys; `` `${my.name} vs ${opp.name}` ``,
  `"Imported team"` and `teamLabel()` are **persisted to localStorage and
  Supabase** and feed `encodeGroup` / `boardPrint` / `fallbackDocId`. If any of
  them became locale-dependent, toggling the language would mark every board
  dirty and re-upload it, and re-pasting a document in the other language would
  **fork a parallel group**. Guarded by `workflow-io.test.ts` → "language never
  reaches stored data".
- **A latent bug fixed on the way**: `importSummary` chose singular vs plural by
  comparing its _own rendered text_ (`count === "1 matchup"`). That is false in
  every language once a translation exists — including a reworded English. It now
  branches on the number. All 13 existing English assertions passed unchanged
  afterwards, which is the proof the `lang = "en"` default worked.
- `workflow-io.ts`'s `warn` channel now carries `(key, params)` and **only the
  collector renders**, so the `Card 3 (turn 1)` label, the colon joining it and
  the multi-board `vs X —` wrapper are all translatable — Chinese gets `：`, not a
  concatenated ASCII colon. English output is byte-identical; I reverted my own
  smart quotes and a reworded possessive when the tests caught them.
- **Typography, not just strings**: no CJK webfont (Geist has no CJK coverage and
  Noto Sans SC is megabytes — per-glyph system fallback instead);
  `body { font-family: Arial … }`, a create-next-app leftover, is gone; under
  `:lang(zh)` `tracking-widest` relaxes and `text-[10px]` becomes 11px —
  deliberately **not** `text-[9px]`, which is the board's fixed-height chip row.
- `LegalFooter` extracted to `app/nav.tsx`: the attribution notice was
  copy-pasted into five pages and would otherwise have been translated five
  times.
- **Two headers bypass `HeaderNav`** (`/` and `/login`) and mount the toggle
  themselves — check both. `app/page.tsx` became a client component so the
  landing page translates instantly instead of waiting on `router.refresh()`.
- 162 tests (25 new), including a placeholder-parity sweep over every dictionary
  entry — a dropped `{n}` silently loses a number and nothing else would catch it.
- Verified over CDP in a real browser: the toggle's own box is byte-identical in
  both languages (50×18 either way) while the page around it re-lays out; all six
  pages Chinese with `lang="zh-Hans"`; the choice survives navigation; one toggle
  and still exactly one back link per page; the import panel, species type-ahead
  ("pika" still finds Pikachu), a real 2-board paste (_"已为 Sand 导入 2 个对阵。"_),
  the re-paste no-op (_"没有要导入的内容——Sand 的这 2 个对阵你已经有了，且完全相同。"_)
  and the delete confirm (_"从此浏览器删除这一组（2 个对阵）？"_). Console clean,
  production build green.
- **Not done, deliberately**: `lib/schema/warnings.ts` and `lib/schema/io.ts` have
  no UI callers at all, so they were left alone; when a UI does consume them they
  want structured `{code, params}` descriptors, not a `lang` parameter, so `lib/`
  stays innocent of locales.

## 2026-08-14: importing a shared group keeps both sets

User: _"imagine a scenario where I import the json from another user who
publish a team vs many teams matchup, it will mostly like have some overlap
with my existing teams… I want to keep both."_ It was worse than overlap — the
import **destroyed** work, because a team's identity was its roster alone:

- their team canonicalised onto my id, and `rememberTeam`'s `name: team.name`
  **renamed my team to theirs**;
- `findPairMatchup` then hit my board, so their nodes overwrote my plan —
  locally _and_ in the account, since the mirror followed;
- the board's import had the mirror-image bug: it left the first board unsaved,
  so Save minted a **second** entry for a pair that already had one.

Fixed by making identity _roster + provenance_. Rules and the reasoning are in
docs/ARCHITECTURE.md → **"Two authors, one archetype: keep both"**; read that
before changing any of it. Decided with the user: an imported group is a normal,
editable group (badged, not read-only), and there is **no merge path at all** —
"if the user wants to dedup, he needs to manually delete himself."

- `StoredTeam.origin?: {docId,label,importedAt,keptApart}` — absent means mine.
  `rememberTeam` matches only within one provenance, and takes `keepName` so a
  document can't rename a team already here.
- **A same-day bug worth not repeating** (user found it in minutes): the first
  cut recorded `origin` _only_ on a collision, so an uncollided import kept no
  document id — and pasting the very same document again found nothing to
  update, saw its own first import as a rival team, and forked a second group.
  `docId` is now recorded on **every** import; `keptApart` is the only field
  that changes behaviour. Read them through `groupDocId` / `isKeptApart`, and
  note `isKeptApart` treats a legacy `origin` (no `keptApart`) as kept apart.
- Documents carry `g` = the group they were copied from. **Written only by the
  copy buttons**: `encodeGroup` doubles as the board's dirty-check fingerprint
  and must stay id-free. Old documents decode to `docId: null` and fall back to
  `paste:<rosterCode>:<name>`.
- New `app/demo/import-group.ts` — `planImport` (pure, 8 new tests) decides
  update-in-place / new-group-beside-mine / just-new, and `applyGroupImport` is
  the **single write path for both import buttons**, which is what stops the two
  pages disagreeing again. `keptApart` is set **only on a collision** — see the
  doc for why branding an uncollided restore would be actively harmful.
- Opposing teams still dedupe across groups (they carry no plan; the plan hangs
  off the pair), and `keepName` keeps their local names.
- `/matchups`: `IMPORTED` badge on the group, and **each row shows its matchup
  id** (`#` + 8 hex, selectable) — the user asked for these, and they're what a
  delete actually removes (localStorage key _and_ `matchups` row id; the team id
  is in the group header's tooltip). `/demo`'s "use existing" lists your own
  teams before pasted ones so its dedupe never hides yours.

Then, in order, three follow-ups the user asked for:

- **A no-op import says so** (_"if after paste, there is no change, can it show
  the message saying the same match up already exists?"_). A board whose
  `encodeGroup` print matches the stored one is skipped entirely — no rewrite,
  no new `savedAt` (so the list doesn't reorder), no cloud upload — and the line
  reads "Nothing to import — you already have these exact N matchups for X".
  Mixed results read "N new, N updated, N already identical"; only
  `applied.written` is mirrored. Measured, because "is it costly?" was asked:
  a 10-board document against a 60-board / 216KB library is **26ms**, and a
  realistic 6-board library is **0.7–2.4ms**. The time is `JSON.parse` of the
  whole library ~4× per board (`knownTeams`, `findPairMatchup`, `upsertMatchup`),
  not the comparison. If it ever matters, hoist the library read out of the loop.
- **`delete set` on a group header** — deletes every board in the set, browser
  and account, confirming in place; `forgetTeams` then prunes the teams that set
  used, but only those no remaining board and no in-progress `setup` still names
  (so a shared opponent survives, and a team imported but not yet paired isn't
  swept up). Removing one opponent on `/demo` deliberately still forgets nothing.
- **Highlight ≠ badge** (_"only the newly imported team is highlighted"_). The
  `violet-50` wash marks only the set the last paste landed in (`justImported`,
  cleared by dismissing its import notes, gone on revisit); the `IMPORTED` badge
  is permanent provenance. Tinting every kept-apart set instead lit two of three
  same-roster groups up forever, which pointed at nothing.
- **New `vitest.config.mts`** (the suite had no config): just the `@/` alias, so
  modules under `app/` that import `@/lib/…` can be unit-tested. Discovery left
  at defaults. 137 tests.
- Verified over CDP against the real pages: seeded my 2 plans, pasted a
  stranger's 2-board document with the same six species → two groups, my note
  and both names intact, badge on theirs only, 4 row ids shown, the note reading
  "your 2 for this team were left alone"; re-pasting it forks nothing; my own
  copy round-trips through an empty browser **without** being branded imported;
  and on the board, the same paste saves 3 boards, leaves my plan alone, and
  Save no longer duplicates the pair. Also verified: the same document pasted
  twice writes nothing and every `savedAt` is unchanged; an edited copy reports
  "1 updated, 1 already identical"; `delete set` asks in the header, cancels
  cleanly, then removes the whole set and forgets its orphaned team while
  keeping the opponent both sets share. Console clean.

## 2026-08-13: "does this look like a known team?" — partial match, built

User: _"if user enters >= 4 pokemons, we provide the match function… the match
should only show when user click it."_ Built on the groundwork from 2026-08-12;
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
- The list is _every species the icon sheet can draw_ — the same test the board's
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
  - _"remove the pikachu variant just keep the origin pikachu"_ — the list now
    drops everything the dex calls `cosmeticFormes` **plus** Pikachu's fifteen
    costumes, which are `otherFormes` and so needed one hand-written exclusion.
    1,368 → 1,317 names (~6.3KB gzipped); "pika" returns exactly one row.
    Do NOT generalise this by comparing base stats — Maushold-Four,
    Squawkabilly-Blue and Vivillon-Fancy are stat-identical to their bases and
    appear in real teams. Catalogue coverage re-checked: 186/186, no misses.
  - _"make the pokemons 6 slots instead of 0/6"_, then _"select slot can enter
    the pokemon name"_ — six slots always render, and **the slot is the input**:
    each empty slot holds its own `<input>`, clicking one focuses it, Tab walks
    the row, Enter advances to the next gap, ✕ or backspace empties a slot.
    Positions are load bearing — `slots` is length 6 with `""` blanks and only
    `ImportPanel` drops them, so filling slot 4 first stays slot 4.
  - _"change import teams to 'New Team'"_ — that button plus its three siblings
    (`＋ import` ×2, `Import a team`) now read **New team** / **＋ new team**,
    since the panel behind them also builds a team by typing.
  - _"can you make it pokemon showdown style? Just don't show all pokemon when
    not entering, and the max type ahead give it a limit"_ — suggestion rows are
    now sprite + **bold base**/grey forme + coloured type badges, which meant
    putting types in the generated data (`base|forme|types`, ~6.3KB → ~9KB
    gzipped). The two things NOT copied from Showdown are the ones the user
    named: nothing is listed until you type, and the list is capped at six with
    "more matches — keep typing". `TYPE_COLORS` moved to `app/demo/type-colors.ts`
    (re-exported from `components.tsx`) to avoid a picker↔components cycle.
  - _"improve the ui, it is currently ugly when there is '1 type …' and the slot
    same color as background"_ — the slot number became a corner label (it was
    stacking above the input), empty slots got a drawn grey "?" disc and a
    `bg-white/60` fill so they read against the cream panel, and the active slot
    gets a ring. Three visually distinct states: empty / active / filled.
  - Fell out of the slot work: there is **no disabled state anywhere in the
    picker**. Focus can't land on a disabled element, so freeing a slot left the
    box dead and the next keystroke went to the body — caught in the browser,
    not in review. Same reason the single bottom box is gone entirely.
- Verified over CDP by clicking and typing: six slots each with their own input,
  slot 1 focused on open, clicking slot 3 puts the letters _in slot 3_, "pika"
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
  else stays distinct because the same corpus has `Floette-Eternal` _and_
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
- The Supabase CLI was already installed and logged in — but to a _different_
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
not, and home can't stand in for it — the board is reached from `/matchups` _and_
from `/demo`. New `BackLink` in `app/nav.tsx` uses real history, with a
`fallback` for direct entry / an off-site previous page. `HeaderNav` takes
`back` and `onBeforeLeave`. **Placement rule (user-directed): back goes with the
page's action buttons when the page has a row of them, otherwise in the nav** —
left of `Reset` on the board, left of `paste JSON` on `/matchups`, left of My
Team's `＋ import` on `/demo`, in the nav on `/demo/lookup` and `/login`. Moving
it into `/demo`'s My Team row collided with that section's existing `← back`
(which closed its import panel), so **a panel now closes with `cancel`** and
`← back` only ever means "leave this page". `BackLink` takes a `className` so it can look like
the buttons it stands with; pass `back` to `HeaderNav` _or_ place a `BackLink`,
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
  - "vs" between the two sides, the alternate label in amber caps with wide
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
  there: a list view must be able to _start_ work, not only display it.
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

- **`/demo` (Page 1)** — _(single-pair flow, superseded 2026-08-08 by one team
  vs. many — see the top section; the import/reuse mechanics below still hold)_
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
  - bench; chips stack one per line: attacker icon + move + → target icon.
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
