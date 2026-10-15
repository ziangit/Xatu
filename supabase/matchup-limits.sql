-- Ceilings on private matchup storage.
--
-- NOT a product limit. A planning tool whose value is stored work must never
-- say "you cannot save this" to someone using it normally, and there is no
-- paid tier to upsell — these numbers exist only so a script cannot fill the
-- database, and so one browser cannot quietly blow its localStorage quota.
--
-- Sized from measurement, not taste: the largest real board is 7.7KB, the
-- average 4.9KB, and the heaviest real account holds 20 matchups. Both
-- ceilings below are orders of magnitude above that.

-- One row, bounded. `published_groups.document` (400KB) and `.report` (200KB)
-- already carry caps; this column had none at all, which made it the one
-- unbounded thing an account could write without limit.
alter table public.matchups
  drop constraint if exists matchups_payload_size;
alter table public.matchups
  add constraint matchups_payload_size
  check (char_length(payload::text) <= 262144);

-- Rows per account. Counting **live rows**, not an append-only log: unlike the
-- daily post caps, deleting a matchup genuinely frees the space this protects,
-- so a deletion should give the room back.
create or replace function public.enforce_matchup_ceiling()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cap  int := 2000;
  v_held int;
begin
  select count(*) into v_held from public.matchups m where m.user_id = new.user_id;
  if v_held >= v_cap then
    raise exception 'matchup ceiling of % reached', v_cap using errcode = 'P0002';
  end if;
  return new;
end;
$$;

-- BEFORE INSERT only. An **update** must always be allowed through: the board
-- upserts on every save, and refusing to store work already in progress would
-- make the ceiling cost exactly what it was meant to protect.
drop trigger if exists matchups_ceiling on public.matchups;
create trigger matchups_ceiling
  before insert on public.matchups
  for each row execute function public.enforce_matchup_ceiling();
