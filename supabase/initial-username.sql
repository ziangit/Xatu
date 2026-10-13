-- Give every new account a username at signup, so nobody lands on a byline
-- they have to go and set before they can post.
--
-- User-directed, 2026-10-12, after comparing with teamsheet.gg: it assigns
-- `ZiangSun` from the Google profile the moment you sign in, and the settings
-- page lets you change it afterwards. This is that behaviour. It REPLACES the
-- earlier "a username is never derived from the email address" rule in
-- docs/PRODUCT.md — the trade is stated there.
--
-- Where the name comes from:
--   Google         raw_user_meta_data->>'name' / 'full_name' (the `profile`
--                  scope our consent screen already asks for)
--   email/password neither exists, so the address's local part is all there is
--
-- A trigger on auth.users rather than a client-side "if no username, make
-- one": it runs exactly once, inside the signup transaction, next to the
-- unique index that settles collisions. A client doing this would race with
-- itself across two tabs and would never run for someone who signs up and
-- never opens the app.

create or replace function public.claim_initial_username()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_raw  text;
  v_base text;
  v_try  text;
  v_n    int := 1;
  -- Keep in step with RESERVED in app/auth/profile.ts. Without this, someone
  -- whose Google name is "Admin" would be handed it automatically.
  v_reserved text[] := array[
    'xatu','admin','administrator','moderator','mod','support','official',
    'system','root','trainer'
  ];
begin
  if exists (select 1 from public.profiles where user_id = new.id) then
    return new;
  end if;

  v_raw := coalesce(
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );

  -- Fit `profiles_username_shape`: alphanumeric first, then letters, digits,
  -- `_` or `-`. "Ziang Sun" becomes "ZiangSun".
  v_base := regexp_replace(coalesce(v_raw, ''), '[^A-Za-z0-9_-]', '', 'g');
  v_base := regexp_replace(v_base, '^[^A-Za-z0-9]+', '');
  v_base := left(v_base, 20);

  if char_length(v_base) < 3 or lower(v_base) = any (v_reserved) then
    v_base := 'trainer-' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  v_try := v_base;
  for v_n in 1..50 loop
    begin
      insert into public.profiles (user_id, username) values (new.id, v_try);
      return new;
    exception when unique_violation then
      -- Taken. Suffix it, trimming the base so the result still fits 20.
      v_try := left(v_base, 20 - char_length((v_n + 1)::text)) || (v_n + 1)::text;
    end;
  end loop;

  -- Fifty collisions means the name is not the problem. Fall back to one that
  -- cannot collide.
  insert into public.profiles (user_id, username)
  values (new.id, 'trainer-' || substr(replace(new.id::text, '-', ''), 1, 8));
  return new;

exception when others then
  -- A username is a convenience; signing up is not. If anything above fails,
  -- let the account be created without one and let the account menu prompt
  -- for it, exactly as it did before this trigger existed.
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.claim_initial_username();

-- Backfill: accounts that predate the trigger and never picked a name.
-- Anyone who already has a profile row is left completely alone.
insert into public.profiles (user_id, username)
select u.id,
       'trainer-' || substr(replace(u.id::text, '-', ''), 1, 8)
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id);
