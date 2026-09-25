# SDD Task Brief — Task 1: Project foundation — deps, config, Tailwind, test harness

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

## Task 1: Project foundation — deps, config, Tailwind, test harness
Project foundation — deps, config, Tailwind, test harness

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
