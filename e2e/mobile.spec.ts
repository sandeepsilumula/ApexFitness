import { expect, test } from '@playwright/test'
import { signInViaUi } from './helpers'

/**
 * Regression cover for the P0 audit item: every authenticated route overflowed
 * horizontally below ~600px because AppShell pinned a `w-60 shrink-0` sidebar
 * next to a `flex-1` main column and neither side had a breakpoint.
 */
const AUTHENTICATED_ROUTES = [
  '/dashboard',
  '/workouts',
  '/diet',
  '/progress',
  '/coach',
  '/settings',
] as const

test.describe('mobile layout', () => {
  test('authenticated routes do not scroll horizontally on a phone', async ({ page, request }) => {
    await signInViaUi(page, request, 'mobile')

    for (const route of AUTHENTICATED_ROUTES) {
      await page.goto(route)
      await expect(page).toHaveURL(new RegExp(`${route}$`))

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

      // One pixel of slack for sub-pixel rounding on fractional device widths.
      expect(
        overflow.scrollWidth,
        `${route} overflows horizontally: content is ${overflow.scrollWidth}px wide in a ${overflow.clientWidth}px viewport`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1)
    }
  })

  test('every navigation destination is reachable on a phone', async ({ page, request }) => {
    await signInViaUi(page, request, 'mobile-nav')

    for (const label of ['Workouts', 'Diet', 'Progress', 'Coach', 'Settings']) {
      const link = page.getByRole('link', { name: label, exact: true }).first()
      await expect(link).toBeVisible()
      await link.click()
      await expect(page).toHaveURL(new RegExp(`/${label.toLowerCase()}`))
    }
  })

  test('signing out is reachable on a phone', async ({ page, request }) => {
    await signInViaUi(page, request, 'mobile-signout')

    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page).toHaveURL(/\/login$/)
  })
})
