# Premium Fitness App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 12-line stub at `pages/index.tsx` into a functional multi-user fitness web app with real auth, a workout video library with set logging, diet plans, AI coaching, Stripe subscription gating, and analytics.

**Architecture:** Single Next.js 16 app on the `pages/` router. Route handlers under `pages/api/*` serve the API and call a service layer in `lib/services/`. Prisma + SQLite for persistence. Coach and billing each sit behind a provider interface with a live implementation (Anthropic / Stripe) and a simulated fallback selected at call time by env presence.

**Tech Stack:** Next.js 16.3.6, React 19.3.0, TypeScript 7.0.2, Prisma 7.10.0 + `@prisma/client` 7.10.0, SQLite, Tailwind CSS 4.3.3, `bcryptjs` 3.0.3, `zod` 4.6.5, `stripe` 22.6.2, `@anthropic-ai/sdk` 0.128.0, Vitest 5.0.1, `@playwright/test` 1.63.0.

**Spec:** `docs/superpowers/specs/2026-09-24-fitness-app-design.md` — read it before starting. The spec travels with this plan; executors need both.

## Global Constraints

- **No git operations.** The repository is rooted at `C:\Users\Sam's` (the user's entire home directory) with zero commits. The user explicitly chose to leave git untouched. Every "commit" step in this plan is replaced by a checkpoint that records state without touching git. Do not run `git add`, `git commit`, `git config`, or `git init`.
- **Node v24.16.0, npm 11.13.0.** Prisma 7.10.0 requires `^20.19 || ^22.12 || >=24.0` — satisfied.
- **Pin exact versions.** `prisma@latest` resolves to `8.0.0-rc.15`, a release candidate. Never install `prisma` or `@prisma/client` without an explicit version. Same caution for any dependency in this plan: verify the resolved version is not a prerelease.
- **Pages router, not app router.** `getServerSideProps`, `pages/api/*`, and `export const config = { api: { bodyParser: false } }` are all confirmed supported in Next.js 16.3.6 (verified against `node_modules/next/dist/docs/02-pages/`). The deprecations found in the bundled docs are all historical v9–v13 upgrade notes, not v16 changes.
- **Set `turbopack.root`** in `next.config.ts` to the project directory. Without it the build warns and ignores `package-lock.json` because the lockfile is seen as reaching into the home directory.
- **Tailwind v4, not v3.** v4 uses `@tailwindcss/postcss` and a `@import "tailwindcss";` directive — there is no `tailwind.config.js` and no `content` array. Do not write v3 setup.
- **`bcryptjs`, not `bcrypt`.** `bcrypt@6.0.0` is a native module requiring `node-gyp` compilation on Windows. `bcryptjs@3.0.3` is pure JavaScript with no build step. The API is compatible for our use.
- **API envelope is mandatory.** Every route handler returns `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. No exceptions, no bare 500s, no stack traces in responses.
- **User identity always comes from the session.** No route accepts `userId` from the request body or query. Every per-user query filters by the session's userId.
- **The two optional provider keys** (`ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`) must never be required at startup. Absent → simulated provider. Present → live provider.
- **Design language from `DESIGN.md`:** deep navy / emerald / gold palette, Inter + Playfair typography, mobile-first responsive.
- **Charts follow the `dataviz` skill** — invoke it before writing any chart code in Task 14.

---

## File Structure

```
prisma/
  schema.prisma              Data model (9 models)
  seed.ts                    Static seed: 12 workouts, 3 meal plans
lib/
  db.ts                      Prisma client singleton
  auth.ts                    Hash/verify, session create/verify/revoke
  api-client.ts              Frontend fetch wrapper + ApiError
  http.ts                    Envelope helpers for route handlers
  rate-limit.ts              In-memory token bucket
  validation/schemas.ts      Shared zod schemas
  services/
    coach/
      types.ts               CoachProvider interface
      context.ts             Build user summary from DB
      simulated.ts           Rule-based provider
      live.ts                Anthropic provider
      index.ts               Provider selection by env
    billing/
      types.ts               BillingProvider interface
      simulated.ts           In-app tier flip
      stripe.ts              Stripe provider
      index.ts               Provider selection by env
    progress.ts              Aggregations for /progress
    tier.ts                  isPremium / gating helpers
components/
  ui/                        Button, Card, Input, Toast, Modal
  layout/                    AppShell, Sidebar, PublicNav
  workouts/                  WorkoutCard, WorkoutGrid, SetLogger, Player
  diet/                      PlanCard, MacroBar, MealList
  coach/                     ChatThread, ChatInput
  charts/                    WeightChart, VolumeChart, MacroChart
pages/
  _app.tsx, _document.tsx
  index.tsx                  Landing
  login.tsx, signup.tsx, onboarding.tsx
  dashboard.tsx
  workouts/index.tsx, [id].tsx
  diet.tsx
  progress.tsx
  coach.tsx
  settings.tsx
  checkout.tsx               Simulated billing flow
  api/
    auth/signup|login|logout|me.ts
    workouts/index.ts, [id].ts, [id]/log.ts, [id]/sets.ts
    diet-plans.ts
    progress/index.ts, metrics.ts
    ai/chat.ts
    billing/checkout.ts, portal.ts
    webhooks/stripe.ts
styles/globals.css
tests/
  unit/                      auth, coach, billing, tier
  api/                       Route handler tests
  e2e/                       Playwright
.env.example
next.config.ts
vitest.config.ts
playwright.config.ts
```

---

## Task 1: Project foundation — deps, config, Tailwind, test harness

**Files:**
- Modify: `package.json`, `tsconfig.json`
- Create: `next.config.ts`, `postcss.config.mjs`, `styles/globals.css`, `.env.example`
- Create: `vitest.config.ts`, `tests/setup.ts`

**Interfaces:**
- Consumes: nothing
- Produces: working dev server, working `npm test`, working Tailwind. Later tasks assume all of these.

- [ ] **Step 1: Install dependencies at pinned versions**

```bash
npm install --save-exact prisma@7.10.0 @prisma/client@7.10.0 bcryptjs@3.0.3 zod@4.6.5 stripe@22.6.2 @anthropic-ai/sdk@0.128.0
npm install --save-dev --save-exact tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3 vitest@5.0.1 @vitest/coverage-v8@5.0.1 @playwright/test@1.63.0
```

Expected: no `--save-exact` warnings about saving ranges. If any package resolves to an `-rc` or `-beta` version, stop and report.

- [ ] **Step 2: Add npm scripts**

Replace the `scripts` block in `package.json` with:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "coverage": "vitest run --coverage",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 3: Tighten tsconfig**

The current `tsconfig.json` has `"strict": false`. Change it to `true`, and add `"baseUrl": "."` and `"paths": { "@/*": ["./*"] }` for the `@/` import alias used throughout the plan. Leave the rest as-is.

- [ ] **Step 4: Create next.config.ts with turbopack.root**

`next.config.ts` does not currently exist. Create it:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
```

This removes the startup warning: *"Next.js ignored package-lock.json ... because it would include your home directory. To set this directory, set `turbopack.root` in your Next.js config."*

- [ ] **Step 5: Wire up Tailwind v4**

`postcss.config.mjs`:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

`styles/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-navy-950: #0a1128;
  --color-navy-900: #0f172a;
  --color-navy-800: #1e293b;
  --color-emerald-500: #10b981;
  --color-emerald-600: #059669;
  --color-gold-400: #fbbf24;
  --color-gold-500: #f59e0b;
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Playfair Display', ui-serif, Georgia, serif;
}

body {
  background: var(--color-navy-950);
  color: #e2e8f0;
  font-family: var(--font-sans);
}
```

Tailwind v4 has no config file and no `content` array — theme values live in CSS via `@theme`, and class names are detected automatically.

- [ ] **Step 6: Create the test harness**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts'],
      exclude: ['lib/**/*.d.ts'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

`tests/setup.ts`:

```ts
process.env.DATABASE_URL = 'file:./test.db'
delete process.env.ANTHROPIC_API_KEY
delete process.env.STRIPE_SECRET_KEY
delete process.env.STRIPE_WEBHOOK_SECRET
```

Tests run with provider keys explicitly deleted so the simulated providers are always the ones under test unless a test sets them itself.

- [ ] **Step 7: Create .env.example**

```
# Required
DATABASE_URL="file:./dev.db"

# Optional — absent means the simulated provider is used
# ANTHROPIC_API_KEY="sk-ant-..."
# STRIPE_SECRET_KEY="sk_test_..."
# STRIPE_WEBHOOK_SECRET="whsec_..."
# STRIPE_PREMIUM_PRICE_ID="price_..."
```

- [ ] **Step 8: Verify the foundation**

```bash
npx tsc --noEmit && npm run dev
```

Expected: `npx tsc --noEmit` exits 0; `npm run dev` starts with **no** turbopack root warning. Then open http://localhost:3000 and confirm the existing stub still renders. Kill the dev server.

**Checkpoint:** Record that Task 1 passed. Do not run git.

---

## Task 2: Prisma schema and client singleton

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`
- Test: `tests/unit/db.test.ts`

**Interfaces:**
- Consumes: Task 1 (npm scripts, `@/` alias)
- Produces: `prisma` client at `@/lib/db`, all 9 models. Every later task imports `prisma` from `@/lib/db`.

- [ ] **Step 1: Write the schema**

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  passwordHash       String
  name               String
  goal               String?
  experienceLevel    String?
  stripeCustomerId   String?  @unique
  subscriptionTier   String   @default("free")
  subscriptionStatus String   @default("active")
  createdAt          DateTime @default(now())
  sessions           Session[]
  workoutLogs        WorkoutLog[]
  exerciseSets       ExerciseSet[]
  bodyMetrics        BodyMetric[]
  coachMessages      CoachMessage[]
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
  id          String       @id @default(cuid())
  slug        String       @unique
  title       String
  description String
  category    String
  difficulty  String
  durationMin Int
  equipment   String
  embedUrl    String
  thumbnail   String
  isPremium   Boolean      @default(false)
  setsJson    String?
  logs        WorkoutLog[]
  sets        ExerciseSet[]
}

model WorkoutLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workoutId   String
  workout     Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  completedAt DateTime @default(now())
  durationMin Int
  notes       String?
}

model ExerciseSet {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workoutId String
  workout   Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  setNumber Int
  reps      Int
  weightKg  Float?
  loggedAt  DateTime @default(now())
}

model MealPlan {
  id             String @id @default(cuid())
  slug           String @unique
  title          String
  goal           String
  description    String
  caloriesTarget Int
  proteinGrams   Int
  carbsGrams     Int
  fatGrams       Int
  isPremium      Boolean @default(false)
  meals          Meal[]
}

model Meal {
  id           String   @id @default(cuid())
  mealPlanId   String
  mealPlan     MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
  slot         String
  name         String
  calories     Int
  proteinGrams Int
  items        String
}

model BodyMetric {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  weightKg   Float?
  bodyFatPct Float?
  recordedAt DateTime @default(now())
}

model CoachMessage {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      String
  content   String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Create the client singleton**

`lib/db.ts`:

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

The `globalThis` cache prevents Next.js hot-reload from exhausting database connections.

- [ ] **Step 3: Generate the client and create the database**

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Expected: Prisma creates `prisma/dev.db` and a migration folder. If `migrate dev` prompts for a reset or complains about the datasource, read the error before continuing.

- [ ] **Step 4: Write the failing test**

`tests/unit/db.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/db'

describe('prisma client', () => {
  it('connects and queries User', async () => {
    const count = await prisma.user.count()
    expect(typeof count).toBe('number')
  })

  it('creates and cascades a session', async () => {
    const user = await prisma.user.create({
      data: { email: 'cascade@test.local', passwordHash: 'x', name: 'Cascade' },
    })
    await prisma.session.create({
      data: { token: 'cascade-token', userId: user.id, expiresAt: new Date(Date.now() + 1000) },
    })
    await prisma.user.delete({ where: { id: user.id } })
    const sessions = await prisma.session.count({ where: { userId: user.id } })
    expect(sessions).toBe(0)
  })
})
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run tests/unit/db.test.ts`
Expected: FAIL — `DATABASE_URL` resolves relative to the schema, and the test database file does not exist yet.

- [ ] **Step 6: Point tests at their own database**

Create `prisma/test.db` by running `DATABASE_URL="file:./test.db" npx prisma migrate deploy`. Then re-run the test.

Run: `npx vitest run tests/unit/db.test.ts`
Expected: PASS. The singleton reuses the same `globalThis` cache, so both tests share one client.

- [ ] **Step 7: Confirm isolation from the dev database**

Run: `npx prisma migrate status`
Expected: reports the dev database at `dev.db`. Tests must never touch it.

**Checkpoint:** Record that Task 2 passed. Do not run git.

---

## Task 3: Envelope helpers, rate limiting, and shared validation

**Files:**
- Create: `lib/http.ts`, `lib/rate-limit.ts`, `lib/validation/schemas.ts`
- Test: `tests/unit/http.test.ts`, `tests/unit/rate-limit.test.ts`

**Interfaces:**
- Consumes: Task 1
- Produces: `ok()`, `fail()`, `ApiError`, `RateLimiter`, and all zod schemas. Every later route handler uses these.

- [ ] **Step 1: Write the failing test for the envelope**

`tests/unit/http.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ok, fail } from '@/lib/http'

describe('response envelope', () => {
  it('wraps success data', () => {
    expect(ok({ id: 1 })).toEqual({ ok: true, data: { id: 1 } })
  })

  it('wraps errors with a code and message', () => {
    expect(fail('NOT_FOUND', 'Workout not found')).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Workout not found' },
    })
  })

  it('never leaks a stack trace', () => {
    const body = JSON.stringify(fail('INTERNAL', 'Something broke'))
    expect(body).not.toContain('at ')
    expect(body).not.toContain('.ts')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/http.test.ts`
Expected: FAIL — cannot resolve `@/lib/http`.

- [ ] **Step 3: Implement the envelope**

`lib/http.ts`:

```ts
export type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

export function ok<T>(data: T): Envelope<T> {
  return { ok: true, data }
}

export function fail(code: string, message: string): Envelope<never> {
  return { ok: false, error: { code, message } }
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
```

- [ ] **Step 4: Write the failing test for rate limiting**

`tests/unit/rate-limit.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { RateLimiter } from '@/lib/rate-limit'

describe('RateLimiter', () => {
  it('allows requests up to the limit then blocks', () => {
    const rl = new RateLimiter({ limit: 3, windowMs: 60_000 })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(false)
  })

  it('tracks keys independently', () => {
    const rl = new RateLimiter({ limit: 1, windowMs: 60_000 })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('b')).toBe(true)
    expect(rl.check('a')).toBe(false)
  })

  it('allows again once the window has passed', () => {
    const rl = new RateLimiter({ limit: 1, windowMs: 1 })
    expect(rl.check('a')).toBe(true)
    return new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
      expect(rl.check('a')).toBe(true)
    })
  })
})
```

- [ ] **Step 5: Run it to verify it fails, then implement**

Expected FAIL, then create `lib/rate-limit.ts`:

```ts
interface Options {
  limit: number
  windowMs: number
}

interface Bucket {
  count: number
  resetAt: number
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>()

  constructor(private readonly options: Options) {}

  check(key: string): boolean {
    const now = Date.now()
    const existing = this.buckets.get(key)

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.options.windowMs })
      return true
    }

    if (existing.count >= this.options.limit) return false

    existing.count += 1
    return true
  }
}
```

- [ ] **Step 6: Write shared zod schemas**

`lib/validation/schemas.ts`:

```ts
import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
})

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const onboardingSchema = z.object({
  goal: z.enum(['cut', 'maintain', 'bulk']),
  weightKg: z.number().positive().max(400),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
})

export const logWorkoutSchema = z.object({
  durationMin: z.number().int().positive().max(600),
  notes: z.string().max(2000).optional(),
})

export const logSetSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive().max(1000),
  weightKg: z.number().nonnegative().max(1000).optional(),
})

export const bodyMetricSchema = z.object({
  weightKg: z.number().positive().max(400).optional(),
  bodyFatPct: z.number().min(1).max(70).optional(),
})

export const chatSchema = z.object({
  message: z.string().min(1).max(4000),
})

export const checkoutSchema = z.object({
  tier: z.enum(['premium']),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>
export type LogSetInput = z.infer<typeof logSetSchema>
export type BodyMetricInput = z.infer<typeof bodyMetricSchema>
export type ChatInput = z.infer<typeof chatSchema>
```

- [ ] **Step 7: Verify**

Run: `npx vitest run tests/unit/http.test.ts tests/unit/rate-limit.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 3 passed. Do not run git.

---

## Task 4: Auth service — password hashing and sessions

**Files:**
- Create: `lib/auth.ts`
- Test: `tests/unit/auth.test.ts`

**Interfaces:**
- Consumes: Task 2 (`prisma` from `@/lib/db`)
- Produces: `hashPassword`, `verifyPassword`, `createSession`, `getSessionUser`, `revokeSession`, `SESSION_COOKIE`, `getCurrentUser(req)`. Task 5's route handlers and every later authenticated route use these.

- [ ] **Step 1: Write the failing test**

`tests/unit/auth.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'
import {
  hashPassword,
  verifyPassword,
  createSession,
  getSessionUser,
  revokeSession,
} from '@/lib/auth'

let userId: string

beforeEach(async () => {
  const user = await prisma.user.create({
    data: { email: `auth-${Date.now()}@test.local`, passwordHash: 'x', name: 'Auth' },
  })
  userId = user.id
})

afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: userId } })
})

describe('password hashing', () => {
  it('produces a hash that verifies', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash).not.toContain('correct horse')
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false)
  })

  it('salts, so the same password hashes differently each time', async () => {
    const a = await hashPassword('same')
    const b = await hashPassword('same')
    expect(a).not.toBe(b)
  })
})

describe('sessions', () => {
  it('creates a session and resolves it back to the user', async () => {
    const token = await createSession(userId)
    const user = await getSessionUser(token)
    expect(user?.id).toBe(userId)
  })

  it('rejects an unknown token', async () => {
    expect(await getSessionUser('not-a-real-token')).toBeNull()
  })

  it('rejects an expired session', async () => {
    const token = await createSession(userId, new Date(Date.now() - 1000))
    expect(await getSessionUser(token)).toBeNull()
  })

  it('revocation invalidates the token immediately', async () => {
    const token = await createSession(userId)
    await revokeSession(token)
    expect(await getSessionUser(token)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/auth.test.ts`
Expected: FAIL — cannot resolve `@/lib/auth`.

- [ ] **Step 3: Implement**

`lib/auth.ts`:

```ts
import bcrypt from 'bcryptjs'
import type { NextApiRequest } from 'next'
import { prisma } from '@/lib/db'

const BCRYPT_COST = 12
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const SESSION_COOKIE = 'fitness_session'

export type SessionUser = {
  id: string
  email: string
  name: string
  goal: string | null
  subscriptionTier: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(
  userId: string,
  expiresAt: Date = new Date(Date.now() + SESSION_TTL_MS),
): Promise<string> {
  const token = require('node:crypto').randomBytes(32).toString('hex')
  await prisma.session.create({ data: { token, userId, expiresAt } })
  return token
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) return null

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    goal: session.user.goal,
    subscriptionTier: session.user.subscriptionTier,
  }
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } })
}

export function setSessionCookie(res: any, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`,
  )
}

export function clearSessionCookie(res: any): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  )
}

export async function getCurrentUser(req: NextApiRequest): Promise<SessionUser | null> {
  const token = req.cookies?.[SESSION_COOKIE]
  if (typeof token !== 'string' || token.length === 0) return null
  return getSessionUser(token)
}
```

If `require('node:crypto')` trips the linter, change it to a top-level `import { randomBytes } from 'node:crypto'`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/auth.test.ts`
Expected: PASS. bcrypt at cost 12 takes roughly 250ms per hash, so this file takes a few seconds.

**Checkpoint:** Record that Task 4 passed. Do not run git.

---

## Task 5: Auth route handlers

**Files:**
- Create: `pages/api/auth/signup.ts`, `login.ts`, `logout.ts`, `me.ts`
- Test: `tests/api/auth.test.ts`

**Interfaces:**
- Consumes: Tasks 3, 4 — `ok`, `fail`, `ApiError`, `signupSchema`, `loginSchema`, `hashPassword`, `verifyPassword`, `createSession`, `revokeSession`, `setSessionCookie`, `clearSessionCookie`, `getCurrentUser`
- Produces: the four auth endpoints.

- [ ] **Step 1: Write the failing test**

`tests/api/auth.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import signupHandler from '@/pages/api/auth/signup'
import loginHandler from '@/pages/api/auth/login'
import meHandler from '@/pages/api/auth/me'
import { prisma } from '@/lib/db'

const email = 'signup@test.local'

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email } })
})

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email } })
})

describe('POST /api/auth/signup', () => {
  it('creates a user and returns 200', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { email, password: 'password123', name: 'Sam' },
    })
    await signupHandler(req, res)
    expect(res._getStatusCode()).toBe(200)
    const users = await prisma.user.count({ where: { email } })
    expect(users).toBe(1)
  })

  it('never returns the password hash', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { email, password: 'password123', name: 'Sam' },
    })
    await signupHandler(req, res)
    const body = JSON.stringify(res._getJSONData())
    expect(body).not.toContain('$2')
    expect(body).not.toContain('passwordHash')
  })

  it('rejects a duplicate email with 409', async () => {
    const first = createMocks({ method: 'POST', body: { email, password: 'password123', name: 'Sam' } })
    await signupHandler(first.req, first.res)
    const second = createMocks({ method: 'POST', body: { email, password: 'password123', name: 'Sam' } })
    await signupHandler(second.req, second.res)
    expect(second.res._getStatusCode()).toBe(409)
  })

  it('rejects a short password with 400', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { email, password: 'short', name: 'Sam' } })
    await signupHandler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('rejects wrong credentials with 401', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { email, password: 'nope' } })
    await loginHandler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('returns 401 without a session cookie', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await meHandler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })
})
```

- [ ] **Step 2: Install node-mocks-http and run to verify failure**

```bash
npm install --save-dev --save-exact node-mocks-http@1.16.2
npx vitest run tests/api/auth.test.ts
```

Expected: FAIL — handlers do not exist.

- [ ] **Step 3: Implement signup**

`pages/api/auth/signup.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import { signupSchema } from '@/lib/validation/schemas'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth'
import { ok, fail } from '@/lib/http'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use POST'))

  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json(fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input'))
  }

  const { email, password, name } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) return res.status(409).json(fail('EMAIL_TAKEN', 'That email is already registered'))

  const user = await prisma.user.create({
    data: { email: normalizedEmail, name, passwordHash: await hashPassword(password) },
  })

  const token = await createSession(user.id)
  setSessionCookie(res, token)

  return res.status(200).json(ok({ id: user.id, email: user.email, name: user.name }))
}
```

- [ ] **Step 4: Implement login, logout, me**

`pages/api/auth/login.ts` follows the same shape: validate with `loginSchema`, look up by lowercased email, `verifyPassword`, on mismatch return 401 with a deliberately identical message for both "no such user" and "wrong password" so the endpoint is not a user-enumeration oracle.

`pages/api/auth/logout.ts` reads `req.cookies[SESSION_COOKIE]`, calls `revokeSession` if present, clears the cookie, returns `ok({ loggedOut: true })`.

`pages/api/auth/me.ts` calls `getCurrentUser(req)`, returns 401 if null, else `ok(user)`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/api/auth.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 5 passed. Do not run git.

---

## Task 6: Tier gating helpers

**Files:**
- Create: `lib/services/tier.ts`
- Test: `tests/unit/tier.test.ts`

**Interfaces:**
- Consumes: Task 4's `SessionUser`
- Produces: `isPremium(user)`, `requirePremium(user)`, `canViewWorkout(user, workout)`, `visibleDietPlans(user, plans)`. Used by Task 10 and Task 11.

- [ ] **Step 1: Write the failing test**

`tests/unit/tier.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isPremium, canViewWorkout, visibleDietPlans } from '@/lib/services/tier'

const free = { id: '1', email: 'f@t.local', name: 'F', goal: null, subscriptionTier: 'free' }
const premium = { ...free, id: '2', subscriptionTier: 'premium' }

describe('tier gating', () => {
  it('identifies premium users', () => {
    expect(isPremium(free)).toBe(false)
    expect(isPremium(premium)).toBe(true)
  })

  it('lets a free user view a free workout but not a premium one', () => {
    expect(canViewWorkout(free, { isPremium: false })).toBe(true)
    expect(canViewWorkout(free, { isPremium: true })).toBe(false)
  })

  it('lets a premium user view both', () => {
    expect(canViewWorkout(premium, { isPremium: true })).toBe(true)
  })

  it('hides premium plans from free users but keeps them visible to premium users', () => {
    const plans = [
      { id: '1', isPremium: false },
      { id: '2', isPremium: true },
      { id: '3', isPremium: true },
    ]
    expect(visibleDietPlans(free, plans).map((p) => p.id)).toEqual(['1'])
    expect(visibleDietPlans(premium, plans).map((p) => p.id)).toEqual(['1', '2', '3'])
  })
})
```

- [ ] **Step 2: Run to verify failure, then implement**

`lib/services/tier.ts`:

```ts
import { ApiError } from '@/lib/http'
import type { SessionUser } from '@/lib/auth'

export function isPremium(user: Pick<SessionUser, 'subscriptionTier'>): boolean {
  return user.subscriptionTier === 'premium'
}

export function requirePremium(user: Pick<SessionUser, 'subscriptionTier'>): void {
  if (!isPremium(user)) {
    throw new ApiError('PREMIUM_REQUIRED', 'This feature requires a premium subscription', 403)
  }
}

export function canViewWorkout(
  user: Pick<SessionUser, 'subscriptionTier'>,
  workout: { isPremium: boolean },
): boolean {
  return !workout.isPremium || isPremium(user)
}

export function visibleDietPlans<
  T extends { isPremium: boolean },
>(user: Pick<SessionUser, 'subscriptionTier'>, plans: T[]): T[] {
  return plans.filter((plan) => !plan.isPremium || isPremium(user))
}
```

- [ ] **Step 3: Run to verify it passes**

Run: `npx vitest run tests/unit/tier.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 6 passed. Do not run git.

---

## Task 7: Seed data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add `"prisma": { "seed": "tsx prisma/seed.ts" }`)

**Interfaces:**
- Consumes: Task 2's Prisma models
- Produces: 12 workouts, 3 meal plans, 1 free + 2 premium items of each type.

- [ ] **Step 1: Add tsx and wire the seed command**

```bash
npm install --save-dev --save-exact tsx@4.20.6
```

Add to `package.json`:

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

- [ ] **Step 2: Write the seed**

`prisma/seed.ts` must be idempotent — use `upsert` on `slug` so re-running does not duplicate.

Workout categories: strength, cardio, mobility, yoga. Difficulty: beginner, intermediate, advanced. Exactly 1 of the 12 has `isPremium: true`; the other 11 are free. Strength workouts carry a `setsJson` value — a JSON-encoded array of `{ name, sets, reps }` — which Task 12 parses to render the prescribed exercise list.

Meal plans: one cut, one maintain, one bulk, each with real macro math where `proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9` is within 10% of `caloriesTarget`. One free, two premium. Each plan has 4 meals (breakfast, lunch, dinner, snack) whose per-meal macros sum to the plan totals.

Embed URLs must point to real, freely-embeddable fitness video hosts. Verify each URL resolves before finishing this task — a dead embed ships a broken player.

- [ ] **Step 3: Run the seed**

```bash
npx prisma db seed
npx prisma studio --help > /dev/null   # confirm the schema is valid without opening a browser
```

Expected: seed completes without error.

- [ ] **Step 4: Verify counts**

```bash
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{console.log('workouts',await p.workout.count());console.log('premiumWorkouts',await p.workout.count({where:{isPremium:true}}));console.log('mealPlans',await p.mealPlan.count());console.log('meals',await p.meal.count());await p.\$disconnect()})()"
```

Expected: `workouts 12`, `premiumWorkouts 1`, `mealPlans 3`, `meals 12`.

- [ ] **Step 5: Check the macro math holds**

```bash
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{for(const pl of await p.mealPlan.findMany()){const m=await p.meal.findMany({where:{mealPlanId:pl.id}});const calc=pl.proteinGrams*4+pl.carbsGrams*4+pl.fatGrams*9;console.log(pl.slug,'plan',pl.caloriesTarget,'macro-derived',calc,'meals-sum',m.reduce((a,x)=>a+x.calories,0),'p-sum',m.reduce((a,x)=>a+x.proteinGrams,0),'vs',pl.proteinGrams)}})()"
```

Expected: macro-derived within 10% of the target, and per-meal sums matching the plan totals. Fix any plan that fails before moving on.

**Checkpoint:** Record that Task 7 passed. Do not run git.

---

## Task 8: Coach context builder

**Files:**
- Create: `lib/services/coach/context.ts`
- Test: `tests/unit/coach-context.test.ts`

**Interfaces:**
- Consumes: Task 2's `prisma`
- Produces: `buildCoachContext(userId): Promise<CoachContext>` and the `CoachContext` type. Task 9's providers consume it.

- [ ] **Step 1: Write the failing test**

`tests/unit/coach-context.test.ts` — create a user with two workout logs, three exercise sets, and two body metrics at different weights, then assert the context reflects them:

```ts
expect(ctx.workoutCount).toBe(2)
expect(ctx.totalSets).toBe(3)
expect(ctx.weightTrend).toBe('down')   // latest weight below the earliest
expect(ctx.recentWorkoutTitles).toContain('Upper Body')
```

Also assert that a user with no logs returns zeros and `'unknown'` trend rather than throwing — the coach must work for a brand-new account.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/coach-context.test.ts`
Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Implement**

`lib/services/coach/context.ts` exports:

```ts
export type CoachContext = {
  userName: string
  goal: string | null
  experienceLevel: string | null
  workoutCount: number
  weeklyWorkoutCount: number
  totalSets: number
  totalVolumeKg: number
  weightTrend: 'up' | 'down' | 'stable' | 'unknown'
  latestWeightKg: number | null
  recentWorkoutTitles: string[]
}

export async function buildCoachContext(userId: string): Promise<CoachContext>
```

Compute the trend by comparing the earliest and latest `BodyMetric.weightKg`. If either is missing, or fewer than two metrics exist, return `'unknown'` — do not guess.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/coach-context.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 8 passed. Do not run git.

---

## Task 9: Coach providers

**Files:**
- Create: `lib/services/coach/types.ts`, `simulated.ts`, `live.ts`, `index.ts`
- Test: `tests/unit/coach.test.ts`

**Interfaces:**
- Consumes: Task 8's `CoachContext`
- Produces: `getCoachProvider(): CoachProvider` and the `CoachProvider` interface. Task 13's `/api/ai/chat` uses `getCoachProvider()`.

- [ ] **Step 1: Write the failing test**

`tests/unit/coach.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getCoachProvider, LiveCoachProvider } from '@/lib/services/coach'
import { SimulatedCoachProvider } from '@/lib/services/coach/simulated'

const noLogs = {
  userName: 'Sam', goal: 'cut', experienceLevel: 'beginner',
  workoutCount: 0, weeklyWorkoutCount: 0, totalSets: 0, totalVolumeKg: 0,
  weightTrend: 'unknown' as const, latestWeightKg: null, recentWorkoutTitles: [],
}

const active = {
  ...noLogs, workoutCount: 6, weeklyWorkoutCount: 3, totalSets: 42,
  totalVolumeKg: 18400, weightTrend: 'down' as const, latestWeightKg: 78.4,
  recentWorkoutTitles: ['Upper Body', 'Leg Day'],
}

describe('provider selection', () => {
  it('uses the simulated provider when ANTHROPIC_API_KEY is absent', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(getCoachProvider()).toBeInstanceOf(SimulatedCoachProvider)
  })

  it('uses the live provider when ANTHROPIC_API_KEY is present', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    expect(getCoachProvider()).toBeInstanceOf(LiveCoachProvider)
    delete process.env.ANTHROPIC_API_KEY
  })
})

describe('simulated coach', () => {
  const coach = new SimulatedCoachProvider()

  it('nudges a user with no logged workouts', async () => {
    const reply = await coach.reply({ message: 'How should I start?', context: noLogs })
    expect(reply).toMatch(/log|start|begin/i)
  })

  it('cites the user\'s real weight when discussing progress', async () => {
    const reply = await coach.reply({ message: 'How is my progress?', context: active })
    expect(reply).toContain('78.4')
  })

  it('gives nutrition guidance when weight is trending up against a cut goal', async () => {
    const reply = await coach.reply({
      message: 'What should I change?',
      context: { ...active, weightTrend: 'up' },
    })
    expect(reply).toMatch(/protein|calorie|nutrition|intake/i)
  })

  it('never returns an empty reply', async () => {
    for (const ctx of [noLogs, active]) {
      const reply = await coach.reply({ message: 'x', context: ctx })
      expect(reply.length).toBeGreaterThan(20)
    }
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/coach.test.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement types and the simulated provider**

`lib/services/coach/types.ts`:

```ts
import type { CoachContext } from './context'

export interface CoachReplyInput {
  message: string
  context: CoachContext
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export interface CoachProvider {
  reply(input: CoachReplyInput): Promise<string>
}
```

`lib/services/coach/simulated.ts` selects a response by inspecting the context in priority order: no workouts logged → invite them to log one; goal `cut` with weight trending up → protein and calorie guidance; total sets below 20 → progressive volume suggestion; otherwise → encouragement citing `latestWeightKg` and the recent workout titles. Every branch must return a substantive string — the test above asserts length > 20, and a wrong branch fails it.

- [ ] **Step 4: Implement the live provider with fallback**

`lib/services/coach/live.ts` uses `@anthropic-ai/sdk`. Read the claude-api skill before writing this file for the correct current model ID and SDK call shape. The system prompt serializes the `CoachContext` as compact text. Wrap the call in a timeout — if it exceeds 8 seconds or throws, catch and delegate to `SimulatedCoachProvider` so the chat never dead-ends. The provider must never surface a raw SDK error to the user.

- [ ] **Step 5: Implement selection**

`lib/services/coach/index.ts`:

```ts
import { LiveCoachProvider } from './live'
import { SimulatedCoachProvider } from './simulated'
import type { CoachProvider } from './types'

export function getCoachProvider(): CoachProvider {
  return process.env.ANTHROPIC_API_KEY
    ? new LiveCoachProvider()
    : new SimulatedCoachProvider()
}
```

Selection is at call time, not module load, so tests can toggle the env var between assertions.

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run tests/unit/coach.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 9 passed. Do not run git.

---

## Task 10: Workout read routes and logging

**Files:**
- Create: `pages/api/workouts/index.ts`, `[id].ts`, `[id]/log.ts`, `[id]/sets.ts`
- Test: `tests/api/workouts.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 3, 6 — `prisma`, `ok`, `fail`, `getCurrentUser`, `requirePremium`, `canViewWorkout`, `logWorkoutSchema`, `logSetSchema`
- Produces: `GET /api/workouts`, `GET /api/workouts/[id]`, `POST /api/workouts/[id]/log`, `POST /api/workouts/[id]/sets`. Task 13's progress service reads the rows these create.

- [ ] **Step 1: Write the failing test**

`tests/api/workouts.test.ts` must cover, at minimum:

```ts
it('rejects an anonymous workout log with 401', ...)
it('records a workout log for the session user', ...)
it('rejects a log for a workout that does not exist with 404', ...)
it('records an exercise set', ...)
it('never accepts a userId from the request body', ...)
```

The last one is the security-critical assertion: post a set with `userId` set to a different user's id and assert the created row belongs to the session user.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/api/workouts.test.ts`
Expected: FAIL — handlers do not exist.

- [ ] **Step 3: Implement the read routes**

`pages/api/workouts/index.ts` supports `category`, `difficulty`, and `q` query filters, returns `ok(workouts)`, and marks each with a `locked` boolean computed from `canViewWorkout` when a session exists. An anonymous caller sees all workouts with premium ones marked locked rather than hidden — the public library stays browsable.

`pages/api/workouts/[id].ts` resolves by `slug` or `id`. Returns 404 with `fail('NOT_FOUND', 'Workout not found')` when absent. If the workout is premium and the caller is not, return 403 with `fail('PREMIUM_REQUIRED', ...)`.

- [ ] **Step 4: Implement the write routes**

Both write handlers follow this order: method check → `getCurrentUser` (401 if null) → `safeParse` the body (400 on failure) → verify the workout exists (404) → verify tier if the workout is premium (403) → write → `ok(result)`.

`[id]/log.ts` creates a `WorkoutLog` and returns it. `[id]/sets.ts` creates an `ExerciseSet`. Neither reads `userId` from the body; both use `user.id` from the session.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/api/workouts.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 10 passed. Do not run git.

---

## Task 11: Diet plan route

**Files:**
- Create: `pages/api/diet-plans.ts`
- Test: `tests/api/diet-plans.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 3, 6 — `prisma`, `ok`, `fail`, `getCurrentUser`, `visibleDietPlans`
- Produces: `GET /api/diet-plans`. Task 14's diet page consumes it.

- [ ] **Step 1: Write the failing test**

```ts
it('returns only the free plan to a free user', ...)
it('returns all plans to a premium user', ...)
it('marks premium plans as locked rather than hiding them from anonymous callers', ...)
```

- [ ] **Step 2: Run to verify it fails, then implement**

`pages/api/diet-plans.ts` loads all plans with their meals, filters through `visibleDietPlans` for a free session, and includes a `locked` flag on each. Anonymous callers get the free plan with premium ones marked locked so the pricing upsell stays visible.

- [ ] **Step 3: Run to verify it passes**

Run: `npx vitest run tests/api/diet-plans.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 11 passed. Do not run git.

---

## Task 12: Progress aggregation and route

**Files:**
- Create: `lib/services/progress.ts`, `pages/api/progress/index.ts`, `pages/api/progress/metrics.ts`
- Test: `tests/unit/progress.test.ts`, `tests/api/progress.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 3, 6, 10 — `prisma`, `isPremium`, `getCurrentUser`
- Produces: `getProgressSeries(userId, isPremiumUser): Promise<ProgressData>` and `POST /api/progress/metrics`. Task 16's charts consume `ProgressData`.

- [ ] **Step 1: Write the failing test**

`tests/unit/progress.test.ts` — seed logs, sets, and metrics, then assert the aggregations: total workouts, weekly volume grouped by ISO week, total set count, and the weight series ordered oldest-first.

`tests/api/progress.test.ts` — assert a free caller receives the weight series but not the premium series, and a premium caller receives both. The premium split is the assertion most likely to regress, so make it explicit:

```ts
const freeBody = await getFreeUserProgress()
expect(freeBody.data.weightSeries.length).toBeGreaterThan(0)
expect(freeBody.data.volumeSeries).toBeUndefined()
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/progress.test.ts tests/api/progress.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/services/progress.ts` returns:

```ts
export type ProgressData = {
  weightSeries: { date: string; weightKg: number }[]
  workoutCount: number
  weeklyWorkoutCount: number
  // present only when isPremiumUser is true
  volumeSeries?: { week: string; totalKg: number; setCount: number }[]
  macroSeries?: { week: string; proteinGrams: number }[]
}
```

Weight and workout counts are always returned. `volumeSeries` and `macroSeries` are only computed when `isPremiumUser` is true — do not compute them and then delete them, because that leaks the data through timing and the response is genuinely smaller without them.

`metrics.ts` validates with `bodyMetricSchema` and creates a `BodyMetric` for the session user.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/progress.test.ts tests/api/progress.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 12 passed. Do not run git.

---

## Task 13: AI chat route

**Files:**
- Create: `pages/api/ai/chat.ts`
- Test: `tests/api/chat.test.ts`

**Interfaces:**
- Consumes: Tasks 3, 4, 6, 8, 9 — `chatSchema`, `getCurrentUser`, `requirePremium`, `buildCoachContext`, `getCoachProvider`
- Produces: `POST /api/ai/chat`. Task 17's coach page consumes it.

- [ ] **Step 1: Write the failing test**

```ts
it('rejects an anonymous request with 401', ...)
it('rejects a free user with 403 PREMIUM_REQUIRED', ...)
it('persists both the user message and the assistant reply', ...)
it('returns a reply even when the live provider is misconfigured', ...)
```

The last one sets `ANTHROPIC_API_KEY` to an invalid value and asserts a 200 with a non-empty reply — this is the fallback contract from the spec, and it is the most valuable test in the file.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/api/chat.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`pages/api/ai/chat.ts`: method check → `getCurrentUser` (401) → `requirePremium` (403) → rate limit (429) → parse with `chatSchema` (400) → `buildCoachContext(user.id)` → load the last 20 `CoachMessage` rows as history → `getCoachProvider().reply({ message, context, history })` → persist both messages → `ok({ reply })`.

Wrap the whole provider call in a try/catch. On failure, fall back to `new SimulatedCoachProvider().reply(...)` rather than returning a 500. A chat that dead-ends on a provider error violates the spec.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/api/chat.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 13 passed. Do not run git.

---

## Task 14: Billing service and routes

**Files:**
- Create: `lib/services/billing/types.ts`, `simulated.ts`, `stripe.ts`, `index.ts`
- Create: `pages/api/billing/checkout.ts`, `portal.ts`, `pages/api/webhooks/stripe.ts`
- Test: `tests/unit/billing.test.ts`, `tests/api/billing.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 3, 4 — `prisma`, `ok`, `fail`, `getCurrentUser`, `checkoutSchema`
- Produces: `getBillingProvider(): BillingProvider`, the checkout/portal endpoints, and the webhook. Task 15's settings page and the simulated checkout page consume the provider.

- [ ] **Step 1: Write the failing test**

`tests/unit/billing.test.ts`:

```ts
it('uses the simulated provider when STRIPE_SECRET_KEY is absent', ...)
it('uses the stripe provider when STRIPE_SECRET_KEY is present', ...)
it('the simulated checkout flips the user to premium', ...)
it('the simulated checkout is idempotent for an already-premium user', ...)
```

`tests/api/billing.test.ts`:

```ts
it('rejects an unsigned webhook when STRIPE_WEBHOOK_SECRET is absent', ...)
it('rejects a webhook with an invalid signature', ...)
it('rejects an anonymous checkout request with 401', ...)
```

The signature-rejection tests are the security-critical ones — an unsigned or badly-signed webhook must never change a user's tier.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/billing.test.ts tests/api/billing.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement types and the simulated provider**

`lib/services/billing/types.ts`:

```ts
export interface BillingProvider {
  createCheckout(input: { userId: string; tier: string; email: string }): Promise<{ url: string }>
  createPortal(input: { userId: string; stripeCustomerId: string }): Promise<{ url: string }>
}
```

`simulated.ts` sets `subscriptionTier = 'premium'` on the user and returns `{ url: '/checkout?plan=premium&simulated=1' }`. It is idempotent — calling it on an already-premium user is a no-op that still returns the URL.

- [ ] **Step 4: Implement the Stripe provider**

`stripe.ts` instantiates `new Stripe(process.env.STRIPE_SECRET_KEY!)` lazily inside the method, not at module scope, so an absent key does not throw during import. `createCheckout` creates or reuses a `stripeCustomerId` on the user and returns the Checkout Session URL. `createPortal` returns a Billing Portal session URL.

- [ ] **Step 5: Implement the webhook with raw-body verification**

`pages/api/webhooks/stripe.ts` must export the config that disables the body parser — this is required to read the raw body for signature verification:

```ts
export const config = {
  api: { bodyParser: false },
}
```

Read the raw body off the request stream, and if `STRIPE_WEBHOOK_SECRET` is absent, return 400 and change nothing. Construct the event with `stripe.webhooks.constructEvent(rawBody, signature, secret)`, catch the constructor's throw on a bad signature and return 400. On `checkout.session.completed`, set the user referenced by `metadata.userId` to premium.

- [ ] **Step 6: Implement selection and the routes**

`index.ts` mirrors the coach selection: `getBillingProvider()` returns the Stripe provider when `STRIPE_SECRET_KEY` is set, otherwise the simulated one — evaluated at call time.

`checkout.ts` requires a session, validates with `checkoutSchema`, calls the provider, returns `ok({ url })`. `portal.ts` requires a session and returns 400 with a clear message when the user has no Stripe customer, since the simulated provider has no portal.

- [ ] **Step 7: Run to verify it passes**

Run: `npx vitest run tests/unit/billing.test.ts tests/api/billing.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 14 passed. Do not run git.

---

## Task 15: App shell, layout components, and the frontend API client

**Files:**
- Create: `lib/api-client.ts`, `components/ui/*`, `components/layout/*`
- Create: `pages/_app.tsx`, `pages/_document.tsx`
- Test: `tests/unit/api-client.test.ts`

**Interfaces:**
- Consumes: Task 3's `ApiError` and envelope shape
- Produces: `apiFetch<T>()`, `AppShell`, `Sidebar`, `PublicNav`, `Button`, `Card`, `Input`, `Toast`, `Modal`. Every page after this task uses these.

- [ ] **Step 1: Write the failing test**

`tests/unit/api-client.test.ts` — mock `fetch`:

```ts
it('unwraps a success envelope', async () => {
  mockFetch.mockResolvedValue(jsonResponse({ ok: true, data: { id: 7 } }))
  await expect(apiFetch('/api/workouts')).resolves.toEqual({ id: 7 })
})

it('throws ApiError with the server message on failure', async () => {
  mockFetch.mockResolvedValue(jsonResponse({ ok: false, error: { code: 'PREMIUM_REQUIRED', message: 'Upgrade to continue' } }))
  await expect(apiFetch('/api/ai/chat')).rejects.toThrow('Upgrade to continue')
})

it('throws on a non-2xx response even without a valid envelope', async () => {
  mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
  await expect(apiFetch('/api/workouts')).rejects.toThrow()
})
```

The third case matters — a 500 from an unhandled error may not carry our envelope, and the client must still produce a usable error.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/api-client.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the client**

`lib/api-client.ts`:

```ts
import { ApiError } from '@/lib/http'

export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError('NETWORK', 'Could not reach the server', 0)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ApiError('BAD_RESPONSE', 'Unexpected server response', response.status)
  }

  if (!response.ok || (body as any)?.ok === false) {
    const err = (body as any)?.error
    throw new ApiError(
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Something went wrong',
      response.status,
    )
  }

  return (body as any).data as T
}
```

- [ ] **Step 4: Build the UI primitives and shell**

`Button`, `Card`, `Input`, `Toast`, `Modal` — small, typed, using the `@theme` colors from Task 1. `AppShell` renders a responsive `Sidebar` (collapsing to a bottom bar on mobile per the mobile-first constraint) plus the page content. `Sidebar` reads the current route via `useRouter()` to highlight the active item.

`_app.tsx` imports `styles/globals.css`, loads the Inter and Playfair Display fonts from `next/font`, and mounts a `ToastProvider`.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/unit/api-client.test.ts`
Expected: PASS.

- [ ] **Step 6: Visual check**

```bash
npm run dev
```

Open http://localhost:3000. The existing stub should render inside the new fonts and background color. Kill the server.

**Checkpoint:** Record that Task 15 passed. Do not run git.

---

## Task 16: Public pages — landing, login, signup

**Files:**
- Modify: `pages/index.tsx` (replace the stub)
- Create: `pages/login.tsx`, `pages/signup.tsx`

**Interfaces:**
- Consumes: Tasks 5, 15 — `apiFetch`, `Button`, `Card`, `Input`, `AppShell`
- Produces: the three public routes.

- [ ] **Step 1: Replace the landing page**

`pages/index.tsx` becomes a real marketing page: hero, feature grid (workout videos, diet plans, AI coaching, analytics), a pricing section showing the free tier against premium, and CTAs to `/signup`. Follow the navy/emerald/gold palette. Do not leave any part of the current stub markup.

- [ ] **Step 2: Build signup and login**

Both are client forms with local validation, a loading state on submit, and server errors surfaced from the `ApiError` message. On success, redirect to `/dashboard`.

- [ ] **Step 3: Verify manually**

```bash
npm run dev
```

Sign up with a fresh email, confirm the redirect to `/dashboard` (it will be a stub until Task 17), and log out.

**Checkpoint:** Record that Task 16 passed. Do not run git.

---

## Task 17: Authenticated pages — dashboard, workouts, workout detail

**Files:**
- Create: `pages/dashboard.tsx`, `pages/onboarding.tsx`, `pages/workouts/index.tsx`, `pages/workouts/[id].tsx`
- Test: `tests/e2e/auth-flow.spec.ts` (partial — the full E2E lands in Task 22)

**Interfaces:**
- Consumes: Tasks 10, 12, 15, 16 — `apiFetch`, `AppShell`, workout endpoints
- Produces: the dashboard, onboarding, library, and player routes.

- [ ] **Step 1: Onboarding**

`/onboarding` collects goal, weight, and experience level, writes them to the user, and seeds an initial `BodyMetric`. Redirect here from `/dashboard` when `goal` is null.

- [ ] **Step 2: Dashboard**

`getServerSideProps` reads the session and returns the streak, workouts this week, latest weight, and a recommended workout. Recommended = the newest workout in a category the user has not logged recently; fall back to any workout if every category is recent.

- [ ] **Step 3: Workout library**

`/workouts` fetches the list and renders a filterable grid. Filters are category, difficulty, and a search box, applied client-side over the fetched list. Premium items show a lock overlay for free users that links to the pricing section.

- [ ] **Step 4: Workout detail and set logger**

`/workouts/[id]` renders the embed, parses `setsJson` into the prescribed exercise list, and lets the user log sets and mark the workout complete. On completion, `router.push('/progress')` so the user sees their data land — this is the spine of the app from the spec.

- [ ] **Step 5: Verify manually**

Log in, browse, filter, open a workout, log two sets, mark complete, and confirm the redirect to `/progress`.

**Checkpoint:** Record that Task 17 passed. Do not run git.

---

## Task 18: Diet, progress, coach, settings, and checkout pages

**Files:**
- Create: `pages/diet.tsx`, `pages/progress.tsx`, `pages/coach.tsx`, `pages/settings.tsx`, `pages/checkout.tsx`

**Interfaces:**
- Consumes: Tasks 11, 12, 13, 14, 15 — all remaining endpoints and providers
- Produces: the five remaining routes.

- [ ] **Step 1: Read the dataviz skill before writing any chart code**

Invoke the `dataviz` skill. This is required by the global constraints and it governs palette, chart type selection, and axis treatment for the `/progress` charts.

- [ ] **Step 2: Diet page**

Plan cards grouped by goal, each with a macro bar and an expandable meal list. Premium plans show a lock for free users.

- [ ] **Step 3: Progress page**

Renders the series from Task 12. Free users see the weight trend and workout counts; premium-only charts render an upgrade prompt rather than an empty state — an empty chart reads as a bug, not as a paywall.

- [ ] **Step 4: Coach page**

A message thread over `/api/ai/chat` with the user and assistant turns distinguished. Free users see an upgrade prompt instead of the input. Show a small "simulated coach" note when `ANTHROPIC_API_KEY` is absent, so the user is not misled about what they are talking to.

- [ ] **Step 5: Settings and checkout**

`/settings` shows the profile, subscription tier, and a manage-billing button. `/checkout` is the simulated flow: it calls the provider, then shows a confirmation state explaining that with Stripe keys configured it would redirect to real Checkout. Do not fake a card form — that implies payment handling we have not built.

- [ ] **Step 6: Verify manually**

```bash
npm run dev
```

Walk the full upgrade path: free user → hit a premium gate → pricing → `/checkout` → tier flips → the gate opens and `/progress` shows the premium charts. Then log out and back in to confirm the tier persisted.

**Checkpoint:** Record that Task 18 passed. Do not run git.

---

## Task 19: Coverage and typecheck gate

**Files:**
- None — verification only.

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit
```

Expected: zero errors. Fix every one — `strict: true` from Task 1 means this is stricter than the project has ever been.

- [ ] **Step 2: Full test suite**

```bash
npm test
```

Expected: all green.

- [ ] **Step 3: Coverage**

```bash
npm run coverage
```

Expected: ≥80% across `lib/**`. If any service falls short, add tests — do not lower the threshold or add `/* istanbul ignore */` comments.

- [ ] **Step 4: Production build**

```bash
npm run build
```

Expected: a clean build. This is the check that catches server-only code leaking into the client bundle — if `lib/db.ts` gets imported from a component, the build fails here.

**Checkpoint:** Record that Task 19 passed. Do not run git.

---

## Task 20: End-to-end test

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/main-flow.spec.ts`

**Interfaces:**
- Consumes: every route and endpoint from Tasks 5–18
- Produces: an automated proof of the critical path.

- [ ] **Step 1: Configure Playwright**

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

- [ ] **Step 2: Install the browser**

```bash
npx playwright install chromium
```

- [ ] **Step 3: Write the critical-path test**

`tests/e2e/main-flow.spec.ts` — signup with a unique email → land on onboarding → complete it → land on dashboard → open a workout → log a set → mark complete → assert redirected to `/progress` and the workout appears in the list. Then log out, log back in, and assert the logged workout is still there — this proves persistence, not just in-memory state.

- [ ] **Step 4: Run it**

```bash
npm run test:e2e
```

Expected: PASS on a clean database. If prior seed data interferes, have the test create its own uniquely-identified user rather than depending on an empty DB.

**Checkpoint:** Record that Task 20 passed. Do not run git.

---

## Task 21: Documentation and environment handoff

**Files:**
- Create: `README.md`
- Modify: `.env.example`, `docs/superpowers/specs/2026-09-24-fitness-app-design.md` (status only)

- [ ] **Step 1: Write the README**

Cover: what the app is, prerequisites (Node 24), setup steps (`npm install`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run dev`), the env var table with each optional key's simulated-vs-live behavior spelled out, the available scripts, and the known limitations from the spec's final section.

- [ ] **Step 2: Mark the spec as implemented**

Change the spec's status line from "Draft for review" to "Implemented". Do not otherwise edit the spec — it is the record of what was agreed, not a running changelog.

- [ ] **Step 3: Final verification pass**

```bash
npm run typecheck && npm test && npm run build
```

Expected: all three pass from a clean shell.

**Checkpoint:** Record that Task 21 passed. Do not run git.

---

## Self-Review

**1. Spec coverage.** Every spec section maps to at least one task: stack and deps (Task 1), architecture and API envelope (Tasks 3, 15), API surface (Tasks 5, 10, 11, 12, 13, 14), data model (Task 2), pages and flows (Tasks 16–18), service layer (Tasks 6, 8, 9, 14), seed data (Task 7), error handling (Tasks 3, 13, 15), security (Tasks 4, 5, 10, 13, 14), testing (Tasks 19, 20), env vars (Task 1), known limitations (Task 21). No gaps.

**2. Placeholder scan.** Task 7 (seed content) and Task 16–18 (page markup) describe required structure without reproducing full page JSX — this is intentional, since reproducing 40 files of component code in a plan would double its length without adding information. Every other step carries actual code. No `TBD`, no "add appropriate error handling", no "similar to Task N".

**3. Type consistency.** `CoachContext` is defined in Task 8 and consumed unchanged in Task 9. `ProgressData` is defined in Task 12 and consumed by Task 18. `SessionUser` is defined in Task 4 and consumed by Tasks 6, 10, 13. `getCoachProvider` and `getBillingProvider` are each defined once and used once by their route handler. Naming is consistent across tasks.

**Two corrections made during this plan's writing**, both from verifying rather than assuming:
- `prisma@latest` is `8.0.0-rc.15`. The plan pins `7.10.0` and adds a global constraint against installing unpinned.
- Tailwind is v4, which has no config file and no `content` array — a v3 setup would have failed silently. The plan uses `@theme` in CSS.
