# xatu

**Matchup guides for competitive Pokémon doubles, as data instead of prose.**

[xatu-six.vercel.app](https://xatu-six.vercel.app)

The most useful part of a team report is the "vs. common archetypes" section —
which four you bring, which two you lead, and what you do on the first couple
of turns. It is written as prose, so you cannot look it up while you are
actually playing. xatu turns that section into a turn tree you build by direct
manipulation, publish at a short link, and later (a separate project) surface
in-battle at team preview.

Named after the Pokémon known for seeing the future.

Target format: Pokémon Champions VGC regulations as played on the Pokémon
Showdown ladder, plus the older SV VGC regulations. Doubles, bring 6 / pick 4.

## What it does

- **A board** — turn 0 team preview branching into turns 1 to 3. Positions,
  declared moves, targets, switches, faints, Mega Evolution. Branches are
  alternates of the same turn, not a sequence.
- **Paste-first input** — a pokepast.es link, a Showdown export, or six names
  typed in. Teams round-trip losslessly.
- **Publishing** — a set of matchups at a short link fit to post on X, with an
  Open Graph card. A published page is a snapshot: it changes only when its
  author re-publishes.
- **A minimal feed** — newest and most liked, with likes and flat comments.
- **An opt-in damage calculator**, off by default, whose output is text attached
  to the move it describes and dropped as soon as that move's inputs change.
- **Three languages** — English, 简体中文, 日本語.

## Running it

```bash
npm install
npm run dev          # http://localhost:7317
```

That is the whole setup. **xatu runs fully local with no backend**: teams and
boards save to browser storage, and everything in the editor works. This is a
first-class mode, not a degraded one — see `.env.local.example`.

What needs a backend: accounts, cloud sync, publishing, the feed, and the
VGCPastes team search. To get those, create a Supabase project, copy
`.env.local.example` to `.env.local`, fill in the two `NEXT_PUBLIC_` values,
and apply the SQL in `supabase/`. The catalogue is seeded separately with
`scripts/vgcpastes/` — its data directory is gitignored, so you re-ingest
rather than download it.

| command         |                                         |
| --------------- | --------------------------------------- |
| `npm run dev`   | dev server on port 7317                 |
| `npm test`      | the unit suite — **no database needed** |
| `npm run lint`  | eslint                                  |
| `npm run build` | production build                        |

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. xatu has a short list of rules
that are deliberate rather than accidental — most importantly, **it does not
compute battles**, with one narrow opt-in exception. A pull request that adds
speed tiers, a solver or recommended plays will be refused on principle, and
that is nobody's fault but the documentation's if it was not said up front.

## Where things are

|                          |                                                                    |
| ------------------------ | ------------------------------------------------------------------ |
| `app/`                   | the Next.js app. `app/demo/` is library code, not a route.         |
| `lib/`                   | pure, framework-free: the schema, team parsing, opponent matching. |
| `supabase/`              | schema and RLS policies, as applied SQL.                           |
| `docs/ARCHITECTURE.md`   | technical reference and the gotchas worth not rediscovering.       |
| `docs/PRODUCT.md`        | what this is, and the non-goals.                                   |
| `docs/TESTING.md`        | what to walk before a release.                                     |
| `CLAUDE.md`, `AGENTS.md` | instructions for AI coding agents. Humans want CONTRIBUTING.md.    |

## Licence

MIT — see [LICENSE](LICENSE).

xatu is an unaffiliated, non-commercial fan project. Pokémon is owned by
Nintendo, The Pokémon Company, Game Freak and Creatures.
