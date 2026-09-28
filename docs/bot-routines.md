# Household bot check routine

Shared Grok Bots poll this household’s Worker on an adaptive schedule. That poll is the fallback when no webhook is set, and when a wake POST fails.

## Wake on app event

1. Create a routine named exactly **Wake on app event** with a webhook trigger. On wake, sync ballot / recipes / shopping list / setup for the week that needs work; stay quiet if nothing changed.
2. Copy **Webhook URL** (the panel may say **POST to**) and the **sender key** if the panel shows one. The Worker sends the key as `Authorization: Bearer <key>`.
3. Paste them into the app at **House → Wake your Bot**. DIY alternative: Worker secrets `BOT_WAKE_WEBHOOK_URL` and optional `BOT_WAKE_WEBHOOK_KEY` (`npx wrangler secret put BOT_WAKE_WEBHOOK_URL`, and the key if you have one). Never `NEXT_PUBLIC_` for these. After save, the app does not show the full secret again (**Saved · Replace**).

To let House save those two secrets, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` on the Worker once (Workers Scripts edit for `bot-my-meals`). Without them, use the DIY `wrangler secret put` commands in step 3.

The Worker POSTs when the week locks (`week_locked`), when bot status flips to needs work (`needs_work`), and when someone taps **Check now** or **Get recipes now** (`check_now`). The JSON body is only `source`, `event`, `household_host`, and `at`. At most one POST per household per event about every 30 seconds. A failed POST is logged; the schedule still runs, and the screen does not wait on it.

With the URL set, **Check now** says “Wakes your Bot My Meals bot now.” **Get recipes now** says “Wakes your bot to fill recipes and the shopping list.” On next week those hints say **next week**. A recipe that is still waiting says “Wakes your bot to fill this recipe.” On next week it says next week. If the wake does not go through, the screen says “Couldn’t reach your bot. Try again or message it.” After you save in House, the page shows “Saved. Check now will wake your bot.” and **Saved · Replace**. It does not show the URL or key again. Without the URL, those hints still tell someone to message the Bot, and Waiting may say how often the bot checks. When the webhook URL is set (`configured` true), Waiting does not teach checks every hour, Adaptive cadence, or a countdown-to-next-poll — voice is wake / instant / **Your bot was notified.** Adaptive `@every 1h` / `@every 6h` stays a silent backend fallback when the webhook is unset or the POST fails. Waiting titles name **This week** or **Next week** when both weeks are open. Shopping list titles are **Shopping · This week** or **Shopping · Next week**. Someone changes week with a **horizontal swipe** on the date strip (or the optional edge ‹ ›) — not a chip row. From This week, that future swipe or › creates **Next week** when it is missing, lands there, and asks **People per night** first (all 7 nights, Off / Solo / Couple / Family, prefill from House defaults, optional **Special instructions** on the same step; empty OK) before any ballot. Save needs plates above zero on at least one night. Toast: **Next week started. Set people per night.** House People per night stays the template for new weeks only. It cannot open a week after next. Title labels **This week** / **Next week** are status, not the switcher.

## Create or update the polling routine

Adaptive is the default.

- Start `@every 1h` when setup is incomplete or work is pending on **any open week** (this week or next week: ballot, meal, portion, a plate/people change the bot still needs to apply, or a locked week still missing recipes or that week’s shopping list).
- Otherwise `@every 6h` (nothing waiting). A settled cooking week does not hide a next-week ballot.
- If the owner picks a fixed check in **House → Bot check frequency**, keep that interval: `@every 1h`, `@every 3h`, or `@every 6h`.

On each run:

1. `GET /api/bot/status` with a household member’s Supabase access token: `Authorization: Bearer <access_token>`. Row Level Security scopes the read to that household. The body is small: `needs_work`, `reason`, and `cadence` (`mode`, `interval_hours`, `phase`). It is not a full household snapshot.
2. Read `cadence`. Set this routine to `@every {interval_hours}h`. Adaptive reports `1` while `phase` is `active` and `6` while `phase` is `idle`. Fixed reports `1`, `3`, or `6`. If the owner changed Settings, update the routine to match.
3. If `needs_work` is false, stay silent. Do not send a “no update” message. `reason` may be `idle`, or `setup_incomplete` (keep the hourly routine, still say nothing).
4. If `needs_work` is true, fulfill `reason` for the week that needs work and stop:
   - `pending_ballot` — waiting for dinners on an open week (this week or next week). For next week, use that ballot’s `night_headcounts` and optional `special_instructions`. Empty instructions mean nothing extra. Do not write them back onto House plate defaults.
   - `meal_pending` — an open swap or a new-dinner request on that week
   - `portion_pending` — a dinner’s servings don’t match the plates
   - `plate_or_people_change` — plates or household size changed and a dinner’s servings still need to catch up
   - `fill_pending` — that week is locked and a dinner is still missing a recipe, or that week’s shopping list is empty when a dinner needs groceries. Write those. Each week has its own list. Do not invent a list when nothing needs buying, and do not merge this week with next week.

Never invent grocery prices. Never claim Smith’s cart adds.
