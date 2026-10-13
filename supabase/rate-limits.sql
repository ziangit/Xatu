-- Daily caps on how much one account can post.
--
-- These live in the database, not in the client, because the browser talks to
-- PostgREST directly with the anon key — a check in React is bypassed by one
-- curl. The cap has to be somewhere the request cannot go around, and that is
-- a BEFORE INSERT trigger.
--
-- WHAT THIS DOES NOT DO: limit registrations per IP. Sign-up goes from the
-- browser straight to Supabase Auth and never touches our server or this
-- database, so neither can see the address. The answers there are Supabase's
-- own: email confirmation (on), its generic per-IP auth rate limits, and
-- CAPTCHA. See docs/ARCHITECTURE.md -> "Abuse limits".

-- Actions, not surviving rows. Counting live posts would let someone post
-- five, delete five and post five more — the spam is sent either way, and the
-- deletion is the spammer's own clean-up. An append-only log is what a cap on
-- *behaviour* needs.
create table if not exists public.rate_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_events_lookup
  on public.rate_events (user_id, kind, created_at desc);

-- RLS on with **no policies at all**: nothing reaches this table through
-- PostgREST, in either direction. Only the security-definer trigger below
-- writes it, and it bypasses RLS by virtue of being definer-owned.
alter table public.rate_events enable row level security;

create or replace function public.enforce_daily_cap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cap  int  := tg_argv[0]::int;
  v_kind text := tg_argv[1];
  v_used int;
begin
  select count(*) into v_used
    from public.rate_events e
   where e.user_id = new.user_id
     and e.kind = v_kind
     and e.created_at > now() - interval '24 hours';

  if v_used >= v_cap then
    -- A distinct SQLSTATE, so the app can say "you have hit today's limit"
    -- instead of the generic refusal it shows for an RLS denial.
    raise exception 'daily % cap of % reached', v_kind, v_cap
      using errcode = 'P0001';
  end if;

  insert into public.rate_events (user_id, kind) values (new.user_id, v_kind);
  return new;
end;
$$;

-- Note on ordering: a BEFORE trigger runs before the RLS WITH CHECK, so a
-- client that lied about `user_id` would log an event against someone else —
-- but the RLS denial that follows aborts the statement, so that write rolls
-- back with it. Nobody can burn another account's quota.

drop trigger if exists published_groups_daily_cap on public.published_groups;
create trigger published_groups_daily_cap
  before insert on public.published_groups
  for each row execute function public.enforce_daily_cap('5', 'publish');

-- Re-publishing is an UPDATE to the same slug, so editing a post costs
-- nothing. Only a new post counts.

drop trigger if exists post_comments_daily_cap on public.post_comments;
create trigger post_comments_daily_cap
  before insert on public.post_comments
  for each row execute function public.enforce_daily_cap('30', 'comment');

-- Likes are not capped: the primary key is (slug, user_id), so a post can be
-- liked once per account and there is nothing to flood.
