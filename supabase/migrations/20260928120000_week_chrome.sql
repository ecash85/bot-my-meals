-- This week chrome: mid-week unlock keeps earlier nights read-only, and
-- Done shopping / Dismiss survives a later lock.

alter table public.weeks
  add column editable_from date,
  add column shopping_prompt text not null default 'open'
    check (shopping_prompt in ('open', 'done', 'dismissed'));

comment on column public.weeks.editable_from is
  'House-local date when an admin unlocked this week. Nights before this date stay read-only. Null until that unlock.';

comment on column public.weeks.shopping_prompt is
  'Open shopping list row on This week. done and dismissed keep it hidden after the week locks again.';
