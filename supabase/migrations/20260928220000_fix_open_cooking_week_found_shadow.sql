-- Hotfix: private.open_cooking_week declared a weeks row named found,
-- which shadows PL/pgSQL's boolean FOUND. `if not found` then applied NOT to
-- a weeks composite ("argument of NOT must be type boolean, not type weeks").
-- Next week hits this: plan_next_week, ensure_planning_week, request_week_ballot,
-- and request_saved_for_planning all call open_cooking_week. Those four do not
-- declare a weeks variable named found, and their NOT expressions are boolean.
-- Cooking can still load from a plain weeks select. Rename the row to week_row.

create or replace function private.open_cooking_week(hid uuid)
returns public.weeks
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h public.households%rowtype;
  today date;
  cooking_start date;
  -- week_row must not be named found: that shadows PL/pgSQL's boolean FOUND.
  week_row public.weeks%rowtype;
begin
  select * into h from public.households where id = hid;
  if not found then
    return week_row;
  end if;

  today := private.house_local_date(h.timezone);
  cooking_start := private.week_start(h.week_starts_on, today);

  select * into week_row
  from public.weeks
  where household_id = hid
    and starts_on = cooking_start;

  if week_row.id is not null then
    return week_row;
  end if;

  select * into week_row
  from public.weeks
  where household_id = hid
    and starts_on <= cooking_start
    and not (status = 'locked' and private.week_saturday(starts_on) < today)
  order by starts_on desc
  limit 1;

  if week_row.id is not null then
    return week_row;
  end if;

  select * into week_row
  from public.weeks
  where household_id = hid
    and not (status = 'locked' and private.week_saturday(starts_on) < today)
  order by starts_on asc
  limit 1;

  return week_row;
end;
$$;

revoke all on function private.open_cooking_week(uuid) from public;
