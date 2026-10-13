-- A matchup id is only unique *within one account*.
--
-- The bug this fixes, seen live: sign in as A, save boards (they sync), then
-- sign in as B in the same browser. localStorage still holds A's boards, so
-- B's save upserts rows whose `id` already belongs to A — the upsert resolves
-- to an UPDATE and the owner-only policy refuses it with
--
--   new row violates row-level security policy (USING expression)
--
-- which is the policy doing its job and the schema asking the wrong question.
-- Ids are generated in the browser (`crypto.randomUUID()` per board), so they
-- were never a global identity; they identify a board *to its owner*.
--
-- Same shape as `published_groups (user_id, team_id)`.

alter table public.matchups drop constraint if exists matchups_pkey;
alter table public.matchups
  add constraint matchups_pkey primary key (user_id, id);

-- `deleteCloudMatchup` filters on `id` alone, which stays correct: RLS already
-- scopes every statement to the caller, so it can only ever match their row.
create index if not exists matchups_by_id on public.matchups (id);

-- The same collision is possible for teams, which are mirrored the same way.
alter table public.teams drop constraint if exists teams_pkey;
alter table public.teams
  add constraint teams_pkey primary key (user_id, id);
create index if not exists teams_by_id on public.teams (id);
