# Saved meals

Household-shared pool. One row per dinner the house wants again. It is not a private shelf and not a promise that every saved meal appears every week.

Cool-down is **21 days (3 weeks)** after `last_locked_at` — the last time that dinner was on a **locked** week — before a random ballot may suggest it again. Saving does not start the clock. **Request for next week** sets `requested_for_week` and bypasses cool-down for that week.

The app does not invent a second waiting screen. Explicit requests ride the existing `ballot_requests` inbox (`saved_recipe_keys`) when that week’s ballot is pending or created. Until a week row exists, the request lives only on `saved_meals`.

## Table `public.saved_meals`

| Column | Meaning |
| --- | --- |
| `household_id` | House. Either voter (owner or voter) may insert, update, or delete. Every member may read. |
| `recipe_key` | Stable identity. `recipes.recipe_key` when Meal Ops stamped one, otherwise the normalized title (trim, lower case, collapsed spaces). Unique per household. |
| `title` | Latest title the house should see. |
| `saved_at` | When someone saved it. Sort the manage list by this, newest first. |
| `last_locked_at` | Last locked cook. Null until then, so an unlocked save can be suggested sooner. |
| `requested_for_week` | `weeks.starts_on` the house asked for. Null if not requested. |
| `source_recipe_id` | Recipe row at save time. Set null if that recipe is deleted. Not a forever copy of the steps. |

Row Level Security: household members `select`. Owner and voter `insert` / `update` / `delete`. Service role bypasses RLS.

A week transitioning to `locked` stamps `last_locked_at` for saved keys that match a real dinner that night (not leftovers, not remove / skip / request-new). Matching dinners on `requested_for_week` clear the request.

## How Meal Ops reads the pool

Service role, for one household:

```sql
select recipe_key, title, saved_at, last_locked_at, requested_for_week, source_recipe_id
from public.saved_meals
where household_id = $household
order by saved_at desc;
```

Explicit asks for a week (include these even inside cool-down):

```sql
select recipe_key, title, source_recipe_id
from public.saved_meals
where household_id = $household
  and requested_for_week = $week_starts_on;
```

Random pool (no outstanding request, and either never locked or last lock at least 21 days ago):

```sql
select recipe_key, title, source_recipe_id
from public.saved_meals
where household_id = $household
  and requested_for_week is null
  and (last_locked_at is null or last_locked_at <= now() - interval '21 days');
```

The same split is `ballot_role` on `public.saved_meal_pool(target_starts date)` for a signed-in household member (`requested`, `pool`, or `cooldown`).

When an Admin creates or refreshes this week’s meals, `request_week_ballot()` copies:

- `ballot_requests.saved_recipe_keys` — `requested_for_week` equals that week’s `starts_on` (include these; cool-down does not apply)
- `ballot_requests.saved_pool_keys` — saved meals with no outstanding request whose `last_locked_at` is null or at least 21 days ago (optional random sample, not a promise)

A pending ballot’s `saved_recipe_keys` updates when a voter requests or removes. `saved_pool_keys` is a snapshot from propose time. The live pool is still `saved_meals`.

## Writing the dinner back

Set `recipes.recipe_key` to the pool’s `recipe_key` on the new week’s recipe. The title key still matches if the title is unchanged and no stamp was stored. Use `source_recipe_id` only while that recipe row still exists. Do not invent grocery prices or cart claims from this pool.
