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

The code typed in the app does **not** depend on opening a mail link. Keep `/auth/callback` on the allowlist for a leftover link or a join deep link. If that old link fails, the app asks them to send a new code on this phone.

## Email OTP on phones

**Install sign-in is Email OTP** — a 6-digit code typed in the app (installed PWA, or the Safari tab you add to the Home Screen). Magic-link-only is not the Install path.

1. Open **your** HTTPS origin (not a marketing apex).
2. Tap **Send code**. Read the 6-digit code from email. Type it in the same app and tap **Verify**.
3. You stay signed in here. Then confirm the week, House people, and that both adults can sign in.
4. Partner join is `/join/<token>` only. They use **their** email and the same **Send code → Verify** path — not a magic link to finish.

Do not use a magic link as the way people finish sign-in. Do not turn on Apple, Google, or other SSO for Install. Passwords are optional later. Passkeys are not part of Install.

## Custom SMTP and `{{ .Token }}`

Built-in Supabase mail can smoke-test a code. Free is about 2 emails an hour. For a real household, turn on **custom SMTP** (Resend or similar): host, port, user, and password or API key. Sender name ≈ **Bot My Meals**.

The Auth email template that sends the sign-in code **must include `{{ .Token }}`** so the digits show up. Subject like `Your Bot My Meals code`. Body, code first:

```text
Your sign-in code is {{ .Token }}
Enter it in the Bot My Meals app. It expires soon.
```

If a confirmation URL remains for an old link, keep `{{ .Token }}` above it. Do not make “tap this link” the only instruction.

Only these public keys: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. After an env change, rebuild/redeploy. There is no localStorage sign-in.

## Hard-refresh / Home Screen

- Hard-refresh your origin on both phones.
- If an old Home Screen icon opened the wrong host, delete it and **Share → Add to Home Screen** from your final HTTPS URL.
- A2HS is origin-scoped.

## Wrangler placeholders (do not uncomment)

`wrangler.jsonc` may show a commented example `routes` block with `custom_domain: true`. Uncommenting and deploying would attach DNS from Wrangler. Prefer the dashboard Workers domains UI so a deploy cannot flip DNS by accident.
