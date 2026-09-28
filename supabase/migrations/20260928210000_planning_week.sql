-- One cooking week and one planning week.
-- Cooking is the house calendar week (or the latest still-open week before today).
-- Planning is exactly seven days later. A third open week is refused.
-- Saved Request creates the planning row when it is missing and queues that week's ballot.
-- Shopping lists stay one per week (shopping_lists.week_id is already unique).

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
  found public.weeks%rowtype;
begin
  select * into h from public.households where id = hid;
  if not found then
    return found;
  end if;

  today := private.house_local_date(h.timezone);
  cooking_start := private.week_start(h.week_starts_on, today);

  select * into found
  from public.weeks
  where household_id = hid
    and starts_on = cooking_start;

  if found.id is not null then
    return found;
  end if;

  select * into found
  from public.weeks
  where household_id = hid
    and starts_on <= cooking_start
    and not (status = 'locked' and private.week_saturday(starts_on) < today)
  order by starts_on desc
  limit 1;

  if found.id is not null then
    return found;
  end if;

  select * into found
  from public.weeks
  where household_id = hid
    and not (status = 'locked' and private.week_saturday(starts_on) < today)
  order by starts_on asc
  limit 1;

  return found;
end;
$$;

revoke all on function private.open_cooking_week(uuid) from public;

create or replace function private.ensure_planning_week(hid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cooking public.weeks%rowtype;
  today date;
  tz text;
  next_start date;
  wid uuid;
begin
  select * into cooking from private.open_cooking_week(hid);
  if cooking.id is null then
    raise exception 'This household has no cooking week yet.';
  end if;

  select timezone into tz from public.households where id = hid;
  today := private.house_local_date(tz);
  next_start := cooking.starts_on + 7;

  if exists (
    select 1
    from public.weeks
    where household_id = hid
      and starts_on > next_start
      and not (status = 'locked' and private.week_saturday(starts_on) < today)
  ) then
    raise exception 'Only one next week can be open.';
  end if;

  select id into wid
  from public.weeks
  where household_id = hid
    and starts_on = next_start;

  if wid is null then
    insert into public.weeks (household_id, starts_on, status)
    values (hid, next_start, 'voting')
    returning id into wid;
  end if;

  return wid;
end;
$$;

revoke all on function private.ensure_planning_week(uuid) from public;

-- Insert a pending ballot only when this week has none yet.
-- A fulfilled ballot stays fulfilled; explicit requests still sit on saved_meals.
create or replace function private.queue_week_ballot(hid uuid, wid uuid, uid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.households%rowtype;
  starts date;
  stores text[];
  keys text[];
  pool text[];
  rid uuid;
begin
  select * into h from public.households where id = hid;
  select starts_on into starts from public.weeks where id = wid;

  select id into rid
  from public.ballot_requests
  where household_id = hid
    and week_id = wid
  order by created_at desc
  limit 1;

  if rid is not null then
    return rid;
  end if;

  select coalesce(array_agg(name order by sort_order, name), '{}')
  into stores
  from public.household_stores
  where household_id = hid;

  select coalesce(array_agg(sm.recipe_key order by sm.saved_at desc), '{}')
  into keys
  from public.saved_meals sm
  where sm.household_id = hid
    and sm.requested_for_week = starts;

  select coalesce(array_agg(sm.recipe_key order by sm.saved_at desc), '{}')
  into pool
  from public.saved_meals sm
  where sm.household_id = hid
    and sm.requested_for_week is null
    and (
      sm.last_locked_at is null
      or sm.last_locked_at <= now() - interval '21 days'
    );

  insert into public.ballot_requests (
    household_id,
    week_id,
    status,
    household_size,
    nights_planned,
    night_headcounts,
    store_names,
    weekly_budget_cents,
    postal_code,
    requested_by,
    saved_recipe_keys,
    saved_pool_keys
  )
  values (
    hid,
    wid,
    'pending',
    h.household_size,
    h.nights_planned,
    h.night_headcounts,
    stores,
    h.weekly_budget_cents,
    h.postal_code,
    uid,
    keys,
    pool
  )
  returning id into rid;

  return rid;
end;
$$;

revoke all on function private.queue_week_ballot(uuid, uuid, uuid) from public;

create or replace function public.lock_week(target_week uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  cooking public.weeks%rowtype;
  target public.weeks%rowtype;
  lid uuid;
begin
  select household_id into hid
  from public.memberships
  where user_id = auth.uid()
  order by created_at asc
  limit 1;

  if hid is null then
    raise exception 'Not in a household';
  end if;

  select * into target
  from public.weeks
  where id = target_week
    and household_id = hid;

  if target.id is null then
    raise exception 'That week is not in this household.';
  end if;

  select * into cooking from private.open_cooking_week(hid);
  if cooking.id is null
    or (
      target.starts_on is distinct from cooking.starts_on
      and target.starts_on is distinct from cooking.starts_on + 7
    ) then
    raise exception 'Only this week and next week can be locked.';
  end if;

  update public.weeks
  set status = 'locked'
  where id = target.id;

  delete from public.shopping_lists where week_id = target.id;

  insert into public.shopping_lists (household_id, week_id)
  values (hid, target.id)
  returning id into lid;

  insert into public.shopping_items (
    household_id, shopping_list_id, store_id, name, quantity, unit
  )
  select
    hid,
    lid,
    ri.store_id,
    ri.name,
    sum(ri.quantity),
    ri.unit
  from public.meals m
  join public.recipes r on r.meal_id = m.id
  join public.recipe_ingredients ri on ri.recipe_id = r.id
  where m.week_id = target.id
    and not exists (
      select 1
      from (
        select distinct on (v.meal_id) v.meal_id, v.choice
        from public.votes v
        join public.memberships mem on mem.id = v.membership_id
        where v.meal_id = m.id
          and mem.role in ('owner', 'voter')
        order by v.meal_id, v.updated_at desc, v.id desc
      ) latest
      where latest.choice = 'remove'
    )
  group by ri.store_id, lower(btrim(ri.name)), ri.unit, ri.name;

  return lid;
end;
$$;

revoke all on function public.lock_week(uuid) from public;
grant execute on function public.lock_week(uuid) to authenticated;

create or replace function public.lock_current_week()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  cooking public.weeks%rowtype;
begin
  select household_id into hid
  from public.memberships
  where user_id = auth.uid()
  limit 1;

  if hid is null then
    raise exception 'Not in a household';
  end if;

  select * into cooking from private.open_cooking_week(hid);
  if cooking.id is null then
    raise exception 'This household has no cooking week yet.';
  end if;

  return public.lock_week(cooking.id);
end;
$$;

drop function if exists public.request_week_ballot();

create or replace function public.request_week_ballot(target_starts date default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  wid uuid;
  starts date;
  cooking public.weeks%rowtype;
  h public.households%rowtype;
  stores text[];
  rid uuid;
  keys text[];
  pool text[];
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select household_id into hid
  from public.memberships
  where user_id = uid and role = 'owner'
  order by created_at asc
  limit 1;

  if hid is null then
    raise exception 'Only an Admin can create this week''s meals.';
  end if;

  select * into h from public.households where id = hid;
  if not found then
    raise exception 'Household not found';
  end if;

  select * into cooking from private.open_cooking_week(hid);
  if cooking.id is null then
    raise exception 'This household has no cooking week yet.';
  end if;

  if target_starts is null then
    wid := cooking.id;
    starts := cooking.starts_on;
  else
    if target_starts is distinct from cooking.starts_on
      and target_starts is distinct from cooking.starts_on + 7 then
      raise exception 'Only this week and next week can be open.';
    end if;

    select id, starts_on into wid, starts
    from public.weeks
    where household_id = hid
      and starts_on = target_starts;

    if wid is null then
      raise exception 'That week is not open yet.';
    end if;
  end if;

  select coalesce(array_agg(name order by sort_order, name), '{}')
  into stores
  from public.household_stores
  where household_id = hid;

  select coalesce(array_agg(sm.recipe_key order by sm.saved_at desc), '{}')
  into keys
  from public.saved_meals sm
  where sm.household_id = hid
    and sm.requested_for_week = starts;

  select coalesce(array_agg(sm.recipe_key order by sm.saved_at desc), '{}')
  into pool
  from public.saved_meals sm
  where sm.household_id = hid
    and sm.requested_for_week is null
    and (
      sm.last_locked_at is null
      or sm.last_locked_at <= now() - interval '21 days'
    );

  select id into rid
  from public.ballot_requests
  where household_id = hid
    and week_id = wid
    and status = 'pending'
  order by created_at desc
  limit 1;

  if rid is not null then
    update public.ballot_requests
    set
      household_size = h.household_size,
      nights_planned = h.nights_planned,
      night_headcounts = h.night_headcounts,
      store_names = stores,
      weekly_budget_cents = h.weekly_budget_cents,
      postal_code = h.postal_code,
      requested_by = uid,
      saved_recipe_keys = keys,
      saved_pool_keys = pool,
      updated_at = now()
    where id = rid;
  else
    insert into public.ballot_requests (
      household_id,
      week_id,
      status,
      household_size,
      nights_planned,
      night_headcounts,
      store_names,
      weekly_budget_cents,
      postal_code,
      requested_by,
      saved_recipe_keys,
      saved_pool_keys
    )
    values (
      hid,
      wid,
      'pending',
      h.household_size,
      h.nights_planned,
      h.night_headcounts,
      stores,
      h.weekly_budget_cents,
      h.postal_code,
      uid,
      keys,
      pool
    )
    returning id into rid;
  end if;

  update public.households
  set setup_step = 8
  where id = hid
    and setup_step < 8;

  return rid;
end;
$$;

grant execute on function public.request_week_ballot(date) to authenticated;

create or replace function public.plan_next_week()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  wid uuid;
  starts date;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select household_id into hid
  from public.memberships
  where user_id = uid and role = 'owner'
  order by created_at asc
  limit 1;

  if hid is null then
    raise exception 'Only an Admin can plan next week.';
  end if;

  wid := private.ensure_planning_week(hid);
  select starts_on into starts from public.weeks where id = wid;
  return public.request_week_ballot(starts);
end;
$$;

revoke all on function public.plan_next_week() from public;
grant execute on function public.plan_next_week() to authenticated;

create or replace function public.request_saved_for_planning(recipe_key text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  member_role text;
  key text := btrim(recipe_key);
  wid uuid;
  starts date;
  current_req date;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if key is null or key = '' then
    raise exception 'That saved meal is gone.';
  end if;

  select m.household_id, m.role into hid, member_role
  from public.memberships m
  where m.user_id = uid
  order by m.created_at asc
  limit 1;

  if hid is null or member_role not in ('owner', 'voter') then
    raise exception 'Eaters can look, not change saved meals.';
  end if;

  select sm.requested_for_week into current_req
  from public.saved_meals sm
  where sm.household_id = hid
    and sm.recipe_key = key;

  if not found then
    raise exception 'That saved meal is gone.';
  end if;

  wid := private.ensure_planning_week(hid);
  select w.starts_on into starts from public.weeks w where w.id = wid;

  if current_req is not distinct from starts then
    perform private.queue_week_ballot(hid, wid, uid);
    return 'already';
  end if;

  update public.saved_meals
  set requested_for_week = starts, updated_at = now()
  where household_id = hid
    and recipe_key = key;

  perform private.queue_week_ballot(hid, wid, uid);
  return 'requested';
end;
$$;

revoke all on function public.request_saved_for_planning(text) from public;
grant execute on function public.request_saved_for_planning(text) to authenticated;

comment on function public.plan_next_week() is
  'Creates the single planning week if needed and queues its ballot. Refuses a week after next.';

comment on function public.request_saved_for_planning(text) is
  'Request for next week. Creates the planning week when missing, sets requested_for_week to that start, and queues a ballot if the week has none. Cool-down still does not apply.';

comment on function public.lock_week(uuid) is
  'Locks the cooking week or the planning week and rebuilds that week''s shopping list only.';
