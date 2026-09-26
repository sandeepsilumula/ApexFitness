import { expect, test } from '@playwright/test'

test.describe('landing page', () => {
  test('renders the public marketing page with its sign-in and signup links', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('in one place')
    // "Sign in" appears in both the header nav and the footer, so scope to the
    // banner to keep the locator strict.
    const header = page.getByRole('banner')
    await expect(header.getByRole('link', { name: 'Sign in' })).toBeVisible()
    await expect(header.getByRole('link', { name: 'Start free' })).toBeVisible()

    // The pricing section is the public page's second half; reaching it proves
    // the whole page rendered rather than just the hero.
    await expect(page.getByRole('heading', { name: 'Free to start. Premium when it earns its keep.' })).toBeVisible()
  })
})
