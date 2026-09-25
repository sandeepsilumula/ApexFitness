# SDD Task Brief — Task 21: Documentation and environment handoff

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

## Task 21: Documentation and environment handoff
Documentation and environment handoff

**Files:**
- Create: `README.md`
- Modify: `.env.example`, `docs/superpowers/specs/2026-09-24-fitness-app-design.md` (status only)

- [ ] **Step 1: Write the README**

Cover: what the app is, prerequisites (Node 24), setup steps (`npm install`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run dev`), the env var table with each optional key's simulated-vs-live behavior spelled out, the available scripts, and the known limitations from the spec's final section.

- [ ] **Step 2: Mark the spec as implemented**

Change the spec's status line from "Draft for review" to "Implemented". Do not otherwise edit the spec — it is the record of what was agreed, not a running changelog.

- [ ] **Step 3: Final verification pass**

```bash
npm run typecheck && npm test && npm run build
```

Expected: all three pass from a clean shell.

**Checkpoint:** Record that Task 21 passed. Do not run git.

---

## Self-Review

**1. Spec coverage.** Every spec section maps to at least one task: stack and deps (Task 1), architecture and API envelope (Tasks 3, 15), API surface (Tasks 5, 10, 11, 12, 13, 14), data model (Task 2), pages and flows (Tasks 16–18), service layer (Tasks 6, 8, 9, 14), seed data (Task 7), error handling (Tasks 3, 13, 15), security (Tasks 4, 5, 10, 13, 14), testing (Tasks 19, 20), env vars (Task 1), known limitations (Task 21). No gaps.

**2. Placeholder scan.** Task 7 (seed content) and Task 16–18 (page markup) describe required structure without reproducing full page JSX — this is intentional, since reproducing 40 files of component code in a plan would double its length without adding information. Every other step carries actual code. No `TBD`, no "add appropriate error handling", no "similar to Task N".

**3. Type consistency.** `CoachContext` is defined in Task 8 and consumed unchanged in Task 9. `ProgressData` is defined in Task 12 and consumed by Task 18. `SessionUser` is defined in Task 4 and consumed by Tasks 6, 10, 13. `getCoachProvider` and `getBillingProvider` are each defined once and used once by their route handler. Naming is consistent across tasks.

**Two corrections made during this plan's writing**, both from verifying rather than assuming:
- `prisma@latest` is `8.0.0-rc.15`. The plan pins `7.10.0` and adds a global constraint against installing unpinned.
- Tailwind is v4, which has no config file and no `content` array — a v3 setup would have failed silently. The plan uses `@theme` in CSS.
