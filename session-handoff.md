# Session handoff

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
> overwrites your own plans**. Team identity is now roster *plus* provenance,
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
> M-B teams, ingested *and live in Supabase*), **roster identity/partial-match
> groundwork**, one copy/paste format for
> one-vs-one *and* one-vs-many, a real `← back` on every page, and `/matchups`
> no longer flashing a partial list. Sections below, newest first.
>
> Still true from before: one team vs. many opposing teams is built (2026-08-08),
> accounts are live, and the site is deployed to production. **The Supabase
> URL-config item is DONE** (user, 2026-08-13) — ignore the older section that
> still calls it open.

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
sets kept *out* of the `encodeGroup` fingerprint — plus a dex learnset fallback
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
  whichever regulation is *current*. Putting M-C first would have relabelled eight
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
exactly like a deleted project. It is not one. *(An earlier draft of this section
guessed "paused" — wrong cause, same symptom. `seed.mjs` now diagnoses it.)*

It is now the **Session Pooler**: `aws-0-ca-central-1.pooler.supabase.com:5432`,
user `postgres.<ref>` — dual-stack, same password, nothing else changed. The
old value is not kept anywhere; `.env.local` carries a comment saying why.

**Finding the region without dashboard access** (the Supabase CLI is logged in to
an account that cannot see this project — `supabase projects list` shows five
others): every `aws-{0,1}-<region>.pooler.supabase.com` resolves, so DNS says
nothing. Connect to each with user `postgres.<ref>` and a deliberately wrong
password: the region that hosts the tenant answers *"password authentication
failed"*, every other answers *"Tenant or user not found"*. One host replied
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
put it between the *next* entry's comment lines and that entry's object, so one
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
  2-board paste (*"Sand に 2 件のマッチアップを読み込みました。"*), the re-paste
  no-op (*"読み込むものはありません——Sand のこの 2 件のマッチアップは、まったく
  同じ内容ですでにあります。"*) and the delete confirm (*"このブラウザからこの
  グループ（2 件のマッチアップ）を削除しますか？"*). Console clean.
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
  comparing its *own rendered text* (`count === "1 matchup"`). That is false in
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
  ("pika" still finds Pikachu), a real 2-board paste (*"已为 Sand 导入 2 个对阵。"*),
  the re-paste no-op (*"没有要导入的内容——Sand 的这 2 个对阵你已经有了，且完全相同。"*)
  and the delete confirm (*"从此浏览器删除这一组（2 个对阵）？"*). Console clean,
  production build green.
- **Not done, deliberately**: `lib/schema/warnings.ts` and `lib/schema/io.ts` have
  no UI callers at all, so they were left alone; when a UI does consume them they
  want structured `{code, params}` descriptors, not a `lang` parameter, so `lib/`
  stays innocent of locales.

## 2026-08-14: importing a shared group keeps both sets

User: *"imagine a scenario where I import the json from another user who
publish a team vs many teams matchup, it will mostly like have some overlap
with my existing teams… I want to keep both."* It was worse than overlap — the
import **destroyed** work, because a team's identity was its roster alone:

- their team canonicalised onto my id, and `rememberTeam`'s `name: team.name`
  **renamed my team to theirs**;
- `findPairMatchup` then hit my board, so their nodes overwrote my plan —
  locally *and* in the account, since the mirror followed;
- the board's import had the mirror-image bug: it left the first board unsaved,
  so Save minted a **second** entry for a pair that already had one.

Fixed by making identity *roster + provenance*. Rules and the reasoning are in
docs/ARCHITECTURE.md → **"Two authors, one archetype: keep both"**; read that
before changing any of it. Decided with the user: an imported group is a normal,
editable group (badged, not read-only), and there is **no merge path at all** —
"if the user wants to dedup, he needs to manually delete himself."

- `StoredTeam.origin?: {docId,label,importedAt,keptApart}` — absent means mine.
  `rememberTeam` matches only within one provenance, and takes `keepName` so a
  document can't rename a team already here.
- **A same-day bug worth not repeating** (user found it in minutes): the first
  cut recorded `origin` *only* on a collision, so an uncollided import kept no
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
  delete actually removes (localStorage key *and* `matchups` row id; the team id
  is in the group header's tooltip). `/demo`'s "use existing" lists your own
  teams before pasted ones so its dedupe never hides yours.

Then, in order, three follow-ups the user asked for:

- **A no-op import says so** (*"if after paste, there is no change, can it show
  the message saying the same match up already exists?"*). A board whose
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
- **Highlight ≠ badge** (*"only the newly imported team is highlighted"*). The
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
