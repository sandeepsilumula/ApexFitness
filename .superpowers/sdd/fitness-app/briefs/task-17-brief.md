# SDD Task Brief — Task 17: Authenticated pages — dashboard, workouts, workout detail

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

## Task 17: Authenticated pages — dashboard, workouts, workout detail
Authenticated pages — dashboard, workouts, workout detail

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
