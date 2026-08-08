-- xatu cloud storage schema. Run once in the Supabase SQL editor
-- (Dashboard → SQL Editor → paste → Run), or `supabase db push` later.
--
-- Privacy model: every row carries the owner's user_id and Row Level
-- Security restricts all four verbs to that owner. The database itself
-- enforces isolation — a bug in app code cannot leak another user's rows.
-- The anon key + RLS is the only access path the app uses; the service-role
-- key (which bypasses RLS) is never shipped anywhere.

-- Saved teams (mirrors the browser's StoredTeam).
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  format text not null default '',
  export_text text not null, -- verbatim Showdown export; round-trips losslessly
  updated_at timestamptz not null default now()
);

alter table public.teams enable row level security;

create policy "teams are owner-only"
  on public.teams for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Saved matchup boards. The payload is the full SavedMatchup object exactly
-- as the browser stores it (setup with verbatim exports + the turn tree), so
-- a cloud round-trip is lossless. The compact codec stays a paste format.
create table public.matchups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  payload jsonb not null,
  saved_at timestamptz not null default now()
);

alter table public.matchups enable row level security;

create policy "matchups are owner-only"
  on public.matchups for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index matchups_user_saved on public.matchups (user_id, saved_at desc);
create index teams_user_updated on public.teams (user_id, updated_at desc);
