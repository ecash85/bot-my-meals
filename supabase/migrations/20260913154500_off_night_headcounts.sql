-- Allow 0 plates so a weekday can be an off night.

alter table public.households
  drop constraint if exists households_night_headcounts_shape;

alter table public.households
  add constraint households_night_headcounts_shape check (
    cardinality(night_headcounts) = 7
    and night_headcounts[1] between 0 and 12
    and night_headcounts[2] between 0 and 12
    and night_headcounts[3] between 0 and 12
    and night_headcounts[4] between 0 and 12
    and night_headcounts[5] between 0 and 12
    and night_headcounts[6] between 0 and 12
    and night_headcounts[7] between 0 and 12
  );
