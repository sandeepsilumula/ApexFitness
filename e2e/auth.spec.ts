import { expect, test } from '@playwright/test'
import { signUpViaApi, uniqueUser } from './helpers'

test.describe('authentication', () => {
  test('signing up lands the new account on the authenticated dashboard', async ({ page }) => {
    const user = uniqueUser('signup')

    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()

    await page.getByLabel('Name').fill(user.name)
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Create account' }).click()

    // AuthForm pushes /dashboard once the signup response has set the cookie.
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`Welcome back, ${user.name}`)
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  })

  test('an unauthenticated visit to /dashboard is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard')

    // AppShell replaces the route with /login when /api/auth/me returns 401.
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })

  test('signing in with an existing account reaches the dashboard', async ({ page, request }) => {
    // The seed creates no users, so the account is created through the real
    // signup API and then signed in through the form.
    const user = uniqueUser('login')
    await signUpViaApi(request, user)

    await page.goto('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`Welcome back, ${user.name}`)
  })

  test('rejecting bad credentials shows the server message and stays on /login', async ({ page, request }) => {
    const user = uniqueUser('badlogin')
    await signUpViaApi(request, user)

    await page.goto('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill('definitely-not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // The login route deliberately returns the same message for an unknown
    // email and a wrong password, so it cannot enumerate accounts. Next's route
    // announcer also carries role="alert", so the message is matched by text.
    await expect(page.getByText('Invalid email or password')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('signing out returns to a public page and ends the session', async ({ page, request }) => {
    const user = uniqueUser('logout')
    await signUpViaApi(request, user)

    await page.goto('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole('button', { name: 'Sign out' }).click()

    // The sidebar's sign-out handler always lands on the public login page.
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

    // And the cookie really is gone: the dashboard bounces back out.
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })
})
