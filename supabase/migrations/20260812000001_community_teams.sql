-- Community team catalogue — the VGCPastes Repository, ingested by
-- scripts/vgcpastes/ingest.mjs. Run once in the Supabase SQL editor (or with
-- psql), then seed with scripts/vgcpastes/data/seed-community-teams.sql.
--
-- READ THIS BEFORE "FIXING" THE POLICY BELOW: unlike `teams` and `matchups`,
-- this table is deliberately NOT owner-scoped. It holds public pastes shared by
-- the community, it has no user_id, and every visitor sees the same rows. So it
-- gets a world-readable SELECT policy and, just as deliberately, **no INSERT,
-- UPDATE or DELETE policy at all** — with RLS enabled, a missing policy is a
-- denial, so the anon key the app ships cannot write here. Seeding happens out
-- of band over psql. The service-role key is still never used anywhere.
--
-- Nothing in the app depends on this table existing: with it absent (or with
-- Supabase unconfigured) the local-first flow works exactly as before.

create table public.community_teams (
  id uuid primary key default gen_random_uuid(),
  -- Where the row came from, so a second source can be added without guessing.
  source text not null default 'vgcpastes',
  source_team_id text not null, -- e.g. "MB712"
  -- Identity: one row per paste. The seed upserts on this.
  paste_url text not null unique,
  regulation text not null, -- one of the app's FORMATS labels
  name text,
  author text, -- the player, as credited in the sheet
  owner text, -- the handle the team was published under
  species text[] not null, -- as pasted, in paste order — for display
  -- Derived by lib/match/roster.ts (the same code the app and the future
  -- extension use, so the database can never disagree with them):
  --   match_species  normalised + deduped + sorted, for overlap search
  --   roster_code    match_species joined by "|", the team's identity
  -- Normalised means in-battle formes are collapsed ("Garchomp-Mega" →
  -- "garchomp"), because team preview never shows them; formes that ARE
  -- visible at preview stay distinct.
  match_species text[] not null,
  roster_code text not null,
  export_text text not null, -- verbatim Showdown export; round-trips losslessly
  featured boolean not null default false, -- appears on a "Featured Teams" tab
  category text, -- archetype label, only present for featured teams
  event text,
  event_rank text, -- "Rank" in the sheet; renamed to dodge the reserved word
  source_link text,
  has_evs boolean,
  fetched_at timestamptz not null default now()
);

alter table public.community_teams enable row level security;

create policy "community teams are world-readable"
  on public.community_teams for select
  using (true);

-- Browse by regulation, featured first.
create index community_teams_regulation on public.community_teams (regulation, featured desc);
-- "which teams run this Pokémon", and the overlap query behind a partial
-- ("4 of 6") search: `where match_species && $1` is indexable, then rank by
-- cardinality of the intersection. A single roster_code cannot answer that —
-- two codes differing by one species are unrelated strings — so the code is
-- for identity and the array is for search.
create index community_teams_match_species on public.community_teams using gin (match_species);
-- Identity: same six in any order, e.g. the roster that appears 30 times.
create index community_teams_roster_code on public.community_teams (roster_code);
