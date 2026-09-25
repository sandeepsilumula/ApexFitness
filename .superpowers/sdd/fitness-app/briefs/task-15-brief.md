# SDD Task Brief — Task 15: App shell, layout components, and the frontend API client

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

## Task 15: App shell, layout components, and the frontend API client
App shell, layout components, and the frontend API client

**Files:**
- Create: `lib/api-client.ts`, `components/ui/*`, `components/layout/*`
- Create: `pages/_app.tsx`, `pages/_document.tsx`
- Test: `tests/unit/api-client.test.ts`

**Interfaces:**
- Consumes: Task 3's `ApiError` and envelope shape
- Produces: `apiFetch<T>()`, `AppShell`, `Sidebar`, `PublicNav`, `Button`, `Card`, `Input`, `Toast`, `Modal`. Every page after this task uses these.

- [ ] **Step 1: Write the failing test**

`tests/unit/api-client.test.ts` — mock `fetch`:

```ts
it('unwraps a success envelope', async () => {
  mockFetch.mockResolvedValue(jsonResponse({ ok: true, data: { id: 7 } }))
  await expect(apiFetch('/api/workouts')).resolves.toEqual({ id: 7 })
})

it('throws ApiError with the server message on failure', async () => {
  mockFetch.mockResolvedValue(jsonResponse({ ok: false, error: { code: 'PREMIUM_REQUIRED', message: 'Upgrade to continue' } }))
  await expect(apiFetch('/api/ai/chat')).rejects.toThrow('Upgrade to continue')
})

it('throws on a non-2xx response even without a valid envelope', async () => {
  mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
  await expect(apiFetch('/api/workouts')).rejects.toThrow()
})
```

The third case matters — a 500 from an unhandled error may not carry our envelope, and the client must still produce a usable error.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/api-client.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the client**

`lib/api-client.ts`:

```ts
import { ApiError } from '@/lib/http'

export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError('NETWORK', 'Could not reach the server', 0)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ApiError('BAD_RESPONSE', 'Unexpected server response', response.status)
  }

  if (!response.ok || (body as any)?.ok === false) {
    const err = (body as any)?.error
    throw new ApiError(
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Something went wrong',
      response.status,
    )
  }

  return (body as any).data as T
}
```

- [ ] **Step 4: Build the UI primitives and shell**

`Button`, `Card`, `Input`, `Toast`, `Modal` — small, typed, using the `@theme` colors from Task 1. `AppShell` renders a responsive `Sidebar` (collapsing to a bottom bar on mobile per the mobile-first constraint) plus the page content. `Sidebar` reads the current route via `useRouter()` to highlight the active item.

`_app.tsx` imports `styles/globals.css`, loads the Inter and Playfair Display fonts from `next/font`, and mounts a `ToastProvider`.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/unit/api-client.test.ts`
Expected: PASS.

- [ ] **Step 6: Visual check**

```bash
npm run dev
```

Open http://localhost:3000. The existing stub should render inside the new fonts and background color. Kill the server.

**Checkpoint:** Record that Task 15 passed. Do not run git.

---
