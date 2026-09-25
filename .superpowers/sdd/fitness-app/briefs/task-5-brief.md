# SDD Task Brief — Task 5: Auth route handlers

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

## Task 5: Auth route handlers
Auth route handlers

**Files:**
- Create: `pages/api/auth/signup.ts`, `login.ts`, `logout.ts`, `me.ts`
- Test: `tests/api/auth.test.ts`

**Interfaces:**
- Consumes: Tasks 3, 4 — `ok`, `fail`, `ApiError`, `signupSchema`, `loginSchema`, `hashPassword`, `verifyPassword`, `createSession`, `revokeSession`, `setSessionCookie`, `clearSessionCookie`, `getCurrentUser`
- Produces: the four auth endpoints.

- [ ] **Step 1: Write the failing test**

`tests/api/auth.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import signupHandler from '@/pages/api/auth/signup'
import loginHandler from '@/pages/api/auth/login'
import meHandler from '@/pages/api/auth/me'
import { prisma } from '@/lib/db'

const email = 'signup@test.local'

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email } })
})

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email } })
})

describe('POST /api/auth/signup', () => {
  it('creates a user and returns 200', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { email, password: 'password123', name: 'Sam' },
    })
    await signupHandler(req, res)
    expect(res._getStatusCode()).toBe(200)
    const users = await prisma.user.count({ where: { email } })
    expect(users).toBe(1)
  })

  it('never returns the password hash', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { email, password: 'password123', name: 'Sam' },
    })
    await signupHandler(req, res)
    const body = JSON.stringify(res._getJSONData())
    expect(body).not.toContain('$2')
    expect(body).not.toContain('passwordHash')
  })

  it('rejects a duplicate email with 409', async () => {
    const first = createMocks({ method: 'POST', body: { email, password: 'password123', name: 'Sam' } })
    await signupHandler(first.req, first.res)
    const second = createMocks({ method: 'POST', body: { email, password: 'password123', name: 'Sam' } })
    await signupHandler(second.req, second.res)
    expect(second.res._getStatusCode()).toBe(409)
  })

  it('rejects a short password with 400', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { email, password: 'short', name: 'Sam' } })
    await signupHandler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('rejects wrong credentials with 401', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { email, password: 'nope' } })
    await loginHandler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('returns 401 without a session cookie', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await meHandler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })
})
```

- [ ] **Step 2: Install node-mocks-http and run to verify failure**

```bash
npm install --save-dev --save-exact node-mocks-http@1.16.2
npx vitest run tests/api/auth.test.ts
```

Expected: FAIL — handlers do not exist.

- [ ] **Step 3: Implement signup**

`pages/api/auth/signup.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import { signupSchema } from '@/lib/validation/schemas'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth'
import { ok, fail } from '@/lib/http'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use POST'))

  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json(fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input'))
  }

  const { email, password, name } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) return res.status(409).json(fail('EMAIL_TAKEN', 'That email is already registered'))

  const user = await prisma.user.create({
    data: { email: normalizedEmail, name, passwordHash: await hashPassword(password) },
  })

  const token = await createSession(user.id)
  setSessionCookie(res, token)

  return res.status(200).json(ok({ id: user.id, email: user.email, name: user.name }))
}
```

- [ ] **Step 4: Implement login, logout, me**

`pages/api/auth/login.ts` follows the same shape: validate with `loginSchema`, look up by lowercased email, `verifyPassword`, on mismatch return 401 with a deliberately identical message for both "no such user" and "wrong password" so the endpoint is not a user-enumeration oracle.

`pages/api/auth/logout.ts` reads `req.cookies[SESSION_COOKIE]`, calls `revokeSession` if present, clears the cookie, returns `ok({ loggedOut: true })`.

`pages/api/auth/me.ts` calls `getCurrentUser(req)`, returns 401 if null, else `ok(user)`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/api/auth.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 5 passed. Do not run git.

---
