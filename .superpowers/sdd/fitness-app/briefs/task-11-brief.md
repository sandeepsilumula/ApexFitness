# SDD Task Brief — Task 11: Diet plan route

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

## Task 11: Diet plan route
Diet plan route

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
