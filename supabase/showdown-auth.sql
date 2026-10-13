-- Username + password sign-up, Pokémon Showdown style: no email anywhere in
-- the UI (user-directed, 2026-10-13, replacing the email/password form).
--
-- WHY A SYNTHETIC ADDRESS. Supabase Auth has no username provider; password
-- auth is the "email" provider. So an account's stored address is
-- `<lowercased username>@xatu.invalid` — `.invalid` is reserved by RFC 2606
-- and can never resolve, so it cannot be mistaken for a mailbox or mailed to.
-- The user never sees it, types it, or is asked for one.
--
-- The cost, stated plainly: **no password reset**, because there is no mailbox
-- to send one to. Showdown has the same property. Google accounts are
-- unaffected — they keep a real address and their own recovery.

-- ── username → the address to authenticate with ───────────────────────────
--
-- Sign-in needs this because the username can be renamed, so deriving the
-- address from what the user typed would break the moment they changed it.
--
-- It returns **only** synthetic addresses. A Google account's address is a real
-- mailbox, and this function is callable by anyone, so returning one would turn
-- the public username list into an email directory. That guard is the whole
-- reason this is a function and not a view.
create or replace function public.login_address(p_username text)
returns text
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select u.email
    from public.profiles p
    join auth.users u on u.id = p.user_id
   where lower(p.username) = lower(p_username)
     and u.email like '%@xatu.invalid'
   limit 1;
$$;

revoke all on function public.login_address(text) from public;
grant execute on function public.login_address(text) to anon, authenticated;

-- ── how many accounts one address has made today ──────────────────────────
--
-- Sign-up goes through our own route handler (the only way anything of ours
-- ever sees the client IP — the browser otherwise talks to Supabase directly),
-- and the handler calls this.
create table if not exists public.signup_ips (
  id bigint generated always as identity primary key,
  ip inet not null,
  created_at timestamptz not null default now()
);
create index if not exists signup_ips_recent on public.signup_ips (ip, created_at desc);

-- RLS on with no policies: unreachable through PostgREST in either direction.
alter table public.signup_ips enable row level security;

-- The shared secret the signup route proves itself with. A database-level
-- setting would be tidier but Supabase does not grant ALTER DATABASE, so it
-- lives in a table that is RLS-on-with-no-policies — only the security-definer
-- function below can read it, and nothing reaches it through PostgREST.
create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;

/*
 * Returns true and records the attempt, or false when the address is at its
 * daily cap.
 *
 * `p_secret` is why this is safe to expose. The IP is a *parameter* — without a
 * secret only the server knows, anyone could call this with someone else's
 * address and lock them out of signing up. The app has no service-role key by
 * rule (CLAUDE.md), so a shared secret is how a route handler proves it is the
 * route handler.
 */
create or replace function public.claim_signup_slot(
  p_ip inet,
  p_secret text,
  p_cap int default 3
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected text;
  v_used int;
begin
  select value into v_expected from public.app_secrets where key = 'signup_guard';
  if v_expected is null or v_expected = '' or p_secret is distinct from v_expected then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  select count(*) into v_used
    from public.signup_ips
   where ip = p_ip
     and created_at > now() - interval '24 hours';

  if v_used >= p_cap then
    return false;
  end if;

  insert into public.signup_ips (ip) values (p_ip);
  return true;
end;
$$;

revoke all on function public.claim_signup_slot(inet, text, int) from public;
grant execute on function public.claim_signup_slot(inet, text, int) to anon;
