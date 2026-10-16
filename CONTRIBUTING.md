# Contributing to xatu

Thanks for looking. Two things before you spend a weekend on something.

**First, read the rules below.** xatu refuses a handful of features on
principle, and they are the features people most often want to add. A pull
request that adds speed tiers or a solver will be turned down however good the
code is. That would be a waste of your time, and the fault would be this
document's for not saying so.

**Second, open an issue before building anything sizeable.** A bug fix or a
clear improvement can arrive as a pull request. A new feature should be a
conversation first.

## Running the checks

A pull request has to pass these four. There is no CI yet, so run them
yourself — together they take under a minute:

```bash
npm test             # vitest — no database needed
npx tsc --noEmit     # types
npm run lint         # eslint
npm run build        # production build
```

Node 24. `npm install`, then `npm run dev` on port 7317. The whole editor works
with no backend at all — see the README.

## The rules that are deliberate

Each of these has cost something to learn. The *why* matters more than the
rule, because a rule without its reason gets helpfully reverted.

### xatu does not compute battles

No simulation, no speed tiers, no solver, no "recommended play" generation, and
nothing the app works out on its own initiative. This is the constraint the
whole project rests on: xatu faithfully displays what an author wrote, which is
also what keeps the planned browser extension uncontroversial.

There is **one** exception, and it is narrow: a damage calculator the author
switches on and invokes deliberately, off by default. Its output is an opaque
string attached to the move it describes — the same sentence people paste from
Showdown's calculator by hand today. It is stored, never re-derived on read,
and never read back as data. Its inputs are fingerprinted, so a calculation
whose set, move or target has changed is dropped rather than shown.

**The toggle changes the interface, never the document.** A guide written with
the calculator on must read identically with it off. Please do not widen this.

### The predicate vocabulary is closed

Do not add predicates to chase expressiveness. The prose fields absorb
everything else. An expanding vocabulary quietly pressures authors to "fill in
the graph", which is the opposite of the sparse-by-design intent.

### The schema is plumbing, never UI

Drag-and-drop composition is the input. JSON exists only as a copy/paste export
artifact. No product surface shows or edits JSON, schema field names or
predicate vocabulary. (The landing page used to print a sample document. It was
removed for exactly this reason.)

Schema changes are breaking changes: `lib/schema/` is simultaneously the
storage format, the sharing format and the future extension's input.

### `lib/` is pure

No React, no Next.js imports. The schema, `matchOpponent` and paste parsing are
shared with the browser extension, which has no framework. `app/demo/` is
library code too, despite the path — it is not a route.

### No markup in author text

Reports are plain text plus `:Species:` tokens that render as sprites. No
markdown, no HTML. This is a public page on a site with no moderation tooling,
and author-supplied markup there is an XSS surface with nobody watching it.

### Lenient validation

Unknown species and moves warn, never block. The author is the authority; xatu
is not a legality checker.

### Accounts and data

- Google and username/password via Supabase Auth only. xatu never stores
  credentials.
- Every user table is owner-only RLS. **The service-role key is never used by
  the app** — it bypasses RLS entirely.
- The anon/publishable key is public by design: it ships in the client bundle.
  Nothing is protected by hiding it; everything is protected by RLS. If you
  touch a policy, a view or a grant, test it signed out and from a second
  account, and **judge by rows changed, not by status codes** — an anonymous
  DELETE returns 204 having deleted nothing.
- **The local-first flow must keep working with no backend configured.**
  `getSupabase()` returns null and the app stays fully usable.

### Not in this project

No cron jobs, no `vercel.json`, no LLM integration, no `ANTHROPIC_API_KEY`.

**Do not commit sprite or audio assets** — sprites are hotlinked from Showdown's
CDN.

### `ownTeam` round-trips losslessly

It stores the verbatim Showdown export. That is why a set is replaced by
pasting a new export rather than edited field by field.

## Conventions

- **TypeScript throughout.** Prettier and eslint are not optional; CI runs both.
- **Test the non-trivial.** Anything that decides what the board *means*
  belongs in `app/demo/board.ts` with unit tests, not in a page component. The
  editor and the published reader are two renderers of the same card and have
  drifted four times; shared logic lives in one module for that reason.
- **Translations come in threes.** Dictionary keys are the English sentence, so
  editing English orphans the old entry. Both `app/i18n/zh.ts` and
  `app/i18n/ja.ts` must carry the same keys — a test enforces it. Species,
  moves, items and regulation strings are lookup keys and stay English.
- **No native dialogs.** `window.confirm` and `window.alert` are never
  acceptable; confirm in place, in the row the question is about.
- **Every page needs a way back**, including a step back inside a multi-step
  panel. Cancel is not a step back.
- **Measure layout claims.** The language toggle has moved the page three
  separate times. If a change touches the header or a reserved height, measure
  it in all three languages rather than judging by eye.

## Next.js 16

This version has breaking changes against what most tools and most training
data assume. Read the relevant guide in `node_modules/next/dist/docs/` before
writing framework code. `AGENTS.md` is written and re-added by `next dev`
itself — committing it with your work keeps the tree clean.

## Before you open the pull request

- The four checks above pass.
- New behaviour that decides something has a test.
- If you changed anything a reader sees, you looked at it at phone width too.
- If you changed a rule in `CLAUDE.md` or `docs/PRODUCT.md`, say so explicitly
  in the description. Those files record decisions, and a silent change to one
  is how a deliberate constraint gets lost.

`CLAUDE.md` and `AGENTS.md` are instructions for AI coding agents. They are
accurate, but they are not addressed to you — this file is.
