# Deployment

This guide covers deploying Apex Fitness as a standalone Node process. Nothing here has
been executed against a live host — the steps are written against the code as it stands
and need to be run by you, with your own host and your own credentials.

The recommended target is a single Railway or Render service with a mounted volume. See
[Railway / Render](#railway--render-managed-container) below. Every other section applies
to any host, because the app is a plain Node server with one persistent file.

## What you are deploying

A `next build` / `next start` server with a SQLite database file. There is no container
image and no Dockerfile. The `docker-compose.yml`, `backend/` and `frontend/` scaffolding the
workspace generator produced has been removed from the repository; none of it is used. The
schema's datasource is SQLite and every query goes through
`@prisma/adapter-better-sqlite3`, so the database is a single file on local disk.

That single fact drives most of the decisions below: the host must have a **persistent,
writable filesystem**, and rolling deployments that run two instances at once will
produce two divergent SQLite files unless the filesystem is shared.

## Prerequisites

- Node.js — the project was developed and tested against v24.16.0. `package.json` now
  declares `"engines": { "node": ">=24" }`, so the host must run Node 24 or later.
- A writable persistent directory for the SQLite file. The absolute path comes from
  `DATABASE_URL`; relative paths resolve against the process working directory, which for
  Prisma means the project root.
- A Stripe account, **only if** you intend to take real payments. Without
  `STRIPE_SECRET_KEY` the app runs entirely on the simulated billing provider and never
  contacts Stripe.
- An Anthropic API key, **only if** you want the live coach. Without
  `ANTHROPIC_API_KEY` the coach answers from the simulated provider, which is a working
  implementation, not a placeholder.

## Environment variables

Set these in your host's environment-variable facility. Do not write them into the
repository; `.gitignore` excludes `.env` and `.env.*`.

### Required

| Variable | Read by | Value |
| --- | --- | --- |
| `DATABASE_URL` | `lib/db.ts`, `prisma.config.ts`, `prisma/seed.ts`, `scripts/verify-seed.ts` | SQLite connection string, e.g. `file:/var/lib/apex/dev.db`. Use an absolute path in production so the file does not move when the working directory does. Falls back to `file:./prisma/dev.db` if unset — do not rely on that in production. |

### Required only when Stripe is configured

| Variable | Read by | Value |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `lib/services/billing/{index,stripe}.ts`, `pages/api/webhooks/stripe.ts` | Stripe secret key. **Its presence is the switch** that selects the real billing provider. Unset means the simulated provider. |
| `STRIPE_PRICE_ID_PREMIUM` | `lib/services/billing/stripe.ts` | Price ID for the premium subscription. Falls back to the literal `price_premium_monthly`, which no real account recognises — checkout will fail if this is unset alongside a real key. |
| `STRIPE_WEBHOOK_SECRET` | `pages/api/webhooks/stripe.ts` | Endpoint signing secret from the Stripe dashboard. Without it the webhook route returns 400 `WEBHOOK_SECRET_MISSING` for every request, so `checkout.session.completed` never fires and nobody is upgraded after a real payment. |

### Recommended

| Variable | Read by | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `lib/services/billing/stripe.ts` | Absolute public origin, e.g. `https://apex.example.com`. Builds the Checkout success/cancel and portal return URLs. Falls back to `http://localhost:3000` — leave it unset and users are redirected to localhost after paying. |
| `NEXT_PUBLIC_PREMIUM_PRICE_LABEL` | `pages/checkout.tsx` | Display price, e.g. `$9.99/month`. Falls back to "Price shown at checkout". Inlined at build time — changing it requires a rebuild. |

### Optional

| Variable | Read by | Value |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `lib/services/coach/index.ts` | Selects the live coach. Unset → simulated coach. |
| `NEXT_DIST_DIR` | `next.config.ts` | Build directory override. Leave unset; only the Playwright suite sets it. |

### Do not set

`NODE_ENV` is set by `next dev` / `next build` / `next start`. `lib/auth.ts` reads it to
add the `Secure` attribute to the session cookie, so overriding it to anything but
`production` in a production deploy ships cookies without `Secure`. `CI` is for GitHub
Actions only.

## Build

```bash
npm ci
npm run build
```

`npm ci` triggers the `postinstall` hook, which runs `prisma generate`. The
`build` and `typecheck` scripts also run `prisma generate` themselves, so a fresh checkout
cannot reach a step that imports `@/lib/db` with no Prisma Client present — the failure
mode is ~20 confusing "no exported member 'PrismaClient'" errors across pages, API routes
and tests. `npm run build` writes to `.next` (`distDir` is no longer overridden).

## Database migrations

```bash
npx prisma migrate deploy
```

Use `migrate deploy`, not `migrate dev`. `migrate dev` is for local development: it can
generate new migrations, prompts interactively, and applies a reset. `migrate deploy`
only applies the migrations already in `prisma/migrations/` and never drops data.

There is one migration, `prisma/migrations/20260924181352_init`. The `DATABASE_URL` file
must already exist for SQLite — `migrate deploy` creates it if the directory is writable.

## Seed

Optional, and only for a fresh database. There is no data in production that comes from
the seed except content:

```bash
npm run db:seed
```

This upserts 12 workouts and 3 meal plans by slug, and rewrites each plan's meals. It
creates **no users** — accounts come from `/signup`. It is idempotent and safe to re-run,
but running it against a live database overwrites any edits made to that content through
the database. It aborts rather than writing if its own invariants fail (exactly 12
workouts, exactly 1 premium workout, 1 free and 2 premium plans, no duplicate slugs, no
duplicate video IDs, meal macros within 10% of stated calories).

## Start

```bash
npm run start
```

Requires `npm run build` first. Next 16 takes a single dev-server lock per project
directory; `next start` is not affected, but do not run two `next start` processes against
the same SQLite file.

## Post-deploy verification

Run these in order against the deployed origin.

**1. The process is up and the database is reachable.**

```bash
curl -i https://<origin>/
```

Expect `200`. A `500` on the landing page usually means `DATABASE_URL` points somewhere
unwritable or the Prisma Client was not generated at build time.

**2. The API envelope is intact.**

```bash
curl -s https://<origin>/api/workouts | head -c 200
```

Expect `{"ok":true,"data":[...]}` with 12 workouts. Anything else means the route is
throwing before it reaches `ok()`.

**3. A session cookie is issued on signup, and it is `HttpOnly`.**

```bash
curl -si -X POST https://<origin>/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Verify","email":"verify-<stamp>@example.test","password":"verify-password-123"}' \
  -c cookies.txt
```

Expect `200` and a `Set-Cookie: fitness_session=…; HttpOnly; Path=/; SameSite=Lax; …`
header. In production there must also be `Secure`. Confirm the cookie carries no
`Max-Age` problem by re-sending it:

```bash
curl -s https://<origin>/api/auth/me -b cookies.txt
```

Expect `{"ok":true,"data":{…}}` with `"subscriptionTier":"free"`. An unauthenticated call
to the same route must return `401` with `{"ok":false,"error":{"code":"UNAUTHORISED",…}}` —
if it returns 200, the cookie is being read somewhere it should not be.

**4. Free-tier gating is enforced server-side, not just in the UI.**

With the free cookie from step 3:

```bash
curl -s https://<origin>/api/workouts/advanced-dumbbell-full-body -b cookies.txt
```

Expect `403` `PREMIUM_REQUIRED`. The list endpoint should still *show* that workout with
`locked: true` — that is intended, so the upsell is visible.

```bash
curl -s https://<origin>/api/diet-plans -b cookies.txt
```

Expect 1 plan (`lean-cut`). Anonymous (`curl` with no cookie) should return 3 plans but
with `meals: []` on the two premium ones — the summaries ship so the pricing is visible
before signup, the content does not. If anonymous returns full meals, that is a leak.

```bash
curl -s -X POST https://<origin>/api/ai/chat -b cookies.txt \
  -H 'Content-Type: application/json' -d '{"message":"hello"}'
```

Expect `403` `PREMIUM_REQUIRED`.

**5. Premium unlocks the coach and the volume series.**

Flip a test user to premium:

```bash
npx prisma db execute --url "$DATABASE_URL" --stdin <<< "UPDATE User SET subscriptionTier='premium' WHERE email='verify-<stamp>@example.test';"
```

Re-run `/api/progress` and expect a `volumeSeries` key that was absent before. Re-run the
chat call and expect `200` with a real answer. If `ANTHROPIC_API_KEY` is unset, the reply
comes from the simulated coach and should mention the user's own logged numbers — that is
the correct result, not a failure.

**6. Content is present and correct.**

```bash
npx tsx scripts/verify-seed.ts
```

Run it against the deployed database. Expect `MACRO CHECK PASS`, 12 workouts, and
`premium=advanced-dumbbell-full-body`.

**7. If Stripe is configured, checkout and the webhook.**

Start checkout:

```bash
curl -s -X POST https://<origin>/api/billing/checkout -b cookies.txt \
  -H 'Content-Type: application/json' -d '{"tier":"premium"}'
```

Expect an `https://` Stripe URL. A relative URL, or a `simulated=1` URL, means
`STRIPE_SECRET_KEY` is not set in the running process.

Point a Stripe webhook endpoint at `https://<origin>/api/webhooks/stripe`, subscribe it to
`checkout.session.completed`, and send a test event. Expect `200 {"received":true}`. A
`400 INVALID_SIGNATURE` means the signing secret is wrong; `400 WEBHOOK_SECRET_MISSING`
means `STRIPE_WEBHOOK_SECRET` is not set. Confirm the user's tier actually flips — that
update, in the `checkout.session.completed` branch, is the only path that grants premium
after a real payment.

**8. Typecheck and tests pass before you ship.**

```bash
npm run typecheck
npm test
```

CI runs both on every push to `main` and blocks the deploy if either fails, so this is
checked automatically. Note that `run-checks.ps1` is not a useful gate here: its
detected-stack list is empty, so it reports success without running anything against this
project.

## Railway / Render (managed container)

The fastest route to a live URL with full functionality, and the one the CI workflow
targets. No code change is needed: the app is already a plain Node server.

Render if you prefer no vendor lock-in; Railway if you want the cheapest single service.
The two setups below are identical apart from where you click.

### 1. Create the service and mount a volume

**Railway** — New Project → Deploy from GitHub repo → pick `sandeepsilumula/ApexFitness`.
Then right-click the service → Mount Volume → `/data`. The volume is what makes SQLite
survive a redeploy; without it every deploy resets the database and all accounts are lost.

**Render** — New → Web Service → connect the repo. Under Disks, mount a disk at `/data`.
The default free tier has no disk and no persistent filesystem, so a free Render service
cannot run this app.

### 2. Set the environment variables

Add these on the service. Only `DATABASE_URL` is required; the rest change behaviour
without breaking anything (see [Environment variables](#environment-variables)).

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `file:/data/dev.db` — absolute, on the mounted volume |
| `NEXT_PUBLIC_APP_URL` | `https://<your-app>.up.railway.app` (or `.onrender.com`) |
| `NEXT_PUBLIC_PREMIUM_PRICE_LABEL` | e.g. `$9.99/month` — inlined at build time |
| `STRIPE_SECRET_KEY` | only if you want real payments |
| `STRIPE_PRICE_ID_PREMIUM` | only with a real Stripe key |
| `STRIPE_WEBHOOK_SECRET` | only with a real Stripe key |
| `ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY` | only if you want the live coach |

The absolute path matters. A relative `DATABASE_URL` resolves against the process working
directory, which differs between the build step and the runtime on both platforms, so the
file would be written somewhere that a redeploy does not preserve.

### 3. Set the build and start commands

Both platforms detect Node automatically, but set them explicitly so the SQLite path and
the migrations are right:

| Field | Value |
| --- | --- |
| Build command | `npm ci && npm run db:deploy && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/workouts` |

`db:deploy` runs `prisma migrate deploy`, which applies the committed migration without the
prompting or reset behaviour of `migrate dev`. Run the seed once against the new volume:
`npm run db:seed`.

### 4. Wire up CI/CD

`.github/workflows/deploy.yml` runs the full gate — `npm ci`, typecheck, 194 tests,
`npm run build` — and only deploys if every step passes. Add two repository secrets under
**Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `RAILWAY_TOKEN` | A Railway API token with project deploy rights |
| `RAILWAY_SERVICE_ID` | The service to deploy |

The workflow uses `npx @railway/cli@latest up --service "$RAILWAY_SERVICE_ID"`. Note that
Railway's CLI also triggers a *build* on the host, so the database migration and seed run
from the platform's own build command in step 3, not from CI. CI's job is to gate on green
tests and to hand the deploy to Railway.

If you would rather let Railway deploy on git push and use CI only as a gate, delete the
`deploy` job from the workflow and enable **GitHub integration → Deploy on push** on the
service. The `verify` job stays either way.

### 5. Verify

Run the checks in [Post-deploy verification](#post-deploy-verification) against the public
origin. In particular step 3 — the `Secure` cookie attribute only appears when
`NODE_ENV` is `production`, which is the real test that you are hitting production and not
a preview environment.

## What this approach deliberately rules out

**GitHub Pages and any other static host.** Pages serves files; it has no Node runtime, no
API routes and no database. All ten pages of this app prerender as static content, so the
UI would render — but every one of the 14 API routes would fail, taking auth, workouts,
progress, diet, billing and the coach with it. A static host is a marketing page, not this
app.

**Vercel, without changing the database.** `vercel.json` in this repository predates the
current setup and targets Vercel. Serverless functions have no persistent writable disk,
so the SQLite file cannot survive between invocations and each request would open an empty
database. Using Vercel properly means switching the Prisma datasource to PostgreSQL,
writing a new migration, and accepting that a free Postgres tier will need replacing
periodically. That is a real project, not a config change — hence Railway.

## Rollback

Roll back in this order — code first, data last. Each step's rollback is its own inverse.

**Environment variables.** Remove the variable you added, or restore the previous value.
There is no data consequence. If you added `STRIPE_SECRET_KEY` and something misbehaves,
unsetting it drops the app back to the simulated billing provider on the next request —
`getBillingProvider()` is resolved per call, so no restart is needed. The same is true of
`ANTHROPIC_API_KEY` and the coach.

**Build.** Redeploy the previous commit's build output. If only build-time variables
changed — `NEXT_PUBLIC_PREMIUM_PRICE_LABEL` and `NEXT_PUBLIC_APP_URL` are inlined at
build — a rebuild from the same commit is enough; no code change is involved.

**Start process.** Restart `npm run start` on the previous build. Sessions live in the
database, not in process memory, so a restart does not sign anyone out.

**Database migrations.** `prisma migrate deploy` has no automatic down. To reverse an
applied migration you must write the inverse SQL yourself and apply it with
`prisma db execute`, or restore from a backup. The current single migration
(`20260924181352_init`) creates all nine tables; reversing it means dropping all of them
and therefore losing all user data — take a backup first, and prefer rolling the code
back and leaving the extra tables in place. Prisma tolerates a database that is ahead of
the code: a rolled-back build reads the columns it knows about and ignores the rest.

**Premium tiers.** The webhook only ever sets `subscriptionTier = 'premium'`; there is no
code path that downgrades on cancellation. If you need to revoke a premium account, update
the row directly:

```bash
npx prisma db execute --url "$DATABASE_URL" --stdin <<< "UPDATE User SET subscriptionTier='free' WHERE email='<email>';"
```

**Seed content.** The seed only upserts by slug, so rolling it back means re-running it
against the previous version's seed file. It does not touch users, sessions, logs, sets,
metrics or coach messages.

**Filesystem.** If you moved or replaced the SQLite file, restore it from the pre-deploy
backup. A `next build` and `next start` never write to the database file except through
application queries, so a code-only rollback cannot corrupt it.
