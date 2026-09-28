# Household bot check routine

Shared Grok Bots poll this household’s Worker on an adaptive schedule. That poll is the fallback when no webhook is set, and when a wake POST fails.

## Wake on app event

1. In the Bot My Meals Grok Bot, create a routine named “Wake on app event” with a webhook trigger.
2. Instruction: on wake, sync this household (ballot, recipes, shopping list, setup) from the app. Stay quiet if nothing changed.
3. Open the saved routine. Copy **POST to** (the webhook URL) and **key**. The panel keeps them separate. Senders include the key as `Authorization: Bearer <key>`.
4. An Admin pastes both into **House → Wake your Bot**. The Worker stores them as secrets `BOT_WAKE_WEBHOOK_URL` and `BOT_WAKE_WEBHOOK_KEY`. They are not `NEXT_PUBLIC_` and they are not in the browser bundle.
5. DIY alternative: `npx wrangler secret put BOT_WAKE_WEBHOOK_URL` and `npx wrangler secret put BOT_WAKE_WEBHOOK_KEY`.

To let House save those two secrets, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` on the Worker once (Workers Scripts edit for `bot-my-meals`). Without them, use step 5.

The Worker POSTs when the week locks (`week_locked`), when bot status flips to needs work (`needs_work`), and when someone taps **Check now** or **Get recipes now** (`check_now`). The JSON body is only `source`, `event`, `household_host`, and `at`. At most one POST per household per event about every 30 seconds. A failed POST is logged; the schedule still runs, and the screen does not wait on it.

With the URL set, **Check now** says “Wakes your Bot My Meals bot now.” **Get recipes now** says “Wakes your bot to fill recipes and the shopping list.” A recipe that is still waiting says “Wakes your bot to fill this recipe.” If the wake does not go through, the screen says “Couldn’t reach your bot. Try again or message it.” After you save in House, the page shows “Saved. Check now will wake your bot.” and **Saved · Replace**. It does not show the URL or key again. Without the URL, those hints still tell someone to message the Bot.

## Create or update the polling routine

Adaptive is the default.

- Start `@every 1h` when setup is incomplete or work is pending (ballot, meal, portion, a plate/people change the bot still needs to apply, or a locked week still missing recipes or a shopping list).
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
   - `fill_pending` — the week is locked and a dinner is still missing a recipe, or the shopping list is empty when a dinner needs groceries. Write those. Do not invent a list when nothing needs buying.

Never invent grocery prices. Never claim Smith’s cart adds.
