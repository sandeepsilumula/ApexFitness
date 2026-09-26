# Apex Fitness

A premium, AI-coached fitness and nutrition web app. Mobile-first, installable as a PWA,
dark by design. Users follow workout plans, log sets and sessions, track body metrics,
follow diet plans, and talk to a coach that has read their training history.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.3 (Pages Router), React 19.3, TypeScript 7 |
| Styling | Tailwind CSS 4.3 with a custom `@theme` token set |
| Database | SQLite via Prisma 7.10 and `@prisma/adapter-better-sqlite3` |
| Auth | Session cookie + `bcryptjs` (cost 12) |
| Payments | Stripe 22.6 |
| Coaching | Anthropic SDK, or OpenRouter for open-weight models |
| Validation | Zod 4.6 |
| Tests | Vitest 5 (unit + API) and Playwright 1.63 (E2E) |

Design tokens and component rules live in [DESIGN.md](./DESIGN.md). Deployment is covered in
[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Getting started

```bash
npm install
npx prisma migrate dev     # creates the SQLite file and schema
npx tsx prisma/seed.ts     # workouts, meal plans and meals
npm run dev
```

The app runs with no credentials at all. Without `STRIPE_SECRET_KEY` billing uses a
simulated provider; without an AI key the coach answers from a simulated provider that is a
real implementation, not a stub. Nothing in the demo path reaches a third party.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, single-threaded |
| `npm run coverage` | Vitest with v8 coverage over `lib/**` |
| `npm run test:e2e` | Playwright, boots its own server on :3100 |

## Architecture

### Frontend

Pages live in `pages/`, primitives in `components/ui/`, and shells in `components/layout/`.
The app is a single bundle plus a service worker; there is no client-side router library and
no global state library. Server data arrives through `lib/api-client.ts`, which unwraps the
API envelope and throws `ApiError` on any non-`ok` response, so every caller handles failure
the same way.

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing with a session picker |
| `/login`, `/signup` | Auth |
| `/dashboard` | Post-login overview |
| `/workouts`, `/workouts/[id]` | Plan library and session detail with set logging |
| `/diet` | Meal plans gated by tier |
| `/progress` | Body metrics and charts |
| `/coach` | AI chat (premium) |
| `/checkout` | Stripe checkout or simulated upgrade |
| `/settings` | Account, onboarding inputs, logout |

### Backend

There is no separate backend service. The API is Next.js API routes under `pages/api/`,
co-located with the pages that call them. The Next.js app in `backend/` is NestJS
scaffolding from the workspace generator and is excluded from `tsconfig.json`; nothing in
`pages/` or `lib/` imports it. `docker-compose.yml` (Postgres + Redis) is likewise
scaffolding and unused — the schema's datasource is SQLite.

### Data model

Eight models in `prisma/schema.prisma`:

- `User` — profile, goal, experience level, and billing state (`subscriptionTier`,
  `subscriptionStatus`, `stripeCustomerId`).
- `Session` — 32-byte random token, 30-day TTL, cascade-deleted with the user.
- `Workout` — slug, category, difficulty, duration, equipment, embed URL, optional
  prescribed sets in `setsJson`, and an `isPremium` flag.
- `WorkoutLog` — a completed session: duration and notes.
- `ExerciseSet` — per-set reps and load.
- `MealPlan` and `Meal` — diet plans with macro targets and per-slot meals.
- `BodyMetric` — weight and body-fat percentage over time.
- `CoachMessage` — persisted chat history.

### API conventions

Every route returns the same envelope (`lib/http.ts`):

```jsonc
{ "ok": true,  "data": ... }
{ "ok": false, "error": { "code": "...", "message": "..." } }
```

`ApiError` carries a machine code and an HTTP status; `fail()` builds the error shape.
`lib/api-client.ts` is the only place envelopes are unwrapped on the client.

Request bodies are parsed with a Zod schema from `lib/validation/schemas.ts` at every
boundary, and the first issue's message is returned to the user rather than a raw Zod dump.

### Auth and authorisation

- Passwords are hashed with bcrypt at cost 12.
- Sessions are opaque random tokens in an `HttpOnly`, `SameSite=Lax` cookie named
  `fitness_session`, with `Secure` added in production. 30-day expiry.
- Identity comes from the session cookie only. A `userId` in a request body is ignored.
- Premium gating is a single function pair in `lib/services/tier.ts`: `isPremium`,
  `requirePremium`, `canViewWorkout` and `visibleDietPlans`. Every premium route and list
  filter goes through them rather than re-checking the tier string.

### Rate limiting

`lib/rate-limit.ts` is a fixed-window in-memory limiter. The AI coach is limited per user
(20 messages per 60s) rather than per IP, because each call costs a model round trip and
per-IP limiting punishes shared households.

### AI coach

`lib/services/coach/` is a provider interface with three implementations, resolved per call
by `getCoachProvider()` so a key can be toggled without a restart:

1. `OpenRouterCoachProvider` — one OpenAI-compatible `fetch` to run an open-weight model
   (`meta-llama/llama-3.3-70b-instruct` by default). Checked first, so an open-model key
   takes precedence.
2. `LiveCoachProvider` — the Anthropic SDK, with an 8s request timeout.
3. `SimulatedCoachProvider` — the no-key default. Canned but real answers.

`buildCoachContext()` serialises the user's training summary as short labelled lines rather
than JSON, which keeps the prompt prefix stable when only the numbers change. The chat route
sends the last 20 messages in chronological order, and a provider failure falls back to the
simulated provider with a `degraded` flag rather than dead-ending the panel.

### Billing

`lib/services/billing/` has the same shape. `getBillingProvider()` returns Stripe when
`STRIPE_SECRET_KEY` is set and the simulated provider otherwise. `getPremiumPlan()` is the
single source of truth for the price label, read from `NEXT_PUBLIC_PREMIUM_PRICE_LABEL`, so
no component hardcodes an amount and the label can change on redeploy. The Stripe webhook
verifies the raw body signature and flips `subscriptionTier` on the user.

## Testing

**Unit and API — Vitest.** 21 files in `tests/unit` and `tests/api` covering auth, the
session-cookie lifecycle, tier gating, the coach providers and their context builder, billing
and the Stripe client, contrast maths, rate limiting, progress, and the API routes end to end
against a real database.

Both suites share one SQLite database and purge their fixtures in `beforeEach`, so
`fileParallelism` is off. One file at a time is a correctness requirement, not a
performance setting.

**E2E — Playwright.** `e2e/` covers landing, auth, workouts and mobile layout. The mobile
project runs at a Pixel 5 viewport with `isMobile` so the meta viewport applies, which is
what catches horizontal overflow on narrow screens. Pixel 5 rather than iPhone 13 on purpose:
the iOS descriptor needs WebKit, and the overflow bug is CSS box layout, identical across
engines. The suite boots its own dev server on :3100 with `NEXT_DIST_DIR=.next-e2e`, because
Next 16 takes a single dev-server lock per project directory and a developer's own `npm run
dev` may already hold it.

## Accessibility

Contrast is measured, not eyeballed. `lib/contrast.ts` implements the WCAG maths and is
unit-tested; `scripts/design-audit.mjs` and `scripts/audit.js` check token conformance,
contrast and structural rules. Every interactive control clears 44px in the smallest axis and
uses the single gold focus ring defined in `styles/globals.css`. All animation collapses under
`prefers-reduced-motion`, and decorative overlays are removed under `forced-colors: active`.

## Environment variables

All optional. `.env` and `.env.*` are gitignored.

| Variable | Effect when unset |
| --- | --- |
| `DATABASE_URL` | Falls back to `file:./prisma/dev.db` |
| `STRIPE_SECRET_KEY` | Simulated billing; no Stripe calls |
| `STRIPE_WEBHOOK_SECRET` | Webhook rejects rather than trusting the payload |
| `OPENROUTER_API_KEY` | Coach falls through to the next provider |
| `ANTHROPIC_API_KEY` | Coach uses the simulated provider |
| `NEXT_PUBLIC_PREMIUM_PRICE_LABEL` | Plan shows no price |

## Deployment

`docs/DEPLOYMENT.md` covers the real case: a Next.js server plus a SQLite file on a
persistent writable volume. The short version — the host must have persistent writable
storage, and two concurrent instances will diverge unless the filesystem is shared.

There is no static-export config. An earlier `next.config.js` set `output: 'export'`, which
strips the server runtime and disables every API route; it was removed so `next.config.ts`
is the single config. A CDN-only deploy of this app is therefore not possible without
reinstating that, and it would mean giving up auth, workouts, coach and billing.

## Licence

MIT — see [LICENSE](./LICENSE).
