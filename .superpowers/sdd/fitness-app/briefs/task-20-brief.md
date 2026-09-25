# SDD Task Brief — Task 20: End-to-end test

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

## Task 20: End-to-end test
End-to-end test

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
