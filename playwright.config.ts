import { defineConfig, devices } from '@playwright/test'

/**
 * Port 3100 is deliberately off the Next.js default (3000) so a developer's own
 * `npm run dev` session can keep running on 3000 while the e2e suite boots its
 * own server. `reuseExistingServer` reuses one that is already up on 3100
 * instead of failing.
 */
const PORT = 3100
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // Signup and login both hash a bcrypt cost-12 password, so the happy path is
  // the slowest thing in the suite. The default 30s is tight on a cold dev server.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // The specs share one SQLite database, so they must not race each other.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // The mobile spec asserts phone-viewport behaviour, so it belongs only
      // to the phone project. Running it here would assert nothing.
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      // A real phone viewport and touch capability, so e2e/mobile.spec.ts
      // catches the horizontal-overflow regressions that only appear on
      // narrow screens. `isMobile` makes the browser apply the meta viewport,
      // which is exactly what a phone user gets.
      //
      // Pixel 5 rather than iPhone 13 on purpose: the iPhone descriptor
      // requires WebKit, which is not installed and would add a ~100MB browser
      // download for a layout-only assertion. The overflow bug is CSS box
      // layout, identical across engines. Switch to `devices['iPhone 13']` plus
      // `npx playwright install webkit` when real iOS fidelity is needed.
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Next 16 allows one dev server per project directory, so the suite uses
      // its own build directory rather than fighting a running `npm run dev`.
      NEXT_DIST_DIR: '.next-e2e',
    },
  },
})
