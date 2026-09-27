# Household bot check routine

Shared Grok Bots poll this household’s Worker. The app does not push, and **Check now** only tells someone to message their Bot.

## Create or update the routine

Adaptive is the default.

- Start `@every 1h` when setup is incomplete or work is pending (ballot, meal, portion, or a plate/people change the bot still needs to apply).
- Otherwise `@every 6h` (week settled, nothing pending).
- If the owner picks a fixed check in **House → Bot check frequency**, keep that interval: `@every 1h`, `@every 3h`, or `@every 6h`.

On each run:

1. `GET /api/bot/status` with a household member’s Supabase access token: `Authorization: Bearer <access_token>`. Row Level Security scopes the read to that household. The body is small: `needs_work`, `reason`, and `cadence` (`mode`, `interval_hours`, `phase`). It is not a full household snapshot.
2. Read `cadence`. Set this routine to `@every {interval_hours}h`. Adaptive reports `1` while `phase` is `active` and `6` while `phase` is `idle`. Fixed reports `1`, `3`, or `6`. If the owner changed Settings, update the routine to match.
3. If `needs_work` is false, stay silent. Do not send a “no update” message. `reason` may be `idle`, or `setup_incomplete` (keep the hourly routine, still say nothing).
4. If `needs_work` is true, fulfill `reason` and stop:
   - `pending_ballot` — waiting for this week’s dinners
   - `meal_pending` — an open swap or a new-dinner request
   - `portion_pending` — a dinner’s servings don’t match the plates
   - `plate_or_people_change` — plates or household size changed and a dinner’s servings still need to catch up

Never invent grocery prices. Never claim Smith’s cart adds.
