-- RLS helpers live in schema `private`. EXECUTE on those functions is not
-- enough: PostgreSQL also requires USAGE on the schema. Without it,
-- is_household_member() fails with "permission denied for schema private",
-- membership reads return no row (the client used to ignore that error),
-- and Create household looks dead after a successful insert.

grant usage on schema private to authenticated;

create or replace function public.create_household(household_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  uid uuid := auth.uid();
  starts date;
  label text := nullif(trim(household_name), '');
  pname text;
  pemail text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if label is null then
    raise exception 'Give the household a name.';
  end if;

  select m.household_id into hid
  from public.memberships m
  where m.user_id = uid
  order by m.created_at asc
  limit 1;

  if hid is not null then
    if not exists (select 1 from public.weeks w where w.household_id = hid) then
      starts := private.week_start(0, current_date);
      insert into public.weeks (household_id, starts_on, status)
      values (hid, starts, 'voting');
    end if;
    return hid;
  end if;

  insert into public.profiles (id, email, display_name)
  select
    u.id,
    u.email,
    coalesce(
      u.raw_user_meta_data ->> 'display_name',
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Neighbor'
    )
  from auth.users u
  where u.id = uid
  on conflict (id) do nothing;

  select display_name, email into pname, pemail
  from public.profiles
  where id = uid;

  insert into public.households (name)
  values (label)
  returning id into hid;

  insert into public.memberships (household_id, user_id, role, display_name, email)
  values (
    hid,
    uid,
    'owner',
    coalesce(nullif(pname, ''), 'Neighbor'),
    pemail
  );

  if not found then
    raise exception 'Could not add you to this household.';
  end if;

  insert into public.household_stores (household_id, name, slug, sort_order)
  values
    (hid, 'Trader Joe''s', 'trader-joes', 0),
    (hid, 'Smith''s', 'smiths', 1);

  starts := private.week_start(0, current_date);
  insert into public.weeks (household_id, starts_on, status)
  values (hid, starts, 'voting');

  return hid;
end;
$$;

grant execute on function public.create_household(text) to authenticated;
