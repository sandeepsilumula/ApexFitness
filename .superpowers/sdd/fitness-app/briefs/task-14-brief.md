# SDD Task Brief — Task 14: Billing service and routes

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

## Task 14: Billing service and routes
Billing service and routes

**Files:**
- Create: `lib/services/billing/types.ts`, `simulated.ts`, `stripe.ts`, `index.ts`
- Create: `pages/api/billing/checkout.ts`, `portal.ts`, `pages/api/webhooks/stripe.ts`
- Test: `tests/unit/billing.test.ts`, `tests/api/billing.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 3, 4 — `prisma`, `ok`, `fail`, `getCurrentUser`, `checkoutSchema`
- Produces: `getBillingProvider(): BillingProvider`, the checkout/portal endpoints, and the webhook. Task 15's settings page and the simulated checkout page consume the provider.

- [ ] **Step 1: Write the failing test**

`tests/unit/billing.test.ts`:

```ts
it('uses the simulated provider when STRIPE_SECRET_KEY is absent', ...)
it('uses the stripe provider when STRIPE_SECRET_KEY is present', ...)
it('the simulated checkout flips the user to premium', ...)
it('the simulated checkout is idempotent for an already-premium user', ...)
```

`tests/api/billing.test.ts`:

```ts
it('rejects an unsigned webhook when STRIPE_WEBHOOK_SECRET is absent', ...)
it('rejects a webhook with an invalid signature', ...)
it('rejects an anonymous checkout request with 401', ...)
```

The signature-rejection tests are the security-critical ones — an unsigned or badly-signed webhook must never change a user's tier.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/billing.test.ts tests/api/billing.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement types and the simulated provider**

`lib/services/billing/types.ts`:

```ts
export interface BillingProvider {
  createCheckout(input: { userId: string; tier: string; email: string }): Promise<{ url: string }>
  createPortal(input: { userId: string; stripeCustomerId: string }): Promise<{ url: string }>
}
```

`simulated.ts` sets `subscriptionTier = 'premium'` on the user and returns `{ url: '/checkout?plan=premium&simulated=1' }`. It is idempotent — calling it on an already-premium user is a no-op that still returns the URL.

- [ ] **Step 4: Implement the Stripe provider**

`stripe.ts` instantiates `new Stripe(process.env.STRIPE_SECRET_KEY!)` lazily inside the method, not at module scope, so an absent key does not throw during import. `createCheckout` creates or reuses a `stripeCustomerId` on the user and returns the Checkout Session URL. `createPortal` returns a Billing Portal session URL.

- [ ] **Step 5: Implement the webhook with raw-body verification**

`pages/api/webhooks/stripe.ts` must export the config that disables the body parser — this is required to read the raw body for signature verification:

```ts
export const config = {
  api: { bodyParser: false },
}
```

Read the raw body off the request stream, and if `STRIPE_WEBHOOK_SECRET` is absent, return 400 and change nothing. Construct the event with `stripe.webhooks.constructEvent(rawBody, signature, secret)`, catch the constructor's throw on a bad signature and return 400. On `checkout.session.completed`, set the user referenced by `metadata.userId` to premium.

- [ ] **Step 6: Implement selection and the routes**

`index.ts` mirrors the coach selection: `getBillingProvider()` returns the Stripe provider when `STRIPE_SECRET_KEY` is set, otherwise the simulated one — evaluated at call time.

`checkout.ts` requires a session, validates with `checkoutSchema`, calls the provider, returns `ok({ url })`. `portal.ts` requires a session and returns 400 with a clear message when the user has no Stripe customer, since the simulated provider has no portal.

- [ ] **Step 7: Run to verify it passes**

Run: `npx vitest run tests/unit/billing.test.ts tests/api/billing.test.ts`
Expected: PASS.

**Checkpoint:** Record that Task 14 passed. Do not run git.

---
