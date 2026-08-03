# xatu — UI spec (for review before any Phase 2 code)

## 0. The framing rule everything below follows

Drag-and-drop composition is the primary input. JSON is an export artifact, produced on
copy and consumed on paste, and is otherwise invisible. The schema is plumbing.

**Never rendered on any product surface, author or reader:**

- Raw JSON, or any editable text representation of the document
- Schema field names (`plans`, `when`, `hasSpecies`, `opponentLeads`, `schemaVersion`, …)
- Predicate prose or boolean vocabulary ("AND", "condition", "guard", "tier")
- Plan-comparison layouts (plans side by side as cards)
- Validation issue paths (`matchups.0.plans.0.lead`); problems are always spoken in
  battle language ("This matchup doesn't have a lead pair yet")

The author never "edits a rule set." The author arranges a board, and the document is
what the arrangement means.

---

## 1. Design direction

Two registers, one system:

- **The Workbench** (guide shell + Matchup Designer): a bright tabletop where you
  arrange pieces. Its vernacular is the battle screen — field pads, benches, team
  preview — flattened and cleaned, not skinned to imitate Showdown.
- **The Article** (reader view): quiet, light, typographic. It must sit inside an RMT
  thread or a note.com post without visual protest, and read top-to-bottom like the
  guide it replaces.

Explicitly rejected: the current dark-dashboard default, and stock "AI page" looks
(cream + terracotta serif hero; near-black + acid accent). Light-first everywhere —
the reader embeds in light contexts, and the designer is a daylight table, not a
cockpit.

**Material.** Pixel sprites (Showdown gen5 set, `image-rendering: pixelated`) are the
illustration system. All texture and charm comes from them; the chrome around them
stays flat, calm, and nearly monochrome so a 96px Tyranitar reads as the loudest thing
on screen.

**Palette** (tokens, to be tuned in build):

| token   | value    | use                                                        |
| ------- | -------- | ---------------------------------------------------------- |
| Paper   | ~#FAFAF8 | page ground, both registers                                |
| Ink     | ~#1F2421 | text, always high contrast                                 |
| Field   | ~#8FBC6F | the battlefield table, slot pads (designer only)           |
| Sky     | ~#DCEDF5 | designer scene backdrop, preview row ground                |
| Crest   | ~#C63D2F | the one accent: active drops, "selected", primary buttons  |
| Slate   | ~#6B7280 | secondary text, tags, dividers                             |

Crest red (xatu's crest) is the only saturated non-sprite color and is spent on at most
one element per screen.

**Type.**

- Display & UI: a rounded geometric sans (candidate: M PLUS Rounded 1c — carries the
  Pokémon-adjacent rounded vernacular without cosplay, and covers Japanese, which
  authors will actually type).
- Reader body: the same family at text sizes, generous leading — article-plain, so it
  looks native quoted inside an RMT.
- Utility (the one type risk, used with restraint): a pixel/bitmap-flavored mono for
  tiny mechanical labels only — turn markers ("T1"), preview tags, the regulation
  badge. It rhymes with the sprites and marks "game fact" vs. "author prose."

**Motion.** One orchestrated moment per register: in the designer, the scene morph when
a spotlight plan takes over (pieces slide to their new posts, ~250ms); in the reader,
the branch reveal (action line unfolds under the chosen lead pair). Drags get plain
physical feedback (lift shadow, pad highlight). Nothing ambient. Reduced-motion
collapses all of it to instant state changes.

---

## 2. Surface A — the Guide Shell (author's home for one guide)

The container the Matchup Designer opens from. One column, workbench register.

```
┌──────────────────────────────────────────────────────┐
│  [title ______________]   by [author ____]  (REG M-B)│
│                                                      │
│  YOUR TEAM                                           │
│  [ttar][exca][milo][ghol][sini][star]   Re-paste team│
│                                                      │
│  MATCHUPS                                            │
│  ┌ Aerodactyl + Charizard core   [aero][zard][chomp]┐│
│  ┌ Hard Trick Room               [fari][tork][inci] ┐│
│  [+ New matchup]                                     │
│                                                      │
│  Copy guide  ·  Paste a guide                        │
└──────────────────────────────────────────────────────┘
```

**On it:**

- Identity strip: guide title, author name (plain inputs), regulation as a small badge
  with a picker — known regulations listed, free entry allowed (open string).
- The team: six sprites in a row. First run, this area is the paste target: one large
  well — "Paste your team from Showdown" — that ingests the export text and becomes the
  sprite row. Unrecognized species render as a silhouette with the pasted name kept
  verbatim and a small non-blocking note ("kept as written"). Never a rejection.
- Matchup list: one card per matchup — its name and the archetype's sprite minis.
  Clicking a card opens the Matchup Designer full-screen. Cards drag to reorder.
- Guide actions: **Copy guide** (writes the JSON export to the clipboard; a toast says
  "Copied — paste it anywhere to share"; the text itself is never displayed) and
  **Paste a guide** (a paste well that ingests guide text; on failure it says, in
  words, what's wrong: "This doesn't look like a xatu guide"). `// Phase 3 plugs in
  here: Publish, Fork, and the edit-token notice.`

**Author manipulates:** paste team text, type title/author/matchup names, reorder and
open matchups, copy/paste guide text.

**Hidden:** everything in §0; the parsed team structure (the export string round-trips
verbatim behind the sprites); all schema terminology.

---

## 3. Surface B — the Matchup Designer

One matchup fills the screen as a battle scene. This is the product.

```
┌──────────────────────────────────────────────────────────┐
│ ← Big Six                    THEIR SIDE (team preview)   │
│  [aero*][zard ][chomp][sylv ][king ][ +  ]   ⌕ add…      │
│   always usually usually usually sometimes               │
│──────────────────────────────────────────────────────────│
│            ☼ weather          ⏱ T1 | T2 | +              │
│         ┌────────┐  ┌────────┐        branch: [z+a][z+c] │
│         │ (zard) │  │ (aero) │   ← enemy pads            │
│         └────────┘  └────────┘                           │
│         ┌────────┐  ┌────────┐                           │
│         │ MILO   │  │ GHOL   │   ← your pads (T1 = lead) │
│         └────────┘  └────────┘                           │
│   why: [ reason — free text, grows as needed        ]    │
│──────────────────────────────────────────────────────────│
│  YOUR BENCH   LEAD→ on field   BACK [ttar][star]         │
│  [milo][ghol][ttar][star][exca][sini]                    │
│                                                          │
│  gameplan: [ Milotic sets up board states where …    ]   │
└──────────────────────────────────────────────────────────┘
```

### The three verbs (everything is one of these)

1. **Drag your Pokémon to posts.** Drag from your bench onto the two **field pads**
   (that's your lead — at T1 your pads *are* the lead) and into the two **BACK
   sockets**. Together, pads + back = the four you bring. There is no separate "bring"
   control; it's the sum of where pieces stand.
2. **Drag their Pokémon onto enemy pads.** That *is* the condition. Placing Charizard
   and Aerodactyl on the enemy pads at T1 means "if they lead Charizard + Aerodactyl."
   On T2+ scenes, a newly placed piece means "when this one comes in." No condition
   dropdown, no predicate names, no "AND" — two pieces on the field simply both hold.
3. **Set what you do.** Click one of your field pieces → its four moves fan out; pick
   one. Drag a bench piece onto one of your pads → that's a switch (the piece it
   replaces steps back with an arrow cue). A pad with no chosen action just stands
   there — unspecified is the natural resting state, not an option you select.

### Scene furniture (the rest of the predicate vocabulary, as board objects)

No predicate menu exists. The remaining conditions are physical props placed on the
scene, all optional, all visual:

- **Weather / terrain:** a sun-corner dial in the sky and a floor swatch on the field
  edge; clicking cycles them (none → sun → rain → …). Setting one means "when this is
  the weather/terrain."
- **Trick Room:** a flip toggle that draws the inverted-room frame around the field.
- **Tailwind:** a small pennant on either side's edge.
- **Mega / Tera:** a stone/gem chip on an enemy piece (on their pad or preview slot) —
  "when this one Megas / Terastallizes."
- **A move of theirs:** click an enemy piece on a pad → "when it uses…" with a
  type-to-find move field (a finder, not prose).
- **A KO of yours:** drag one of your bench pieces to a small "fainted" rest at the
  bench edge — "after I've lost this one."

### Turns and branches

- The **turn strip** (T1 · T2 · +) sits above the field, in the utility face.
- Within a turn, each distinct enemy-pad arrangement is a **branch**, shown as small
  sprite-pair chips next to the strip ([zard+aero] [zard+chomp]). Clicking a chip loads
  that scene; **+** starts a blank one (empty enemy pads inviting a drop). Branches are
  sparse by design — two or three chips is the expected population, and nothing nags
  about "missing" ones.
- Each scene has one free-text field: **why** — the rule's `reason`, rendered as the
  author's margin note on the scene.

### Alternate plans (the spotlight)

The opponent's preview row has a **spotlight** position. Dragging a preview species
into it (e.g. Sylveon) switches the whole scene — lead, back, gameplan, branches — to
the arrangement for "when they have Sylveon," creating it on first use (seeded as a
copy of the base arrangement). Two species in the spotlight means both must be present.
Clearing the spotlight returns to the base plan. Plans are never shown side by side;
the board simply *is* whichever plan is in the spotlight, and a quiet caption under the
preview row says which ("planning for: Sylveon in their six").

### The tier guard-rail (the ② mistake, caught in the author's language)

If the author, while a T2+ scene or any enemy-pad condition is active, tries to change
LEAD/BACK, the designer doesn't silently allow or block it. It offers the conversion:

> "Your lead is locked before you see theirs — leads are decided at team preview.
> Plan a different lead for when **Sylveon** is in their six?"
> **[Plan for Sylveon]** [Keep current lead]

Accepting moves the species to the spotlight and re-posts the pieces. The words
"preview-tier," "turn-tier," "guard," and "condition" never appear.

### Preview row details

- Six sockets; drag species in from a **type-to-find** field (`⌕ add…`). Lenient:
  unknown names become silhouette pieces, kept verbatim.
- Each socket carries a tag cycled by click: **always** / **usually** / **sometimes**
  (the schema's required/common/optional — the enum words themselves stay hidden).
- Removing a species that guards a spotlight plan asks before discarding that plan.

### Always true in the Designer

- Autosave on every change; no save button anywhere. Incomplete is legal: a matchup
  with one lead piece and nothing else persists fine and simply looks half-set-up.
- Empty states are invitations in the scene's own language ("Drag their lead pair
  here"), not validation errors.
- Typed content in the entire Designer: **gameplan** and **why** (reason). Everything
  else is dragging, clicking, or type-to-find lookups.

**Hidden:** all of §0, plus: rule ids/ordering, the plans array, specificity mechanics
(the board just switches), the actions encoding, the distinction between "leads" and
"switches in" as predicate names (it's carried by *when* and *how* a piece was placed).

---

## 4. Surface C — the Reader view (its own surface, its own bar)

Article register. This is what an RMT links to; it must be legible to someone who has
never heard of xatu, and feel like a well-typeset section of the team report itself.

```
┌──────────────────────────────────────────────────────┐
│ Sand + Mega Staraptor      yoshimap · Reg M-B        │
│ [ttar][exca][milo][ghol][sini][star]  [Copy team]    │
│──────────────────────────────────────────────────────│
│ ▸ vs. Aerodactyl + Charizard core  [aero][zard][…]   │
│ ▾ vs. Hard Trick Room              [fari][tork][…]   │
│                                                      │
│   Bring  [MILO][TTAR] + [sini][ghol]                 │
│          lead            back                        │
│                                                      │
│   Usually a very easy matchup. Ignore Farigiraf…     │
│                                                      │
│   If they lead:                                      │
│   ( [inci] + ? )  ( [kang] + ? )                     │
│      ▼ chosen                                        │
│   T1  Tyranitar → Rock Slide                         │
│       ▸ why                                          │
└──────────────────────────────────────────────────────┘
```

**The bar:** one slim header — guide title, author, regulation badge (utility face),
the six team sprites, and one Crest-colored action: **Copy team** (the verbatim export
string to the clipboard; shown in full under a "Show team text" disclosure for
skeptics, as pasteable Showdown text — this is Showdown's format, not xatu's).
`// Phase 3 plugs in here: Fork ("rebuild for a new regulation") in this bar, prominent.`

**Body:** an accordion of matchups (the matchup list is what folds — branches don't).
Each expanded matchup reads in article order:

1. **The archetype:** its name and sprite row, with the "always" species visually
   weighted above "usually"/"sometimes."
2. **Bring:** the four, as sprites — lead pair large and first, back pair smaller.
   Labels say "lead" and "back" in plain text. If the guide has a spotlight plan, it
   follows as its own sub-block — "**If they have Sylveon:** bring …" — sequentially,
   never as a side-by-side comparison.
3. **The gameplan** paragraph, set as body prose. This is the soul of the section;
   it gets the article's full text measure.
4. **The branches, as a walkthrough:** "If they lead:" followed by the turn-1
   conditions as sprite-pair buttons. Clicking one reveals that branch's **action
   line** — terse, icon-led, one line per acting Pokémon ("Tyranitar → Rock Slide",
   "Gholdengo ⇄ Staraptor") — with **why** as a collapsed disclosure beneath. Two
   layers by design: the action line is the density the future extension will show.
   Branches with non-lead conditions (weather, Trick Room, a KO) render their
   condition as a small iconographic phrase ("⏱ under Trick Room") before the action
   line. This is plain progressive disclosure — no hidden-answer mode, no scoring,
   nothing reserved for one.
5. Unwritten branches simply don't exist on the page. No "no data" placeholders.

**Footer:** the fan-project notice (unaffiliated, non-commercial; Pokémon © Nintendo /
The Pokémon Company / Game Freak / Creatures), small and always present.

**Reader manipulates:** accordion, walkthrough buttons, copy team, disclosures.
Nothing on this surface edits anything.

**Hidden:** all of §0; edit affordances; empty-state scaffolding; any hint of the
document structure beyond what the article typography itself communicates.

---

## 5. Complete inventory of typing

| Where                  | What                          | Kind                       |
| ---------------------- | ----------------------------- | -------------------------- |
| Guide shell            | title, author name            | identity, plain inputs     |
| Guide shell            | matchup name                  | identity (card/scene title)|
| Guide shell            | regulation                    | picker with free entry     |
| Guide shell            | team paste / guide paste      | ingestion wells, not shown back |
| Matchup Designer       | **gameplan**                  | prose (the author's voice) |
| Matchup Designer       | **why** (per branch)          | prose (the author's voice) |
| Matchup Designer       | species finder, move finder   | type-to-find lookups       |

Nothing else is typed, anywhere.

---

## 6. Open questions for review

1. **Per-species notes** ("usually Choice Scarf") exist in the schema but violate "only
   gameplan and why are typed." Options: (a) drop them from the editor for now (schema
   keeps the field), or (b) allow a small caption on a preview socket as a third typed
   place. Leaning (a) — the gameplan can carry it.
2. **Stage direction vs. data on T2+ scenes.** Who is *standing* on your pads in a T2
   scene is context, not recorded data (the schema keys actions by species). Proposed:
   pads on T2+ scenes let the author quietly swap who's standing (small corner control)
   without recording anything; only clicked moves and dragged switches are data. Is
   that second gesture acceptable, or should T2+ pads always just show the lead pair?
3. **"Switches in" vs. "already out" on T2+.** A piece dragged onto an enemy pad on
   T2+ reads "when this one comes in." For "they led it and it's still out," proposed:
   a small toggle on the placed piece ("came in ↔ was out from the start"). Fine, or
   over-fitted?
4. **The original brief's "small dropdown" for extra predicates** is superseded by the
   scene-furniture approach (§3). Confirm that's the intent.
5. **Turn-agnostic branches** ("if Kingambit ever switches in → Haze") still pin to a
   turn in the schema. Unchanged from the earlier open question; the designer currently
   inherits the limitation.
