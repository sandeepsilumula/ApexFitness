import type { APIRequestContext, Page } from '@playwright/test'

/**
 * `prisma/seed.ts` creates workouts and meal plans only — it never creates a
 * User, so there is no seeded account to sign in as. Every spec that needs an
 * authenticated session registers a fresh account through the real signup API
 * first, which also exercises the httpOnly-cookie path the UI depends on.
 *
 * The email is unique per run so a re-run against the same SQLite file does not
 * collide with the `EMAIL_TAKEN` guard.
 */
let runCounter = 0

export function uniqueUser(prefix = 'e2e'): {
  name: string
  email: string
  password: string
} {
  runCounter += 1
  const stamp = `${Date.now()}-${runCounter}`
  return {
    name: `E2E ${prefix}`,
    email: `${prefix}-${stamp}@example.test`,
    // The signup schema requires at least 8 characters.
    password: 'e2e-password-1234',
  }
}

export type TestUser = ReturnType<typeof uniqueUser>

/** Creates the account via the API and returns the storage state Playwright gave it. */
export async function signUpViaApi(
  request: APIRequestContext,
  user: TestUser,
): Promise<void> {
  const response = await request.post('/api/auth/signup', {
    data: { name: user.name, email: user.email, password: user.password },
  })

  if (response.status() !== 200) {
    throw new Error(
      `Signup API returned ${response.status()}: ${await response.text()}`,
    )
  }
}

/**
 * Registers a user through the API and then signs the *browser* in through the
 * real login form.
 *
 * The `request` fixture owns a cookie jar that is separate from the browser
 * context, so a session created through `signUpViaApi` is invisible to `page`.
 * Any test that needs an authenticated page must go through this helper rather
 * than assuming the signup cookie carried over.
 */
export async function signInViaUi(
  page: Page,
  request: APIRequestContext,
  prefix: string,
): Promise<TestUser> {
  const user = uniqueUser(prefix)
  await signUpViaApi(request, user)

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/dashboard$/)

  return user
}
