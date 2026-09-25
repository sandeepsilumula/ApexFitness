# SDD Task Brief — Task 2: Prisma schema and client singleton

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

## Task 2: Prisma schema and client singleton
Prisma schema and client singleton

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`
- Test: `tests/unit/db.test.ts`

**Interfaces:**
- Consumes: Task 1 (npm scripts, `@/` alias)
- Produces: `prisma` client at `@/lib/db`, all 9 models. Every later task imports `prisma` from `@/lib/db`.

- [ ] **Step 1: Write the schema**

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  passwordHash       String
  name               String
  goal               String?
  experienceLevel    String?
  stripeCustomerId   String?  @unique
  subscriptionTier   String   @default("free")
  subscriptionStatus String   @default("active")
  createdAt          DateTime @default(now())
  sessions           Session[]
  workoutLogs        WorkoutLog[]
  exerciseSets       ExerciseSet[]
  bodyMetrics        BodyMetric[]
  coachMessages      CoachMessage[]
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Workout {
  id          String       @id @default(cuid())
  slug        String       @unique
  title       String
  description String
  category    String
  difficulty  String
  durationMin Int
  equipment   String
  embedUrl    String
  thumbnail   String
  isPremium   Boolean      @default(false)
  setsJson    String?
  logs        WorkoutLog[]
  sets        ExerciseSet[]
}

model WorkoutLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workoutId   String
  workout     Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  completedAt DateTime @default(now())
  durationMin Int
  notes       String?
}

model ExerciseSet {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workoutId String
  workout   Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  setNumber Int
  reps      Int
  weightKg  Float?
  loggedAt  DateTime @default(now())
}

model MealPlan {
  id             String @id @default(cuid())
  slug           String @unique
  title          String
  goal           String
  description    String
  caloriesTarget Int
  proteinGrams   Int
  carbsGrams     Int
  fatGrams       Int
  isPremium      Boolean @default(false)
  meals          Meal[]
}

model Meal {
  id           String   @id @default(cuid())
  mealPlanId   String
  mealPlan     MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
  slot         String
  name         String
  calories     Int
  proteinGrams Int
  items        String
}

model BodyMetric {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  weightKg   Float?
  bodyFatPct Float?
  recordedAt DateTime @default(now())
}

model CoachMessage {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      String
  content   String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Create the client singleton**

`lib/db.ts`:

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

The `globalThis` cache prevents Next.js hot-reload from exhausting database connections.

- [ ] **Step 3: Generate the client and create the database**

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Expected: Prisma creates `prisma/dev.db` and a migration folder. If `migrate dev` prompts for a reset or complains about the datasource, read the error before continuing.

- [ ] **Step 4: Write the failing test**

`tests/unit/db.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/db'

describe('prisma client', () => {
  it('connects and queries User', async () => {
    const count = await prisma.user.count()
    expect(typeof count).toBe('number')
  })

  it('creates and cascades a session', async () => {
    const user = await prisma.user.create({
      data: { email: 'cascade@test.local', passwordHash: 'x', name: 'Cascade' },
    })
    await prisma.session.create({
      data: { token: 'cascade-token', userId: user.id, expiresAt: new Date(Date.now() + 1000) },
    })
    await prisma.user.delete({ where: { id: user.id } })
    const sessions = await prisma.session.count({ where: { userId: user.id } })
    expect(sessions).toBe(0)
  })
})
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run tests/unit/db.test.ts`
Expected: FAIL — `DATABASE_URL` resolves relative to the schema, and the test database file does not exist yet.

- [ ] **Step 6: Point tests at their own database**

Create `prisma/test.db` by running `DATABASE_URL="file:./test.db" npx prisma migrate deploy`. Then re-run the test.

Run: `npx vitest run tests/unit/db.test.ts`
Expected: PASS. The singleton reuses the same `globalThis` cache, so both tests share one client.

- [ ] **Step 7: Confirm isolation from the dev database**

Run: `npx prisma migrate status`
Expected: reports the dev database at `dev.db`. Tests must never touch it.

**Checkpoint:** Record that Task 2 passed. Do not run git.

---
