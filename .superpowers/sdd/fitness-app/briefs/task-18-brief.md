# SDD Task Brief — Task 18: Diet, progress, coach, settings, and checkout pages

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

## Task 18: Diet, progress, coach, settings, and checkout pages
Diet, progress, coach, settings, and checkout pages

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
