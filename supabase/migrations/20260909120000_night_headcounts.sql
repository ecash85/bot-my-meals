-- Per-weekday plate counts. Sun–Sat, 1–12. Source of truth for meal servings.

alter table public.households
  add column if not exists night_headcounts integer[] not null default '{4,4,4,4,4,2,2}';

update public.households
set night_headcounts = array[
  case when 0 = any (couple_nights) then couple_size else family_size end,
  case when 1 = any (couple_nights) then couple_size else family_size end,
  case when 2 = any (couple_nights) then couple_size else family_size end,
  case when 3 = any (couple_nights) then couple_size else family_size end,
  case when 4 = any (couple_nights) then couple_size else family_size end,
  case when 5 = any (couple_nights) then couple_size else family_size end,
  case when 6 = any (couple_nights) then couple_size else family_size end
]
where cardinality(night_headcounts) <> 7
   or night_headcounts = '{4,4,4,4,4,2,2}'::integer[];

alter table public.households
  drop constraint if exists households_night_headcounts_shape;

alter table public.households
  add constraint households_night_headcounts_shape check (
    cardinality(night_headcounts) = 7
    and night_headcounts[1] between 1 and 12
    and night_headcounts[2] between 1 and 12
    and night_headcounts[3] between 1 and 12
    and night_headcounts[4] between 1 and 12
    and night_headcounts[5] between 1 and 12
    and night_headcounts[6] between 1 and 12
    and night_headcounts[7] between 1 and 12
  );

-- Sample week servings follow the household's night_headcounts.
create or replace function public.seed_demo_week()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  role text;
  wid uuid;
  starts date;
  store_tj uuid;
  store_sm uuid;
  meal_ids uuid[] := '{}';
  rec_id uuid;
  i int;
  counts integer[];
  plates integer;
  titles text[] := array[
    'Lemon roast chicken',
    'Chicken tostadas',
    'Mandarin orange chicken',
    'Sheet-pan sausage and peppers',
    'Spaghetti and meat sauce',
    'Pan-seared salmon',
    'Steak tacos for two'
  ];
  pitches text[] := array[
    'One chicken, potatoes, and green beans. Monday will thank you.',
    'Sunday''s roast, crisped tortillas, salsa, and a little cheese.',
    'The Trader Joe''s bag everyone actually wants, plus rice and broccoli.',
    'Sausage, peppers, onions, and potatoes on one pan.',
    'A pot of sauce, a box of pasta, a green salad. Thursday solved.',
    'Two fillets, asparagus, lemon. Date-night energy on a Friday.',
    'A small skillet of steak, onions, and tortillas. No leftovers on purpose.'
  ];
begin
  select m.household_id, m.role into hid, role
  from public.memberships m
  where m.user_id = auth.uid()
  limit 1;

  if hid is null or role <> 'owner' then
    raise exception 'Only a household owner can seed the week';
  end if;

  select id into store_tj from public.household_stores where household_id = hid and slug = 'trader-joes';
  select id into store_sm from public.household_stores where household_id = hid and slug = 'smiths';
  if store_tj is null or store_sm is null then
    raise exception 'Household needs Trader Joe''s and Smith''s stores';
  end if;

  select week_starts_on, night_headcounts into i, counts from public.households where id = hid;
  if cardinality(counts) <> 7 then
    counts := '{4,4,4,4,4,2,2}';
  end if;
  starts := private.week_start(i, current_date);

  delete from public.weeks where household_id = hid and starts_on = starts;

  insert into public.weeks (household_id, starts_on, status)
  values (hid, starts, 'voting')
  returning id into wid;

  for i in 0..6 loop
    plates := counts[extract(dow from starts + i)::int + 1];
    insert into public.meals (
      household_id, week_id, day_index, night_date, title, pitch, audience, servings, prep_minutes, is_leftovers
    )
    values (
      hid,
      wid,
      i,
      starts + i,
      titles[i + 1],
      pitches[i + 1],
      case when plates = 2 then 'couple' else 'family' end,
      plates,
      case i
        when 0 then 80
        when 1 then 20
        when 2 then 25
        when 3 then 40
        when 4 then 35
        else 25
      end,
      i = 1
    )
    returning id into rec_id;
    meal_ids := meal_ids || rec_id;
  end loop;

  update public.meals
  set leftover_of_meal_id = meal_ids[1]
  where id = meal_ids[2];

  insert into public.recipes (household_id, meal_id, servings, prep_minutes, cook_minutes, steps)
  values (hid, meal_ids[1], 4, 15, 65, '[
    "Heat the oven to 425°F.",
    "Pat the chicken dry. Rub with olive oil, salt, pepper, and smashed garlic.",
    "Stuff the cavity with lemon halves. Scatter potatoes around the pan.",
    "Roast 60–70 minutes, until the thigh reads 165°F.",
    "In the last 15 minutes, toss green beans with oil and roast on a second sheet.",
    "Rest the chicken 10 minutes. Save leftover meat for Monday."
  ]'::jsonb)
  returning id into rec_id;
  insert into public.recipe_ingredients (household_id, recipe_id, name, quantity, unit, store_id) values
    (hid, rec_id, 'Whole chicken', 1, 'ct', store_sm),
    (hid, rec_id, 'Yukon gold potatoes', 2, 'lb', store_sm),
    (hid, rec_id, 'Green beans', 1, 'lb', store_sm),
    (hid, rec_id, 'Lemons', 2, 'ct', store_tj),
    (hid, rec_id, 'Garlic', 1, 'head', store_tj),
    (hid, rec_id, 'Olive oil', 3, 'tbsp', store_tj);

  insert into public.recipes (household_id, meal_id, servings, prep_minutes, cook_minutes, steps)
  values (hid, meal_ids[2], 4, 10, 10, '[
    "Shred leftover chicken and warm it with a spoon of salsa.",
    "Crisp tortillas in a dry skillet or the oven.",
    "Pile on chicken, cheese, lettuce, and more salsa."
  ]'::jsonb)
  returning id into rec_id;
  insert into public.recipe_ingredients (household_id, recipe_id, name, quantity, unit, store_id) values
    (hid, rec_id, 'Corn tortillas', 8, 'ct', store_tj),
    (hid, rec_id, 'Salsa', 1, 'jar', store_tj),
    (hid, rec_id, 'Shredded Mexican cheese', 6, 'oz', store_tj),
    (hid, rec_id, 'Romaine lettuce', 1, 'head', store_sm);

  insert into public.recipes (household_id, meal_id, servings, prep_minutes, cook_minutes, steps)
  values (hid, meal_ids[3], 4, 5, 20, '[
    "Cook rice.",
    "Bake the orange chicken according to the bag.",
    "Steam or roast broccoli until just tender."
  ]'::jsonb)
  returning id into rec_id;
  insert into public.recipe_ingredients (household_id, recipe_id, name, quantity, unit, store_id) values
    (hid, rec_id, 'Mandarin orange chicken', 2, 'bags', store_tj),
    (hid, rec_id, 'Jasmine rice', 2, 'cups', store_tj),
    (hid, rec_id, 'Broccoli crowns', 2, 'ct', store_sm);

  insert into public.recipes (household_id, meal_id, servings, prep_minutes, cook_minutes, steps)
  values (hid, meal_ids[4], 4, 10, 30, '[
    "Heat the oven to 425°F.",
    "Toss sliced potatoes, peppers, and onions with oil and salt.",
    "Nestle sausages on the sheet and roast 25–30 minutes."
  ]'::jsonb)
  returning id into rec_id;
  insert into public.recipe_ingredients (household_id, recipe_id, name, quantity, unit, store_id) values
    (hid, rec_id, 'Italian sausage', 2, 'lb', store_sm),
    (hid, rec_id, 'Bell peppers', 3, 'ct', store_sm),
    (hid, rec_id, 'Yellow onions', 2, 'ct', store_sm),
    (hid, rec_id, 'Baby potatoes', 1.5, 'lb', store_sm),
    (hid, rec_id, 'Olive oil', 2, 'tbsp', store_tj);

  insert into public.recipes (household_id, meal_id, servings, prep_minutes, cook_minutes, steps)
  values (hid, meal_ids[5], 4, 10, 25, '[
    "Brown the beef with chopped onion and garlic.",
    "Stir in the jarred sauce and simmer 15 minutes.",
    "Boil spaghetti in salted water until al dente."
  ]'::jsonb)
  returning id into rec_id;
  insert into public.recipe_ingredients (household_id, recipe_id, name, quantity, unit, store_id) values
    (hid, rec_id, 'Ground beef', 1.5, 'lb', store_sm),
    (hid, rec_id, 'Spaghetti', 1, 'lb', store_tj),
    (hid, rec_id, 'Marinara sauce', 1, 'jar', store_tj),
    (hid, rec_id, 'Yellow onion', 1, 'ct', store_sm),
    (hid, rec_id, 'Mixed salad greens', 1, 'bag', store_tj);

  insert into public.recipes (household_id, meal_id, servings, prep_minutes, cook_minutes, steps)
  values (hid, meal_ids[6], 2, 10, 15, '[
    "Pat salmon dry and season with salt and pepper.",
    "Sear skin-side down in a hot skillet 4 minutes, then flip for 2–3.",
    "Roast asparagus at 425°F with oil and salt, about 12 minutes."
  ]'::jsonb)
  returning id into rec_id;
  insert into public.recipe_ingredients (household_id, recipe_id, name, quantity, unit, store_id) values
    (hid, rec_id, 'Salmon fillets', 2, 'ct', store_sm),
    (hid, rec_id, 'Asparagus', 1, 'bunch', store_sm),
    (hid, rec_id, 'Lemon', 1, 'ct', store_tj),
    (hid, rec_id, 'Olive oil', 2, 'tbsp', store_tj);

  insert into public.recipes (household_id, meal_id, servings, prep_minutes, cook_minutes, steps)
  values (hid, meal_ids[7], 2, 10, 20, '[
    "Slice steak thin against the grain. Season well.",
    "Sear in a very hot skillet in batches so it browns.",
    "Cook onions in the same pan until soft.",
    "Warm tortillas and serve with salsa and cilantro."
  ]'::jsonb)
  returning id into rec_id;
  insert into public.recipe_ingredients (household_id, recipe_id, name, quantity, unit, store_id) values
    (hid, rec_id, 'Flank steak', 0.75, 'lb', store_sm),
    (hid, rec_id, 'Flour tortillas', 6, 'ct', store_tj),
    (hid, rec_id, 'Yellow onion', 1, 'ct', store_sm),
    (hid, rec_id, 'Salsa', 1, 'jar', store_tj),
    (hid, rec_id, 'Cilantro', 1, 'bunch', store_sm);

  update public.recipes r
  set servings = m.servings
  from public.meals m
  where r.meal_id = m.id
    and m.week_id = wid;

  return wid;
end;
$$;
