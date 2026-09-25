# Fitness App — Premium: Design Spec

**Date:** 2026-09-24
**Status:** Draft for review
**Repo:** `C:\Users\Sam's\Desktop\Projects\test`

## Context

The repo currently serves a 12-line unstyled stub at `pages/index.tsx`. `prisma/`,
`deploy/`, and `frontend/src/` are empty. `backend/src/` contains three stub files.
`docker-compose.yml` defines Postgres and Redis that nothing uses. `DESIGN.md` specifies
a visual direction (deep navy / emerald / gold, Inter + Playfair, mobile-first) that no
stylesheet implements.

This is a greenfield build. The existing scaffolding is treated as intent, not as
constraints to preserve.

## Goals

A web fitness app that is genuinely functional end to end, with real per-user data
isolation:

- Real email/password authentication with server-side sessions
- A browsable workout video library with set logging that writes to a real database
- Diet plans with real macro breakdowns
- AI coaching grounded in the user's own logged data
- Subscription gating with real Stripe code paths
- Analytics computed from the user's real history

### Non-goals (v1)

- Video hosting or upload (library uses curated public embeds)
- Native mobile apps
- Social features (feed, comments, sharing)
- Trainer/admin dashboards
- Real nutrition database integration (static seed content)
- Deployment to live infrastructure

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Video source | Curated public embeds | Playback works with no assets, no keys, no hosting. Not license-clean for production — noted as a known limitation. |
| Auth | Real email/password, bcrypt, server-side sessions | Everything downstream (per-user data isolation, Stripe customer mapping) depends on a real identity. |
| Database | Prisma + SQLite | Zero infrastructure. `prisma/` is already scaffolded. Switching to Postgres is a datasource change. |
| External services | Real code paths behind provider interfaces, with simulated fallback selected at runtime by env presence | The app is fully demonstrable today with no credentials, and goes live the moment keys are added — no rewrite. |
| Architecture | Single Next.js app, `pages/` router, thin service layer | One process, one port, one `npm run dev`. Matches what already runs. The service layer keeps a future backend split to an import refactor. |

## Stack

Next.js 16.3.6 (existing), React 19, TypeScript, Prisma + SQLite, Tailwind CSS,
`bcrypt` for password hashing, session tokens in httpOnly cookies, `zod` for validation,
Vitest for tests, Playwright for E2E.

## Architecture

### Layers

```
pages/            Routes (public + app) and API route handlers (pages/api/*)
components/       React components, grouped by feature
lib/
  db.ts           Prisma client singleton
  auth.ts         Session create / verify / revoke helpers
  api-client.ts   Frontend fetch wrapper: unwraps envelope, throws ApiError
  services/
    coach.ts      CoachProvider interface + Live/Simulated implementations
    billing.ts    BillingProvider interface + Stripe/Simulated implementations
  validation/     Shared zod schemas
prisma/
  schema.prisma   Data model
  seed.ts         Static seed content
```

Server-only concerns (`lib/db.ts`, `lib/auth.ts`, `lib/services/*`) are imported only
from route handlers and `getServerSideProps`. They are never bundled into client code.

### API envelope

Every route handler returns:

```ts
{ ok: true, data: T } | { ok: false, error: { code: string, message: string } }
```

Stack traces are never returned. The frontend `apiFetch` helper unwraps this, throws a
typed `ApiError`, and surfaces `error.message` in a toast. Components do not write
try/catch around fetches.

### API surface

Public reads:
- `GET /api/workouts` — list, filterable by `category`, `difficulty`, `q`
- `GET /api/workouts/[id]` — single workout
- `GET /api/diet-plans` — list; premium plans included only for premium callers

Auth:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET  /api/auth/me`

Authenticated writes (all require a session):
- `POST /api/workouts/[id]/log` — complete a workout
- `POST /api/workouts/[id]/sets` — log a set
- `POST /api/progress/metrics` — record weight / body fat
- `GET  /api/progress` — aggregated history for charts. Returns the free series always and
  the `requiresPremium` series only when the caller is premium.
- `POST /api/ai/chat` — send a coach message

Billing:
- `POST /api/billing/checkout` — start checkout for a tier
- `POST /api/billing/portal` — Stripe customer portal session
- `POST /api/webhooks/stripe` — subscription state updates

**No route accepts a `userId` from the client.** User identity always comes from the
session. Every per-user query is filtered by the session's userId.

## Data model

```prisma
model User {
  id                 String    @id @default(cuid())
  email              String    @unique
  passwordHash       String
  name               String
  goal               String?   // cut | maintain | bulk
  experienceLevel    String?   // beginner | intermediate | advanced
  stripeCustomerId   String?   @unique
  subscriptionTier   String    @default("free")
  subscriptionStatus String    @default("active")
  createdAt          DateTime  @default(now())
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Workout {
  id          String @id @default(cuid())
  slug        String @unique
  title       String
  description String
  category    String // strength | cardio | mobility | yoga
  difficulty  String // beginner | intermediate | advanced
  durationMin Int
  equipment   String
  embedUrl    String
  thumbnail   String
  isPremium   Boolean @default(false)
  setsJson    String?  // JSON array of prescribed exercises, for strength workouts
}

model WorkoutLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(...)
  workoutId   String
  workout     Workout  @relation(...)
  completedAt DateTime @default(now())
  durationMin Int
  notes       String?
}

model ExerciseSet {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(...)
  workoutId String
  workout   Workout  @relation(...)
  setNumber Int
  reps      Int
  weightKg  Float?
  loggedAt  DateTime @default(now())
}

model MealPlan {
  id             String @id @default(cuid())
  slug           String @unique
  title          String
  goal           String // cut | maintain | bulk
  description    String
  caloriesTarget Int
  proteinGrams   Int
  carbsGrams     Int
  fatGrams       Int
  isPremium      Boolean @default(false)
}

model Meal {
  id           String   @id @default(cuid())
  mealPlanId   String
  mealPlan     MealPlan @relation(..., onDelete: Cascade)
  slot         String   // breakfast | lunch | dinner | snack
  name         String
  calories     Int
  proteinGrams Int
  items        String   // comma-separated food list
}

model BodyMetric {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(...)
  weightKg   Float?
  bodyFatPct Float?
  recordedAt DateTime @default(now())
}

model CoachMessage {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(...)
  role      String   // user | assistant
  content   String
  createdAt DateTime @default(now())
}
```

## Pages and user flows

### Public
- `/` — landing: hero, features, pricing preview, CTA. Styled per `DESIGN.md`.
- `/signup`, `/login` — auth forms, client validation, server errors surfaced.

### Authenticated (app shell with sidebar)
- `/dashboard` — streak, workouts this week, latest weight, next recommended workout.
- `/workouts` — filterable grid (category, difficulty, duration, search). Premium items
  show a lock overlay for free users.
- `/workouts/[id]` — embedded player, exercise list, set logging, "Mark Complete".
- `/diet` — plan cards by goal, macro breakdown, expandable meal view. Free tier sees one
  plan; premium unlocks all.
- `/progress` — analytics: weight over time, weekly workout volume, set/rep totals, macro
  adherence.
- `/coach` — chat thread grounded in the user's real logged data. Premium-gated.
- `/settings` — profile, subscription status, upgrade / manage billing, logout.

### Key flows

1. **Signup → onboarding.** After signup, a short profile step (goal, weight, experience)
   seeds the initial `BodyMetric` so the coach can personalize from the first message.

2. **Workout → log → analytics.** Start a workout, log sets, mark complete. This single
   write feeds `/progress` charts and the coach's context. This is the spine that makes
   the app coherent rather than five disconnected demos.

3. **Upgrade.** Free user hits a gate → pricing prompt → `/api/billing/checkout` → Stripe
   or simulated checkout → webhook (or direct local update) sets `subscriptionTier` → gates
   open. In simulated mode the checkout is an in-app page that flips the tier, so the flow
   is walkable without keys.

## Service layer

### `CoachProvider`

```ts
interface CoachProvider {
  reply(input: CoachInput): Promise<CoachReply>
}
```

- `LiveProvider` — Anthropic SDK. System prompt includes a compact summary of the user's
  goal, recent `WorkoutLog`s, `ExerciseSet` totals, and `BodyMetric` trend.
- `SimulatedProvider` — rule-based. Selects from response templates based on the same
  summary: no recent logs → nudge to log a workout; weight trending up while goal is
  `cut` → nutrition guidance; low set volume → volume suggestion. Cites the user's actual
  numbers so the response is demonstrably grounded.

Selection is at call time, by env presence. If `ANTHROPIC_API_KEY` is absent, the
simulated provider is used with no other change. Live calls are wrapped in a timeout; on
timeout or error the simulated provider answers instead, so the chat never dead-ends.

### `BillingProvider`

```ts
interface BillingProvider {
  createCheckout(userId: string, tier: string): Promise<{ url: string }>
  createPortal(userId: string): Promise<{ url: string }>
  handleWebhook(rawBody: string, signature: string): Promise<void>
}
```

- `StripeProvider` — real Checkout Sessions and Customer Portal, signature-verified webhook.
- `SimulatedProvider` — `/checkout?plan=` in-app page that sets `subscriptionTier` directly.

Same env-based selection. If `STRIPE_WEBHOOK_SECRET` is absent, the webhook endpoint
rejects rather than accepting unverified events.

### Tier gating

Free: browse library, one diet plan, log workouts and sets, view own progress.
Premium: all diet plans, AI coaching, premium workouts, deeper analytics — specifically
the training-volume and macro-adherence charts on `/progress`. The weight-trend and
workout-log views stay free so a free user sees real value.

This is expressed by the `isPremium` flags on `Workout` and `MealPlan`, plus an explicit
`requiresPremium` list on the `/api/progress` series, not by hiding whole pages.

Enforced server-side in route handlers. The UI additionally hides gated affordances, but
the UI is never the enforcement point.

## Seed data

`prisma/seed.ts` inserts static content, authored as part of this build:

- ~12 workouts across strength / cardio / mobility / yoga, spanning difficulty levels,
  with real freely-embeddable fitness video embeds and prescribed exercise sets for
  strength workouts.
- 3 meal plans (cut / maintain / bulk) with real macro math that reconciles with the
  stated calorie target.
- 1 free and 1 premium workout, 1 free and 2 premium meal plans, to exercise gating.

## Error handling

- Consistent envelope on every route; no bare 500s, no stack traces in responses.
- One `apiFetch` helper on the frontend; components do not hand-roll fetch error handling.
- Prisma write failures roll back; the user sees a friendly message, the detail is logged
  server-side only.
- Provider timeouts and fallbacks as described above.
- Missing critical env vars fail loudly at startup. The two optional provider keys
  produce a visible dev-mode "not configured" banner rather than a crash.

## Security

- bcrypt cost 12. Passwords never logged, never returned by any endpoint.
- Sessions: 32-byte random token, httpOnly + sameSite=lax + secure-in-prod cookie,
  server-side row so logout and revocation are real. 30-day expiry with sliding refresh.
- Every mutating route requires a valid session.
- zod validates every request body at the route boundary.
- Stripe webhook signature verified against the raw body; unverified events rejected.
- Rate limiting on `/api/auth/*` and `/api/ai/chat` — in-memory token bucket, sufficient
  for a single-process app.
- API keys read from env only. `.env.example` documents each one. No secrets in the repo.

## Testing

Vitest, TDD on the service layer and API routes.

- `auth` — hash/verify roundtrip; session create, expiry, revoke; expired token rejected.
- `coach` — simulated provider returns a response citing real user data; provider
  selection flips correctly on env presence; live provider failure falls back.
- `billing` — tier gating; simulated checkout flips tier; webhook signature rejection.
- API routes — anonymous writes rejected; cross-user access to another user's log returns
  404, never data.

Playwright E2E: signup → log a workout → see it reflected in `/progress`.

Page components are tested only where logic lives in them. The 80% coverage bar applies
to the service layer and API routes, not to JSX rendering of every page.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | SQLite file path |

There is no `SESSION_SECRET`. Session tokens are 32 bytes of cryptographic randomness
stored server-side and compared in a lookup, so there is nothing to sign. Revocation is
the reason for the design: deleting the row invalidates the session immediately, which a
stateless signed token cannot do.
| `ANTHROPIC_API_KEY` | no | Enables `LiveProvider`; absent → simulated coach |
| `STRIPE_SECRET_KEY` | no | Enables `StripeProvider`; absent → simulated billing |
| `STRIPE_WEBHOOK_SECRET` | no | Required to accept Stripe webhooks |
| `STRIPE_PREMIUM_PRICE_ID` | no | Stripe price for the premium tier |

All optional keys are documented in `.env.example` with a note on the simulated
behaviour when absent.

## Known limitations

- Curated embeds link to third-party hosts. Acceptable for a demo; production requires
  licensed or self-hosted media.
- SQLite is single-writer. Fine for local use; Postgres is the production target.
- In-memory rate limiting does not survive restart and is per-process.
- Simulated billing does not move real money. The Stripe path is implemented and takes
  effect on key configuration, but is untested against a live Stripe account in this
  build.
