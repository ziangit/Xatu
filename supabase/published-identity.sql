-- Which set a published post came from, so publishing twice updates one post
-- instead of minting a second.
--
-- The gap this closes: `publishGroup` always took a fresh slug, because
-- nothing recorded where a set had been published to. The panel's own copy
-- said "Publish again to update it" and docs/PRODUCT.md calls a published page
-- a snapshot that "changes only when its author re-publishes" — both were
-- false the moment you published the same set a second time.
--
-- `team_id` is **text, not uuid**: a set headed by a built-in sample carries
-- an id like `preset-0`.

alter table public.published_groups
  add column if not exists team_id text;

-- One post per set per author. Nulls do not collide in Postgres, so rows
-- published before this column existed keep working and simply are not
-- matched to a set — they are still deletable from the post itself.
create unique index if not exists published_groups_one_per_set
  on public.published_groups (user_id, team_id)
  where team_id is not null;

create index if not exists published_groups_mine
  on public.published_groups (user_id);

-- The author-only DELETE policy already exists (supabase/published.sql); it
-- had simply never been given a caller.
