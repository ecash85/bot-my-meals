-- Edit nights on the week you are viewing (cooking or planning).
-- House defaults stay on households.night_headcounts. This save does not rewrite them.
-- Cos applies this migration. Do not run it against a household database from the app repo alone.

-- A blank dinner slot is not a fulfilled ballot. The bot still fulfills when a real title lands.
create or replace function private.fulfill_ballot_request_for_week()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if btrim(coalesce(new.title, '')) = '' then
    return new;
  end if;

  update public.ballot_requests
  set
    status = 'fulfilled',
    fulfilled_at = coalesce(fulfilled_at, now()),
    updated_at = now()
  where household_id = new.household_id
    and week_id = new.week_id
    and status = 'pending';
  return new;
end;
$$;

revoke all on function private.fulfill_ballot_request_for_week() from public;

-- Saves plates for the viewed cooking or planning week.
-- Adds an empty dinner slot when a night turns on after meals exist.
-- Removes that night's dinner when it turns off.
-- Updates servings when the plate count changes and keeps the recipe.
-- Past nights after a mid-week unlock stay as they are.
create or replace function public.save_week_people(
  target_week uuid,
  counts integer[],
  instructions text default null
)
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
  target public.weeks%rowtype;
  effective integer[];
  notes text;
  dinners integer;
  is_planning boolean;
  any_meals boolean;
  i integer;
  night date;
  dow integer;
  plates integer;
  prior integer;
  mid uuid;
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
    raise exception 'Eaters can look, not change nights.';
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
    raise exception 'Only this week and next week can change nights.';
  end if;

  if target.status = 'locked' then
    raise exception 'Unlock this week before changing nights.';
  end if;

  is_planning := target.starts_on = cooking.starts_on + 7;
  effective := counts;

  for i in 0..6 loop
    night := target.starts_on + i;
    dow := extract(dow from night)::int;
    if target.editable_from is not null and night < target.editable_from then
      if target.night_headcounts is not null and cardinality(target.night_headcounts) = 7 then
        effective[dow + 1] := target.night_headcounts[dow + 1];
      else
        prior := null;
        select m.servings into prior
        from public.meals m
        where m.week_id = target.id
          and m.day_index = i;
        if found then
          effective[dow + 1] := least(12, greatest(0, prior));
        else
          effective[dow + 1] := 0;
        end if;
      end if;
    end if;
  end loop;

  select count(*)::integer into dinners from unnest(effective) as headcount where headcount > 0;
  if dinners < 1 then
    raise exception 'Set at least one dinner night (plates above zero).';
  end if;

  if is_planning
    or (target.special_instructions is not null and btrim(target.special_instructions) <> '') then
    notes := nullif(left(btrim(coalesce(instructions, '')), 500), '');
  else
    notes := null;
  end if;

  update public.weeks
  set
    night_headcounts = effective,
    special_instructions = notes,
    people_confirmed_at = coalesce(people_confirmed_at, now())
  where id = target.id;

  select exists (select 1 from public.meals m where m.week_id = target.id) into any_meals;

  if any_meals then
    for i in 0..6 loop
      night := target.starts_on + i;
      dow := extract(dow from night)::int;
      plates := effective[dow + 1];
      if target.editable_from is not null and night < target.editable_from then
        continue;
      end if;

      mid := null;
      select m.id into mid
      from public.meals m
      where m.week_id = target.id
        and m.day_index = i;

      if plates = 0 then
        if mid is not null then
          delete from public.meals where id = mid;
        end if;
      elsif mid is null then
        insert into public.meals (
          household_id,
          week_id,
          day_index,
          night_date,
          title,
          pitch,
          audience,
          servings,
          prep_minutes,
          is_leftovers
        )
        values (
          hid,
          target.id,
          i,
          night,
          '',
          '',
          case when plates = 2 then 'couple' else 'family' end,
          plates,
          30,
          false
        );
      else
        update public.meals
        set
          servings = plates,
          audience = case when plates = 2 then 'couple' else 'family' end
        where id = mid;

        update public.recipes
        set servings = plates
        where meal_id = mid;
      end if;
    end loop;
  end if;

  update public.ballot_requests
  set
    night_headcounts = effective,
    nights_planned = dinners,
    special_instructions = case when is_planning then notes else special_instructions end,
    updated_at = now()
  where week_id = target.id;

  if is_planning and not exists (
    select 1 from public.ballot_requests where week_id = target.id
  ) then
    return private.queue_week_ballot(hid, target.id, uid);
  end if;

  return target.id;
end;
$$;

revoke all on function public.save_week_people(uuid, integer[], text) from public;
grant execute on function public.save_week_people(uuid, integer[], text) to authenticated;

comment on function public.save_week_people(uuid, integer[], text) is
  'Saves plates for the viewed cooking or planning week. Does not change House defaults. Keeps meals in step with the new nights.';

-- Planning-week alias. The empty next-week gate still calls this.
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

  return public.save_week_people(wid, counts, instructions);
end;
$$;

revoke all on function public.save_planning_people(integer[], text) from public;
grant execute on function public.save_planning_people(integer[], text) to authenticated;

comment on function public.save_planning_people(integer[], text) is
  'Saves next week''s plates by calling save_week_people. Does not change House defaults.';
