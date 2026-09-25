# SDD Task Brief — Task 3: Envelope helpers, rate limiting, and shared validation

## Global Constraints (binding for this task)

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

## Task 3: Envelope helpers, rate limiting, and shared validation
Envelope helpers, rate limiting, and shared validation

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
