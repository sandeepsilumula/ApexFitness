# SDD Task Brief — Task 4: Auth service — password hashing and sessions

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

## Task 4: Auth service — password hashing and sessions
Auth service — password hashing and sessions

**Files:**
- Create: `lib/auth.ts`
- Test: `tests/unit/auth.test.ts`

**Interfaces:**
- Consumes: Task 2 (`prisma` from `@/lib/db`)
- Produces: `hashPassword`, `verifyPassword`, `createSession`, `getSessionUser`, `revokeSession`, `SESSION_COOKIE`, `getCurrentUser(req)`. Task 5's route handlers and every later authenticated route use these.

- [ ] **Step 1: Write the failing test**

`tests/unit/auth.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'
import {
  hashPassword,
  verifyPassword,
  createSession,
  getSessionUser,
  revokeSession,
} from '@/lib/auth'

let userId: string

beforeEach(async () => {
  const user = await prisma.user.create({
    data: { email: `auth-${Date.now()}@test.local`, passwordHash: 'x', name: 'Auth' },
  })
  userId = user.id
})

afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: userId } })
})

describe('password hashing', () => {
  it('produces a hash that verifies', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash).not.toContain('correct horse')
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false)
  })

  it('salts, so the same password hashes differently each time', async () => {
    const a = await hashPassword('same')
    const b = await hashPassword('same')
    expect(a).not.toBe(b)
  })
})

describe('sessions', () => {
  it('creates a session and resolves it back to the user', async () => {
    const token = await createSession(userId)
    const user = await getSessionUser(token)
    expect(user?.id).toBe(userId)
  })

  it('rejects an unknown token', async () => {
    expect(await getSessionUser('not-a-real-token')).toBeNull()
  })

  it('rejects an expired session', async () => {
    const token = await createSession(userId, new Date(Date.now() - 1000))
    expect(await getSessionUser(token)).toBeNull()
  })

  it('revocation invalidates the token immediately', async () => {
    const token = await createSession(userId)
    await revokeSession(token)
    expect(await getSessionUser(token)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/auth.test.ts`
Expected: FAIL — cannot resolve `@/lib/auth`.

- [ ] **Step 3: Implement**

`lib/auth.ts`:

```ts
import bcrypt from 'bcryptjs'
import type { NextApiRequest } from 'next'
import { prisma } from '@/lib/db'

const BCRYPT_COST = 12
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const SESSION_COOKIE = 'fitness_session'

export type SessionUser = {
  id: string
  email: string
  name: string
  goal: string | null
  subscriptionTier: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(
  userId: string,
  expiresAt: Date = new Date(Date.now() + SESSION_TTL_MS),
): Promise<string> {
  const token = require('node:crypto').randomBytes(32).toString('hex')
  await prisma.session.create({ data: { token, userId, expiresAt } })
  return token
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) return null

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    goal: session.user.goal,
    subscriptionTier: session.user.subscriptionTier,
  }
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } })
}

export function setSessionCookie(res: any, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`,
  )
}

export function clearSessionCookie(res: any): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  )
}

export async function getCurrentUser(req: NextApiRequest): Promise<SessionUser | null> {
  const token = req.cookies?.[SESSION_COOKIE]
  if (typeof token !== 'string' || token.length === 0) return null
  return getSessionUser(token)
}
```

If `require('node:crypto')` trips the linter, change it to a top-level `import { randomBytes } from 'node:crypto'`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/auth.test.ts`
Expected: PASS. bcrypt at cost 12 takes roughly 250ms per hash, so this file takes a few seconds.

**Checkpoint:** Record that Task 4 passed. Do not run git.

---
