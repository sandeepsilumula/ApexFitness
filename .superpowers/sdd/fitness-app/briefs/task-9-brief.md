# SDD Task Brief — Task 9: Coach providers

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

## Task 9: Coach providers
Coach providers

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
