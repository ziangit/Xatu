-- Public identity: a username, and nothing else.
--
-- Deliberately a separate table from auth.users rather than a view over it.
-- auth.users holds the email; this table physically cannot leak one, so a
-- byline rendered for a signed-out visitor has nothing to leak. There is no
-- avatar, no bio, no follower count — see docs/PRODUCT.md.
--
-- Apply with the same path the rest of the schema uses (a direct connection
-- over the Session Pooler), not `supabase db push`.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 3–20 chars, starts alphanumeric, then letters/digits/_/-. Case is kept for
  -- display; uniqueness is case-insensitive (see the index below), so "Phalap"
  -- and "phalap" cannot both exist.
  username text not null
    constraint profiles_username_shape
    check (username ~ '^[A-Za-z0-9][A-Za-z0-9_-]{2,19}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- World-readable on purpose: a byline has to render for visitors who are not
-- signed in. The row holds a username and timestamps, nothing private.
create policy "profiles are world-readable"
  on public.profiles for select
  using (true);

create policy "profiles are self-insertable"
  on public.profiles for insert
  with check ((select auth.uid()) = user_id);

create policy "profiles are self-updatable"
  on public.profiles for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
