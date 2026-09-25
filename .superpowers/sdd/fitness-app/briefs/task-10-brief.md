# SDD Task Brief — Task 10: Workout read routes and logging

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

## Task 10: Workout read routes and logging
Workout read routes and logging

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
