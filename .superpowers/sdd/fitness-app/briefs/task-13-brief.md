# SDD Task Brief — Task 13: AI chat route

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

## Task 13: AI chat route
AI chat route

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
