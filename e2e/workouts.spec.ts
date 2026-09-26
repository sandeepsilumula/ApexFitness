import { expect, test } from '@playwright/test'
import { signUpViaApi, uniqueUser } from './helpers'

/** Signs in through the login form and waits for the authenticated shell. */
async function login(page: import('@playwright/test').Page, user: ReturnType<typeof uniqueUser>) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test.describe('workouts library', () => {
  test('an authenticated user sees the seeded library with its filters', async ({ page, request }) => {
    const user = uniqueUser('library')
    await signUpViaApi(request, user)
    await login(page, user)

    await page.goto('/workouts')

    await expect(page.getByRole('heading', { name: 'Workout library' })).toBeVisible()
    // The loading copy is replaced by the cards once /api/workouts resolves.
    await expect(page.getByText('Loading workouts…')).toBeHidden()

    // A free-plan account sees the whole library, with the premium entry locked.
    await expect(page.getByRole('heading', { name: 'Beginner Full-Body Strength' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Advanced Dumbbell Full Body' })).toBeVisible()
    await expect(page.getByText('Loading workouts…')).toBeHidden()

    await expect(page.getByPlaceholder('Search workouts…')).toBeVisible()
    await expect(page.getByRole('combobox').first()).toBeVisible()
  })

  test('a premium-locked workout shows the upgrade path', async ({ page, request }) => {
    const user = uniqueUser('premium')
    await signUpViaApi(request, user)
    await login(page, user)

    await page.goto('/workouts')
    await expect(page.getByRole('heading', { name: 'Advanced Dumbbell Full Body' })).toBeVisible()

    // The locked card is overlaid with the lock badge and an upgrade button.
    await expect(page.getByText('Upgrade to unlock')).toBeVisible()

    // Opening the locked workout directly is refused by the API, so the detail
    // page renders its own upgrade panel rather than the video player.
    await page.goto('/workouts/advanced-dumbbell-full-body')
    await expect(page.getByRole('heading', { name: 'Premium workout' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Upgrade to premium' })).toBeVisible()
  })

  test('a free workout detail page opens for an authenticated user', async ({ page, request }) => {
    const user = uniqueUser('detail')
    await signUpViaApi(request, user)
    await login(page, user)

    await page.goto('/workouts/beginner-full-body-strength')

    await expect(page.getByRole('heading', { name: 'Beginner Full-Body Strength' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Prescribed sets' })).toBeVisible()
    await expect(page.locator('iframe')).toHaveAttribute(
      'title',
      'Beginner Full-Body Strength',
    )
  })
})
