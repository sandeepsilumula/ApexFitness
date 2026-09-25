# SDD Task Brief — Task 7: Seed data

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

## Task 7: Seed data
Seed data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add `"prisma": { "seed": "tsx prisma/seed.ts" }`)

**Interfaces:**
- Consumes: Task 2's Prisma models
- Produces: 12 workouts, 3 meal plans, 1 free + 2 premium items of each type.

- [ ] **Step 1: Add tsx and wire the seed command**

```bash
npm install --save-dev --save-exact tsx@4.20.6
```

Add to `package.json`:

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

- [ ] **Step 2: Write the seed**

`prisma/seed.ts` must be idempotent — use `upsert` on `slug` so re-running does not duplicate.

Workout categories: strength, cardio, mobility, yoga. Difficulty: beginner, intermediate, advanced. Exactly 1 of the 12 has `isPremium: true`; the other 11 are free. Strength workouts carry a `setsJson` value — a JSON-encoded array of `{ name, sets, reps }` — which Task 12 parses to render the prescribed exercise list.

Meal plans: one cut, one maintain, one bulk, each with real macro math where `proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9` is within 10% of `caloriesTarget`. One free, two premium. Each plan has 4 meals (breakfast, lunch, dinner, snack) whose per-meal macros sum to the plan totals.

Embed URLs must point to real, freely-embeddable fitness video hosts. Verify each URL resolves before finishing this task — a dead embed ships a broken player.

- [ ] **Step 3: Run the seed**

```bash
npx prisma db seed
npx prisma studio --help > /dev/null   # confirm the schema is valid without opening a browser
```

Expected: seed completes without error.

- [ ] **Step 4: Verify counts**

```bash
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{console.log('workouts',await p.workout.count());console.log('premiumWorkouts',await p.workout.count({where:{isPremium:true}}));console.log('mealPlans',await p.mealPlan.count());console.log('meals',await p.meal.count());await p.\$disconnect()})()"
```

Expected: `workouts 12`, `premiumWorkouts 1`, `mealPlans 3`, `meals 12`.

- [ ] **Step 5: Check the macro math holds**

```bash
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{for(const pl of await p.mealPlan.findMany()){const m=await p.meal.findMany({where:{mealPlanId:pl.id}});const calc=pl.proteinGrams*4+pl.carbsGrams*4+pl.fatGrams*9;console.log(pl.slug,'plan',pl.caloriesTarget,'macro-derived',calc,'meals-sum',m.reduce((a,x)=>a+x.calories,0),'p-sum',m.reduce((a,x)=>a+x.proteinGrams,0),'vs',pl.proteinGrams)}})()"
```

Expected: macro-derived within 10% of the target, and per-meal sums matching the plan totals. Fix any plan that fails before moving on.

**Checkpoint:** Record that Task 7 passed. Do not run git.

---
