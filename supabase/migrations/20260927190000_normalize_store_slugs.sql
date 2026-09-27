-- Curated grocers were inserted from the display name. "Smith's" and
-- "Trader Joe's" were slugified to smith-s and trader-joe-s, which the
-- List page did not treat as Smith's / Trader Joe's. Shopping items point
-- at the store id, so correcting the slug is enough.
-- Skip a row when that household already has the catalog slug (unique
-- household_id, slug). The list alias still shows those leftover rows.

update public.household_stores as bad
set slug = 'smiths'
where bad.slug = 'smith-s'
  and not exists (
    select 1
    from public.household_stores as good
    where good.household_id = bad.household_id
      and good.slug = 'smiths'
  );

update public.household_stores as bad
set slug = 'trader-joes'
where bad.slug = 'trader-joe-s'
  and not exists (
    select 1
    from public.household_stores as good
    where good.household_id = bad.household_id
      and good.slug = 'trader-joes'
  );
