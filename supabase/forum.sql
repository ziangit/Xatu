-- The minimal forum: likes and flat comments on a published group.
--
-- Deliberately absent (docs/PRODUCT.md): images, replies to replies, follows,
-- view counts, and any report/flag/moderation queue. Sign-in is required to
-- post; authors delete their own; the site owner deletes anything by hand.

create table if not exists public.post_likes (
  slug text not null references public.published_groups (slug) on delete cascade,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One like per person per post, enforced by the key rather than by checking
  -- first and hoping two clicks don't race.
  primary key (slug, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.published_groups (slug) on delete cascade,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  body text not null
    constraint post_comments_body_len check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_by_post
  on public.post_comments (slug, created_at);

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

-- Counts and comment text are public; a logged-out visitor reads the thread.
create policy "likes are world-readable" on public.post_likes
  for select using (true);
create policy "likes are self-insertable" on public.post_likes
  for insert with check ((select auth.uid()) = user_id);
create policy "likes are self-deletable" on public.post_likes
  for delete using ((select auth.uid()) = user_id);

create policy "comments are world-readable" on public.post_comments
  for select using (true);
create policy "comments are self-insertable" on public.post_comments
  for insert with check ((select auth.uid()) = user_id);
create policy "comments are self-deletable" on public.post_comments
  for delete using ((select auth.uid()) = user_id);
-- No UPDATE policy on comments, so none is possible: an edited comment under a
-- reply changes what the reply was answering. Delete and post again.

-- One query for a feed card: the post, its author's username, and its counts.
-- `security_invoker` so the underlying tables' RLS still applies rather than
-- the view owner's rights.
create or replace view public.feed_posts
with (security_invoker = on) as
select
  p.slug, p.title, p.description, p.team_name, p.regulation, p.species,
  p.opponent_count, p.created_at, p.updated_at, p.user_id,
  pr.username as author,
  (select count(*) from public.post_likes l where l.slug = p.slug) as like_count,
  (select count(*) from public.post_comments c where c.slug = p.slug) as comment_count
from public.published_groups p
left join public.profiles pr on pr.user_id = p.user_id;
