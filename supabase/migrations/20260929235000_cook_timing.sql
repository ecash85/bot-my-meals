-- Cook timing for long smokes and overnight prep.
-- Nullable on purpose: old recipes keep working, and null means "not set"
-- so the app can read a rest or an overnight step out of the step text.
-- dinner_time is the local serve time. Start-by counts backward from it.
-- Change households.dinner_time to move one house. The app fallback is
-- DEFAULT_DINNER_TIME in src/lib/cook-timing.ts (18:00).

alter table public.households
  add column if not exists dinner_time time not null default '18:00';

comment on column public.households.dinner_time is
  'Local serve time. Start-by is this clock minus prep, cook, and rest. Default 18:00 (6:00 PM).';

alter table public.recipes
  add column if not exists rest_minutes integer;

alter table public.recipes
  add column if not exists ahead_steps jsonb;

alter table public.recipes
  drop constraint if exists recipes_rest_minutes_check;

alter table public.recipes
  add constraint recipes_rest_minutes_check
  check (rest_minutes is null or rest_minutes >= 0);

alter table public.recipes
  drop constraint if exists recipes_ahead_steps_check;

alter table public.recipes
  add constraint recipes_ahead_steps_check
  check (ahead_steps is null or jsonb_typeof(ahead_steps) = 'array');

comment on column public.recipes.rest_minutes is
  'Minutes the meat rests after cooking. Null means unset (the app may read a rest out of steps). Zero means no rest.';

comment on column public.recipes.ahead_steps is
  'JSON array of {"label": text, "lead_minutes": int}. lead_minutes counts backward from households.dinner_time. Null means unset. [] means no ahead step. Use for dry brine, inject, rub, marinate, thaw, or a smoke that starts the previous evening.';
