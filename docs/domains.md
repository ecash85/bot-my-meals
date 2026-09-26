# Domains and Auth

`wrangler deploy` **does not flip DNS**. Do not uncomment `custom_domain` routes in `wrangler.jsonc`. Worker name stays **`bot-my-meals`** — do not rename it.

Paid managed `{handle}.botmymeals.com` is later. Do not build billing or multi-tenant hosting. DIY users are **not** put on `{handle}.botmymeals.com`.

## Your HTTPS origin

| Hostname | What it is |
| --- | --- |
| `https://bot-my-meals.<your-subdomain>.workers.dev` | Default Worker URL (`workers_dev` left on) |
| Your custom domain | Optional dashboard attach to **your** Worker |

Phones should open **your** final HTTPS origin. Set Supabase Auth to match that origin.

## Supabase Auth allowlist (DIY)

On **your** Supabase project:

- **Site URL** = `https://<your-host>` (workers.dev or your domain)
- **Redirect URLs**:
  - `https://<your-host>`
  - `https://<your-host>/auth/callback`

Do **not** set Site URL to someone else’s house. Do **not** add `{handle}.botmymeals.com` wildcards for DIY.

## Magic link on phones

1. Open **your** HTTPS origin (not a marketing apex).
2. **Request the link on this phone, then open the email on this same phone.** Opening the link on another device sends you back to login.
3. Open the magic link in **Safari on the same phone** that requested it. Opening it in **Gmail’s in-app browser** (or on another device) can bounce you back to login / fail PKCE.
4. Land in the household (same Supabase project).
5. Confirm the week, House people, and that both adults can sign in.

## Hard-refresh / Home Screen

- Hard-refresh your origin on both phones.
- If an old Home Screen icon opened the wrong host, delete it and **Share → Add to Home Screen** from your final HTTPS URL.
- A2HS is origin-scoped.

## Wrangler placeholders (do not uncomment)

`wrangler.jsonc` may show a commented example `routes` block with `custom_domain: true`. Uncommenting and deploying would attach DNS from Wrangler. Prefer the dashboard Workers domains UI so a deploy cannot flip DNS by accident.
