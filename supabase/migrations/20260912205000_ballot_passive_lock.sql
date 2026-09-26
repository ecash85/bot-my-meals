-- Ballot-1: skip → remove, drop approve rows (absence = passive approve),
-- and lock when there are night slots, a voter, and no open swap / pending add.

update public.votes
set choice = 'remove'
where choice = 'skip';

delete from public.votes
where choice = 'approve';

alter table public.votes drop constraint if exists votes_choice_check;

alter table public.votes
  add constraint votes_choice_check
  check (choice in ('swap', 'remove', 'request_new_meal'));

create or replace function private.enforce_week_lock()
returns trigger
language plpgsql
as $$
declare
  voter_count integer;
  night_count integer;
  blockers integer;
begin
  if new.status = 'locked' and old.status is distinct from 'locked' then
    select count(*) into voter_count
    from public.memberships mem
    where mem.household_id = new.household_id
      and mem.role in ('owner', 'voter');

    select count(*) into night_count
    from public.meals m
    where m.week_id = new.id;

    with latest as (
      select distinct on (v.meal_id)
        v.meal_id,
        v.choice
      from public.votes v
      join public.memberships mem on mem.id = v.membership_id
      join public.meals m on m.id = v.meal_id
      where m.week_id = new.id
        and mem.role in ('owner', 'voter')
        and v.choice in ('swap', 'remove', 'request_new_meal')
      order by v.meal_id, v.updated_at desc, v.id desc
    )
    select count(*) into blockers
    from latest
    where choice in ('swap', 'request_new_meal');

    if voter_count = 0 then
      raise exception 'Week cannot lock without a voting member';
    end if;
    if night_count = 0 then
      raise exception 'Week cannot lock until this week has at least one night';
    end if;
    if blockers > 0 then
      raise exception 'Week cannot lock while a swap or new-meal request is open';
    end if;
    new.locked_at = coalesce(new.locked_at, now());
  end if;
  if new.status = 'voting' then
    new.locked_at = null;
  end if;
  return new;
end;
$$;

create or replace function public.lock_current_week()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  wid uuid;
  lid uuid;
begin
  select household_id into hid
  from public.memberships
  where user_id = auth.uid()
  limit 1;

  if hid is null then
    raise exception 'Not in a household';
  end if;

  select id into wid
  from public.weeks
  where household_id = hid
  order by starts_on desc
  limit 1;

  update public.weeks
  set status = 'locked'
  where id = wid;

  delete from public.shopping_lists where week_id = wid;

  insert into public.shopping_lists (household_id, week_id)
  values (hid, wid)
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
  where m.week_id = wid
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
