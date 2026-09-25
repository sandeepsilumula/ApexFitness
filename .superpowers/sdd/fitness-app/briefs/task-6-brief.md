# SDD Task Brief — Task 6: Tier gating helpers

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

## Task 6: Tier gating helpers
Tier gating helpers

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
