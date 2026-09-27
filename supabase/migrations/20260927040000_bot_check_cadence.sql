-- How often the household Grok Bot checks for work.
-- adaptive (default): hourly while setup is incomplete or bot work is pending,
-- every 6 hours when the week is settled. fixed: always 1, 3, or 6 hours.
-- Existing household RLS applies (households_member_read, households_owner_update).
-- No extra policy: these columns stay household-scoped like the other household fields.

alter table public.households
  add column if not exists bot_check_mode text not null default 'adaptive',
  add column if not exists bot_check_interval_hours smallint;

alter table public.households
  drop constraint if exists households_bot_check_cadence_check;

alter table public.households
  add constraint households_bot_check_cadence_check
  check (
    (bot_check_mode = 'adaptive' and bot_check_interval_hours is null)
    or (bot_check_mode = 'fixed' and bot_check_interval_hours in (1, 3, 6))
  );

comment on column public.households.bot_check_mode is
  'adaptive (default) or fixed. Adaptive is hourly while setup or bot work is pending, every 6 hours when idle.';

comment on column public.households.bot_check_interval_hours is
  '1, 3, or 6 when bot_check_mode is fixed. Null when adaptive.';
