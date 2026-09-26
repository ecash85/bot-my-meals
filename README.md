# Bot My Meals

This week's dinners, agreed.

Bot My Meals is a household dinner planner: one shared week of meal titles, voting adults you add yourself, and recipes plus a store-split shopping list only after the week locks. It is a phone-first installable PWA. The data model is household-scoped from day one so a later paid multi-household product does not require a rewrite.

This is a public household PWA template (v1 for one family). There is no billing and no invented grocery prices. This README is the public setup guide.

Install a **real Cloudflare Worker + Supabase Free so both phones stay in sync.** Never demo/localStorage as the product path. If the two public keys are missing or invalid, every route shows the **setup gate** — not a household on this phone. Only two public keys; never service-role in git or Worker. Never invent grocery prices. Cart adds only where the store actually supports them — don’t claim Smith’s or any store cart add unless it’s real. Do NOT invent prices. Do NOT claim unsupported cart features.

## The loop

A new **This week** starts empty: **No dinners yet.** Empty week is one of these CTAs — no Seed / sample week:

- Setup incomplete → **Finish house setup**
- Setup done, no request → **Create this week's meals** (writes `ballot_requests` via `request_week_ballot()`)
- Pending → **Waiting for your Bot…**
- Ballot live → normal dual-approve UI

Once dinners are on the week:

1. A week has seven proposed dinners (title, who eats, servings, time, one-line pitch).
2. Each voting member can **Swap** or **Remove** a night. No tap leaves the dinner as-is.
3. Actions are visible live. A swap can include a note (“too heavy”, “want tacos”).
4. The week **locks after swaps and dinner requests are cleared.** Removed nights and untouched dinners do not block lock.
5. After lock: full recipes and a merged shopping list, split by store. Removed nights are omitted. Prices stay blank unless a real source and as-of date exist.
6. Before lock, the list screen shows meal titles only.

Swap a night, propose a replacement (or mark leftovers from an earlier night), and that row’s votes reset.

Each household sets **People per night** (Sun–Sat) under **House**. That count is the serving size for that weekday. Zero is an **Off night** (no dinner planned). One is **Solo night**. Two is **Couple night**. Any other count is **Family night**. Setup asks household size, then nights this week (1–7); active nights default to household size. Admins can change any night (0–12).

**Users** can swap or remove a night. **Admins** also manage people, stores, people-per-night, and unlock the week. The last Admin cannot be removed or demoted.

A new household starts with **no stores**. Admins enter a zip or postal code and pick regional grocers from a static list, or type **Add a store**. Labels only — never invent grocery prices; cart adds only where the store actually supports them (don’t claim Smith’s or any store cart add unless it’s real). Trader Joe’s and Smith’s are not inserted on create.

## Setup

Do these in order. Phones stay in sync only after a real Worker, a new Supabase Free project, Auth, and the two public env vars all point at the same HTTPS origin.

**Order that matters**

1. Deploy (or already know the **final HTTPS origin** phones will open) **before** setting Supabase Site URL.
2. Finish Auth + the two public env vars **before** creating the Admin or adding a partner.
3. **Add to Home Screen** can happen as soon as the HTTPS URL works (Safari **Share → Add to Home Screen**). Do not wait for household creation. Sign-in and adding people still need magic link + env.

Missing, blank, or invalid `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` is an **incomplete install**. The app **builds** without those values, but every route shows the first-run **setup gate** (“Set up the real house”) until they are set and the Worker is rebuilt / redeployed. There is no localStorage household fallback.

### 1. Create a free Cloudflare account

Sign up at [Cloudflare](https://dash.cloudflare.com/sign-up). The free plan is enough.

You will also need a GitHub account so Cloudflare can connect a repo (see whose repo in step 2).

### 2. Deploy Worker `bot-my-meals` with Workers Builds

This is the easy default for anyone. Cloudflare dashboard → connect GitHub to Worker **`bot-my-meals`**. Do **not** start with a terminal `npm run deploy` (that is only for people who already develop).

1. Open the Cloudflare dashboard.
2. Create or open the Worker named **`bot-my-meals`**.
3. Go to **Settings → Builds**.
4. Connect the GitHub repo (see whose repo below).
5. Use this table:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | leave blank (repo root) |
| Build command | `npm run build:worker` |
| Deploy command | `node scripts/cf-deploy.mjs` |
| Non-production branch deploy command | `npm run deploy:preview` |
| Build watch paths — Include | `src/*, public/*, scripts/*, package.json, package-lock.json, .npmrc, wrangler.jsonc, open-next.config.ts, next.config.ts` |
| Build watch paths — Exclude | (leave empty, or exclude docs-only paths if you prefer) |

`npm run build:worker` (not bare `npx opennextjs-cloudflare build`) and `npm run deploy` (root or this repo) still target Worker **`bot-my-meals`**. `scripts/cf-deploy.mjs` promotes on `main` and uploads preview versions on other branches. If the Cloudflare dashboard still has the old build command `npx opennextjs-cloudflare build`, change it to `npm run build:worker`. That is a **command** update, not a hostname/DNS change.

Watch paths and click-by-click: [`docs/workers-builds.md`](docs/workers-builds.md).

Save and let the first build finish.

**Whose GitHub repo to connect**

- Use **Use this template** or **Fork** on GitHub, then connect **your** copy to Workers Builds.

**Whose HTTPS origin**

- **DIY / households:** `https://bot-my-meals.<your-subdomain>.workers.dev`, or a custom domain **you** attach to **your** Worker. Not `{handle}.botmymeals.com`.
- Do not use `{handle}.botmymeals.com` — that is not a DIY hostname.

Do not use `www.botmymeals.com` as the app.

**Know this HTTPS origin now.** Site URL and the Auth redirect must match the host people actually open (custom domain or workers.dev — no `www` unless configured). Set Auth to that origin before the first magic link. Auth allowlist details: [`docs/domains.md`](docs/domains.md).

Once this URL loads, you may already **hand back the HTTPS URL + Safari Add to Home Screen**. You do not need a household first. Without the two public keys, the page shows the setup gate — finish Auth + env before creating the Admin.

Hosting is Cloudflare Workers, Wrangler, and [OpenNext for Next.js](https://opennext.js.org/cloudflare). Not Vercel.

### 3. Create a new Supabase Free project

Create a **new** project. Do not reuse another app’s database.

A Las Vegas-adjacent region (`us-west-1`) is fine.

### 4. Run every migration, in filename order

The app needs **all eight** files under [`supabase/migrations/`](supabase/migrations/). Paste each into the Supabase SQL Editor and run it, in this order — or use `supabase db push` if the CLI is already linked to this project.

1. `supabase/migrations/20260902120000_init.sql`
2. `supabase/migrations/20260909120000_night_headcounts.sql`
3. `supabase/migrations/20260909130000_manage_members.sql`
4. `supabase/migrations/20260912205000_ballot_passive_lock.sql`
5. `supabase/migrations/20260913154500_off_night_headcounts.sql`
6. `supabase/migrations/20260917120000_grant_private_schema_usage.sql`
7. `supabase/migrations/20260917140000_house_setup_join_tokens.sql`
8. `supabase/migrations/20260917160000_wizard_v2_ballot_request.sql`

Skipping a file (or running them out of order) will break people, lock, off nights, or the post-create setup / invite link. File 6 grants `authenticated` `USAGE` on schema `private` — without it, Create household can succeed while you stay on **Create household**. File 7 adds `/join/<token>` links. File 8 is wizard v2 (`household_size`, `nights_planned`, `postal_code`, `ballot_requests`, no default Trader Joe’s / Smith’s on create).

### 5. Auth: Email magic link, then lock the Site URL

Do this only after you know the final HTTPS origin from step 2.

In Supabase Auth:

1. Enable **Email** magic link. There is no password.
2. Set **Site URL** to the **same** HTTPS origin phones will open.
3. Add this **Redirect URL**: `https://<that-host>/auth/callback`

Examples:

- DIY: your workers.dev or your domain and `https://<that-host>/auth/callback`
- Keep workers.dev on the allowlist if anyone still opens that host

The app sends magic links to `` `${window.location.origin}/auth/callback` ``. If Site URL / Redirect URL do not match the host people actually open, the link will not finish sign-in.

**Set these to the final phone URL before anyone taps “Email me a sign-in link.”** Changing the host later means updating Auth and sending a new link.

Magic-link email is the **only** email path (Supabase Auth). Bot My Meals does not send any other email.

### 6. Set the two public env vars, then rebuild / redeploy

On the Worker (Worker variables **and** Builds variables, so the next build can see them), set **only** these two public keys:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Copy both from the Supabase project settings (Project URL and anon / public key).

Then **rebuild / redeploy** so Next picks them up. Setting the vars without a new build leaves the setup gate up (the running site still behaves as if they are missing).

**Never** put the Supabase **service-role** key in Worker vars, Builds vars, git, `.env.local`, `.dev.vars`, or `wrangler.jsonc`. Only two public keys; never service-role in git or Worker.

### 7. Hand back the HTTPS URL + Safari Add to Home Screen

Open the origin from step 2 on the phone.

On iPhone Safari: **Share → Add to Home Screen**. You can do this as soon as the URL works. Do not block A2HS on household creation.

The app ships a web manifest, service worker (offline shell), apple-touch icon, standalone display, and `viewport-fit=cover` safe areas.

Admin and partner sign-in still need Auth + the two env vars (steps 5–6). If you still see the setup gate, the install is incomplete — finish env and redeploy before creating the household.

### 8. First signed-in person creates the household (Admin)

Auth + env first. Then, on that phone:

1. Enter an email and tap **Email me a sign-in link**.
2. **Check your email** — open the link on this same phone (Safari, not Gmail’s in-app browser). Opening on another device sends you back to login.
3. After sign-in you will see **Create household**.
4. Enter a household name and tap **Create household**.
5. Walk the **7-step house setup** below (progress: **Setup · step N of 7**, saved on the household). There is no Seed / sample week.

That person becomes the first **Admin**. Nobody is hard-coded. There is no Tim or Rose to recreate.

If Create household seems to work (or fails quietly) but you stay on **Create household** and never reach This week / House, the database grant is missing — see [Gotchas](#gotchas).

A household is a **Supabase row** on this same Worker — not a second Worker.

#### After Create household: house setup

Magic link: after Request link, **Check your email** — open the link on this same phone (Safari, not Gmail’s in-app browser). Opening on another device sends you back to login.

Walk through house setup (no Seed / sample week). Progress is **Setup · step N of 7**.

1. **Invite people** — share `https://<our-host>/join/<token>` via share sheet (invite links only). Partner opens `/join/<token>` in Safari on their phone (not Gmail’s in-app browser).
2. **How many people?** — household size stepper.
3. **Which nights?** — Sun–Sat toggles, all on by default. Easy off per day.
4. **Optional:** adjust plates on On nights (guests / couple nights).
5. **Stores** — enter zip/postal, multi-select regional grocers, or type in a store. No default stores. Labels only — never invent grocery prices; cart adds only where the store actually supports them.
6. **Optional** weekly meal budget (or skip).
7. Tap **Create this week's meals** — app writes a ballot request and shows **Waiting for your Bot…** until the ballot appears. **Copy paste for your Grok Bot** is DIY fallback only (collapsed).

Empty This week: **Finish house setup** (if incomplete), **Create this week's meals** / **Waiting for your Bot…** (if setup done), or the dual-approve ballot when it lands.

### 9. Add the other adult

Share the textable invite link from setup step 1 or **House → Invite** (**Share invite link**). The URL looks like `https://<host>/join/<token>`. Optional share text: “Join our Bot My Meals house — open this on your phone:” plus the URL. Invite links only — there is no code to type. Partner opens `/join/<token>` in Safari on their phone (not Gmail’s in-app browser).

You can still **House → People** → **Add a person** (name, email, Admin or User). They appear under **Waiting to sign in** until they sign in. Bot My Meals does not email this invite. There is no SMS gateway.

On the second phone they:

1. Open the **invite link** on that phone (or the same HTTPS origin, then sign in).
2. Add to Home Screen if they want (Safari **Share → Add to Home Screen**) — they do not need a household first.
3. New person: request a magic-link sign-in with **their** email on that same phone (needs Auth + env). After **Check your email**, they open the link on this same phone (Safari, not Gmail’s in-app browser). Opening on another device sends them back to login. Then the app claims the link and puts them in the house.
4. Already signed in: tap **Continue**.
5. Expired, used, or invalid link: the page says why and asks them to get a new link.

**Users** can vote. **Admins** can also manage the house.

Row Level Security is household-scoped (`household_id`). Admins manage memberships (`set_member_role`, `remove_member`) and `household_invites`. Recipes and shopping rows are readable only after that household’s week is locked. A database trigger refuses to lock if a swap or dinner request is still open. The last Admin cannot be removed or demoted.

## Gotchas

- **Missing env = incomplete install.** Blank, unset, or invalid `NEXT_PUBLIC_*` shows the **setup gate** on every route. That is not a household. Do not stop at “try it without Supabase.” There is no localStorage household fallback.
- **Stuck on Create household.** Create household can look like it worked (or fail with no message) while you never enter This week / House. Likely cause: migrations incomplete — `authenticated` needs `USAGE` on schema `private`. Run every file in [step 4](#4-run-every-migration-in-filename-order) in order, including `20260917120000_grant_private_schema_usage.sql`, then hard-refresh.
- **Vars need a rebuild.** After setting the two public keys, rebuild/redeploy so Next inlines them.
- **`npm run deploy` is not the easy household path.** If you already develop: it only promotes production from `main`; any other branch → preview upload only (`wrangler versions upload`).
- **Magic-link email is the only email.** Supabase Auth sends it when someone asks for a sign-in link. House → People does not email anyone.
- **RLS is household-scoped.** Other families cannot see this table. The last Admin cannot be removed or demoted.
- **One Worker name.** Script name `bot-my-meals`. Same Cloudflare account → name collision if you try to reuse it. Households are extra Supabase rows, not extra Workers.

## Rules we do not break

- Real Cloudflare Worker + Supabase Free so both phones stay in sync.
- Never demo/localStorage as the product path. Missing keys show the setup gate, not a phone-only household.
- Only two public keys; never service-role in git or Worker.
- Hand back HTTPS URL + Safari Add to Home Screen.
- Never invent grocery prices. Cart adds only where the store actually supports them — don’t claim Smith’s or any store cart add unless it’s real. Do NOT invent prices. Do NOT claim unsupported cart features.

## Ask your Grok Bot (optional)

This hosting guide does **not** require creating a Grok Bot. Teammate / bot setup is separate. If you already have a helper bot, you can paste:

```
Set up Bot My Meals for our household. Use only free Cloudflare Workers + Supabase Free — no localStorage/demo-only path.


Do this, one decision at a time if you need me to click:
1) Help me create a Cloudflare account and deploy the Worker named bot-my-meals from https://github.com/timdoes/bot-my-meals via Workers Builds (Cloudflare dashboard → connect GitHub). Terminal npm run deploy only if I already develop.
2) Create a new Supabase Free project.
3) Run every file in supabase/migrations/ in filename order (SQL editor or supabase db push).
4) Enable Email magic link. Set Site URL to our final phone HTTPS URL (our workers.dev or our own domain — not {handle}.botmymeals.com) and Redirect URL to https://<that-host>/auth/callback — before the first magic link.
5) Set only these two public Worker env vars, then redeploy: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Never use the service-role key.
6) Give me the HTTPS link, walk me through Add to Home Screen, create the household Admin, finish the 7-step setup, then add my partner (share the /join/<token> link; House → People still works).

Magic link: after Request link, Check your email — open the link on this same phone (Safari, not Gmail’s in-app browser). Opening on another device sends you back to login.

After Create household, walk through house setup (no Seed/sample week):
1) Invite people — share https://<our-host>/join/<token> via share sheet (invite links only). Partner opens /join/<token> in Safari on their phone (not Gmail’s in-app browser).
2) How many people? — household size stepper.
3) Which nights? — Sun–Sat toggles, all on by default. Easy off per day.
4) Optional: adjust plates on On nights (guests / couple nights).
5) Stores — enter zip/postal, multi-select regional grocers, or type in a store. No default stores. Labels only — never invent grocery prices; cart adds only where the store actually supports them.
6) Optional weekly meal budget (or skip).
7) Tap Create this week's meals — app writes a ballot request and shows Waiting for your Bot… until the ballot appears. Copy paste for your Grok Bot is DIY fallback only (collapsed).
Empty This week: Finish house setup (if incomplete), Create this week's meals / Waiting for your Bot… (if setup done), or the dual-approve ballot when it lands.

Rules: easy for anyone; never invent grocery prices; cart adds only where the store actually supports them (don’t claim Smith’s or any store cart add unless it’s real). Do NOT invent prices. Do NOT claim unsupported cart features. Don’t stop at “try it without Supabase.” Worker name stays bot-my-meals.
```

## If you already develop

CLI-first order is for developers only — not the household install path. The easy default for anyone remains Workers Builds (dashboard → connect GitHub). Run these from the **repo root** (workspaces) or from this repo.

```bash
npm ci
npm test
npm run lint
npm run build:worker
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147) for the household app. Copy [`.env.example`](.env.example) to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the same new Supabase project. Leave them blank only to confirm the setup gate. There is no localStorage household fallback. Two-phone / real-house use needs those vars.

```bash
npm run deploy
```

`npm run deploy` (root or this repo) is only this alternate: it builds with OpenNext, then runs [`scripts/cf-deploy.mjs`](scripts/cf-deploy.mjs) (root [`scripts/cf-deploy.mjs`](scripts/cf-deploy.mjs) delegates there). **Production promote is `main` only** (`wrangler deploy` on Worker `bot-my-meals`). Any other branch → preview upload only (`wrangler versions upload`).

`npm run build` (and OpenNext) run `prebuild`, which writes PWA icons into `public/icons` and `src/app/favicon.ico` / `src/app/icon.png`.

## CI/CD

[![CI](https://github.com/timdoes/bot-my-meals/actions/workflows/ci.yml/badge.svg)](https://github.com/timdoes/bot-my-meals/actions/workflows/ci.yml)

`main` → production is the intended path. GitHub Actions is the **gate**. Workers Builds is the **deploy**. Do not run both as competing production deploys.

| Job | Where | When |
| --- | --- | --- |
| Checks | GitHub Actions [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Every pull request, every push to `main`, and `workflow_call` |
| Production deploy (household) | Cloudflare **Workers Builds** | `main` changes matching the watch paths in [`docs/workers-builds.md`](docs/workers-builds.md) (`src/*`, `public/*`, `scripts/*`, `package.json`, `package-lock.json`, `.npmrc`, `wrangler.jsonc`, `open-next.config.ts`, `next.config.ts`) → Worker **`bot-my-meals`**. Build `npm run build:worker`. Deploy `node scripts/cf-deploy.mjs`. After cutover phones use https://bot-my-meals.<your-subdomain>.workers.dev ([`docs/domains.md`](docs/domains.md)). |

Actions runs `npm ci`, `npm test`, `npm run lint`, and `npm run build:worker`. The OpenNext smoke build does **not** need Cloudflare credentials. Actions does **not** deploy. Keep the Cloudflare API token out of this repo and out of GitHub unless you later retire Workers Builds and switch deploy to Actions on purpose.

Required GitHub secrets for an Actions deploy (not used today): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. If those are ever added, delete or disable the Workers Builds production deploy first so two systems do not both promote `main`.

### One-time: connect GitHub in the Cloudflare dashboard


1. [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → open Worker **`bot-my-meals`**.
2. **Settings → Builds → Connect** (skip Connect if Git is already linked; still fix commands + watch paths).
3. If prompted, install / authorize the **Cloudflare Workers and Pages** GitHub App on your GitHub account. Limit it to **your** fork or template copy of this repo.
4. Select **your** fork or template copy of this repo.
5. **Settings → Builds → Branch control**: production branch `main`. Check **Builds for non-production branches** if you want PR preview URLs and Cloudflare PR comments.
6. Save. The next matching push (or merge) to `main` should build and go live. Watch-path skips apply after you save.


Optional on GitHub: **Settings → Branches** → protect `main` and require the **CI / Test** check before merge.

## Schema

`Household` (including `setup_step` 1–7 wizard / 8 done, `household_size`, `nights_planned`, `postal_code`, and optional `weekly_budget_cents`), `Membership` (owner / voter / eater), `User` (`auth.users` + `profiles`), `Week`, `Meal`, `Vote`, `Recipe`, `ShoppingList`, `ShoppingItem` (store tag, quantity, optional `price_cents` + `price_source` + `priced_at`). Pending people live in `household_invites` until they sign in. Textable partner links live in `household_join_tokens` (`/join/<token>`). Meal Ops inbox is `ballot_requests` (pending → fulfilled when meals are inserted).

Eaters can belong to the household later without voting. Only owner and voter roles count toward lock. Households are rows in this schema, not separate Workers.

## PWA

The app ships a web manifest, service worker (offline shell), apple-touch icon, standalone display, and `viewport-fit=cover` safe areas. On iPhone Safari: Share → Add to Home Screen. You can install as soon as the HTTPS URL works; you do not need a household first.

## Tests

`npm test` runs Vitest once (`vitest run`). Specs are `src/**/*.test.ts` and run in Node (`vitest.config.ts`). There is no coverage script.

GitHub Actions runs `npm ci`, then `npm test`, `npm run lint`, and `npm run build:worker` (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

