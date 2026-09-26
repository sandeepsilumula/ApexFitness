/* eslint-disable no-console */
// Temporary live-app audit: console errors, failed requests, accessibility
// landmarks/labels, and heading structure across every route. Uses the
// project's own Playwright (1.63) so it reuses already-installed browsers.
const { chromium } = require('playwright')

const BASE = 'http://localhost:3000'
const ROUTES = [
  '/', '/login', '/signup', '/workouts', '/checkout',
  '/coach', '/settings', '/progress', '/diet', '/dashboard',
]

const IGNORED_REQUEST_FAILURES = [
  /favicon/i,
  /_next\/static\/chunks\/webpack-runtime/i,
]

function isRelevant(url) {
  return !IGNORED_REQUEST_FAILURES.some((re) => re.test(url))
}

// Sign-in credentials come from the environment. The audit needs a real,
// logged-in session, so it refuses to run rather than guessing an account.
const AUDIT_EMAIL = process.env.AUDIT_EMAIL
const AUDIT_PASSWORD = process.env.AUDIT_PASSWORD

const missingCredentials = [
  AUDIT_EMAIL ? null : 'AUDIT_EMAIL',
  AUDIT_PASSWORD ? null : 'AUDIT_PASSWORD',
].filter(Boolean)

if (missingCredentials.length > 0) {
  console.error(
    'AUDIT ABORTED: missing required environment variable(s): ' +
      `${missingCredentials.join(', ')}.\n\n` +
      'The audit signs in to /login to inspect authenticated pages, so it needs a\n' +
      'valid account. Set them in your shell or in .env (git-ignored), for example:\n\n' +
      '  AUDIT_EMAIL=<login email> AUDIT_PASSWORD=<login password> node scripts/audit.js\n',
  )
  process.exit(1)
}

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ url: page.url(), text: msg.text() })
  })
  page.on('pageerror', (err) => {
    pageErrors.push({ url: page.url(), text: err.message })
  })
  page.on('requestfailed', (req) => {
    if (isRelevant(req.url())) {
      failedRequests.push({ url: req.url(), failure: req.failure() && req.failure().errorText })
    }
  })
  page.on('response', (res) => {
    if (res.status() >= 400 && isRelevant(res.url())) {
      failedRequests.push({ url: res.url(), failure: `HTTP ${res.status()}` })
    }
  })

  // Sign in so the authenticated pages audit in a realistic state.
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', AUDIT_EMAIL)
  await page.fill('input[type="password"]', AUDIT_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2500)

  const results = []
  for (const route of ROUTES) {
    consoleErrors.length = 0
    pageErrors.length = 0
    failedRequests.length = 0
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(600)

    const audit = await page.evaluate(() => {
      const issues = []
      // Landmarks
      const hasMain = !!document.querySelector('main, [role="main"]')
      if (!hasMain) issues.push('no <main> landmark')
      if (!document.querySelector('h1')) issues.push('no <h1>')
      // Interactive elements without accessible names
      const named = (el) => {
        const text = (el.textContent || '').trim()
        return text || el.getAttribute('aria-label') || el.getAttribute('title') ||
          (el.getAttribute('aria-labelledby') &&
            document.getElementById(el.getAttribute('aria-labelledby')))
      }
      document.querySelectorAll('button, a[href]').forEach((el) => {
        if (!named(el)) issues.push(`unnamed ${el.tagName.toLowerCase()}: ${el.outerHTML.slice(0, 80)}`)
      })
      // Inputs without labels
      document.querySelectorAll('input, select, textarea').forEach((el) => {
        if (el.type === 'hidden') return
        const id = el.getAttribute('id')
        const hasLabel = id && document.querySelector(`label[for="${id}"]`)
        if (!hasLabel && !el.getAttribute('aria-label') && !el.closest('label')) {
          issues.push(`unlabeled input: ${el.outerHTML.slice(0, 80)}`)
        }
      })
      // Images without alt
      document.querySelectorAll('img').forEach((el) => {
        if (el.getAttribute('alt') === null) issues.push(`img missing alt: ${el.src.slice(-50)}`)
      })
      return { issues, title: document.title, h1: document.querySelector('h1')?.textContent?.trim() || null }
    })

    results.push({
      route,
      title: audit.title,
      h1: audit.h1,
      consoleErrors: [...consoleErrors],
      pageErrors: [...pageErrors],
      failedRequests: [...failedRequests],
      a11yIssues: audit.issues,
    })
  }

  await browser.close()
  console.log(JSON.stringify(results, null, 2))
})().catch((e) => {
  console.error('AUDIT FAILED:', e.message)
  process.exit(1)
})
