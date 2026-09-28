-- Empty next week asks for this week's plates before a ballot.
-- House defaults stay on households.night_headcounts. Save does not rewrite them.
-- Optional special_instructions ride the week and the ballot the bot fulfills.

alter table public.weeks
  add column if not exists people_confirmed_at timestamptz,
  add column if not exists night_headcounts integer[],
  add column if not exists special_instructions text;

alter table public.weeks
  drop constraint if exists weeks_night_headcounts_shape;

alter table public.weeks
  add constraint weeks_night_headcounts_shape check (
    night_headcounts is null
    or (
      cardinality(night_headcounts) = 7
      and night_headcounts[1] between 0 and 12
      and night_headcounts[2] between 0 and 12
      and night_headcounts[3] between 0 and 12
      and night_headcounts[4] between 0 and 12
      and night_headcounts[5] between 0 and 12
      and night_headcounts[6] between 0 and 12
      and night_headcounts[7] between 0 and 12
    )
  );

alter table public.weeks
  drop constraint if exists weeks_special_instructions_len;

alter table public.weeks
  add constraint weeks_special_instructions_len check (
    special_instructions is null or char_length(special_instructions) <= 500
  );

alter table public.ballot_requests
  add column if not exists special_instructions text;

alter table public.ballot_requests
  drop constraint if exists ballot_requests_special_instructions_len;

alter table public.ballot_requests
  add constraint ballot_requests_special_instructions_len check (
    special_instructions is null or char_length(special_instructions) <= 500
  );

comment on column public.weeks.people_confirmed_at is
  'Set when this week''s plates are saved. Null on a new planning week means the People per night gate is still open.';

comment on column public.weeks.night_headcounts is
  'Plates for this week only. Null until People per night is saved. Does not replace households.night_headcounts.';

comment on column public.weeks.special_instructions is
  'Optional note for the bot on this week. Empty is fine. At most 500 characters.';

comment on column public.ballot_requests.special_instructions is
  'Copied from the week when the ballot is queued. The bot reads this for that week only.';

-- Weeks that already have meals or a ballot were planned before this gate.
update public.weeks w
set people_confirmed_at = coalesce(w.created_at, now())
where w.people_confirmed_at is null
  and (
    exists (select 1 from public.meals m where m.week_id = w.id)
    or exists (select 1 from public.ballot_requests b where b.week_id = w.id)
  );

-- Plates for a ballot: confirmed week plates when present, otherwise house defaults.
create or replace function private.ballot_plates(hid uuid, wid uuid)
returns table (counts integer[], nights integer, instructions text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h public.households%rowtype;
  w public.weeks%rowtype;
begin
  select * into h from public.households where id = hid;
  select * into w from public.weeks where id = wid;

  if w.night_headcounts is not null and cardinality(w.night_headcounts) = 7 then
    counts := w.night_headcounts;
    select count(*)::integer into nights from unnest(w.night_headcounts) as headcount where headcount > 0;
    instructions := nullif(left(btrim(coalesce(w.special_instructions, '')), 500), '');
  else
    counts := h.night_headcounts;
    nights := h.nights_planned;
    instructions := null;
  end if;

  return next;
end;
$$;

revoke all on function private.ballot_plates(uuid, uuid) from public;

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
  rstatus text;
  counts integer[];
  nights integer;
  notes text;
begin
  select * into h from public.households where id = hid;
  select starts_on into starts from public.weeks where id = wid;
  select p.counts, p.nights, p.instructions into counts, nights, notes
  from private.ballot_plates(hid, wid) as p;

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

  select id, status into rid, rstatus
  from public.ballot_requests
  where household_id = hid
    and week_id = wid
  order by created_at desc
  limit 1;

  if rid is not null then
    if rstatus = 'pending' then
      update public.ballot_requests
      set
        household_size = h.household_size,
        nights_planned = nights,
        night_headcounts = counts,
        special_instructions = notes,
        store_names = stores,
        weekly_budget_cents = h.weekly_budget_cents,
        postal_code = h.postal_code,
        saved_recipe_keys = keys,
        saved_pool_keys = pool,
        updated_at = now()
      where id = rid;
    end if;
    return rid;
  end if;

  insert into public.ballot_requests (
    household_id,
    week_id,
    status,
    household_size,
    nights_planned,
    night_headcounts,
    special_instructions,
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
    nights,
    counts,
    notes,
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
  counts integer[];
  nights integer;
  notes text;
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

  select p.counts, p.nights, p.instructions into counts, nights, notes
  from private.ballot_plates(hid, wid) as p;

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
      nights_planned = nights,
      night_headcounts = counts,
      special_instructions = notes,
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
      special_instructions,
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
      nights,
      counts,
      notes,
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

-- Creates the single planning week. The ballot waits until People per night is saved.
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
  return wid;
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
  confirmed timestamptz;
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
  select w.starts_on, w.people_confirmed_at into starts, confirmed
  from public.weeks w
  where w.id = wid;

  if current_req is not distinct from starts then
    if confirmed is not null then
      perform private.queue_week_ballot(hid, wid, uid);
    end if;
    return 'already';
  end if;

  update public.saved_meals
  set requested_for_week = starts, updated_at = now()
  where household_id = hid
    and recipe_key = key;

  if confirmed is not null then
    perform private.queue_week_ballot(hid, wid, uid);
  end if;

  return 'requested';
end;
$$;

revoke all on function public.request_saved_for_planning(text) from public;
grant execute on function public.request_saved_for_planning(text) to authenticated;

-- Saves this planning week's plates and optional instructions, then queues the ballot.
-- Does not update households.
create or replace function public.save_planning_people(counts integer[], instructions text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  member_role text;
  cooking public.weeks%rowtype;
  wid uuid;
  notes text;
  dinners integer;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select m.household_id, m.role into hid, member_role
  from public.memberships m
  where m.user_id = uid
  order by m.created_at asc
  limit 1;

  if hid is null or member_role not in ('owner', 'voter') then
    raise exception 'Eaters can look, not change this week.';
  end if;

  if counts is null or cardinality(counts) <> 7 then
    raise exception 'Set at least one dinner night (plates above zero).';
  end if;

  if exists (
    select 1
    from unnest(counts) as headcount
    where headcount is null or headcount < 0 or headcount > 12
  ) then
    raise exception 'Set at least one dinner night (plates above zero).';
  end if;

  select count(*)::integer into dinners from unnest(counts) as headcount where headcount > 0;
  if dinners < 1 then
    raise exception 'Set at least one dinner night (plates above zero).';
  end if;

  notes := nullif(left(btrim(coalesce(instructions, '')), 500), '');

  select * into cooking from private.open_cooking_week(hid);
  if cooking.id is null then
    raise exception 'This household has no cooking week yet.';
  end if;

  select id into wid
  from public.weeks
  where household_id = hid
    and starts_on = cooking.starts_on + 7;

  if wid is null then
    raise exception 'Next week is not open yet.';
  end if;

  update public.weeks
  set
    night_headcounts = counts,
    special_instructions = notes,
    people_confirmed_at = coalesce(people_confirmed_at, now())
  where id = wid;

  return private.queue_week_ballot(hid, wid, uid);
end;
$$;

revoke all on function public.save_planning_people(integer[], text) from public;
grant execute on function public.save_planning_people(integer[], text) to authenticated;

comment on function public.plan_next_week() is
  'Creates the single planning week if needed. Does not queue a ballot until People per night is saved. Refuses a week after next.';

comment on function public.request_saved_for_planning(text) is
  'Request for next week. Creates the planning week when missing. Queues a ballot only after People per night is saved. Cool-down still does not apply.';

comment on function public.save_planning_people(integer[], text) is
  'Saves this planning week''s plates and optional special instructions, then queues that week''s ballot. Does not change House defaults.';
