import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = 'test-results/design-audit'
fs.mkdirSync(OUT, { recursive: true })

const BASE = 'http://localhost:3000'

// Auth credentials for the authenticated pass. Read from the environment only —
// never hardcode a fallback, so the audit cannot silently run against a
// well-known account that exists in a real database.
const AUDIT_EMAIL = process.env.AUDIT_EMAIL
const AUDIT_PASSWORD = process.env.AUDIT_PASSWORD

const missingCreds = []
if (!AUDIT_EMAIL) missingCreds.push('AUDIT_EMAIL')
if (!AUDIT_PASSWORD) missingCreds.push('AUDIT_PASSWORD')
if (missingCreds.length > 0) {
  console.error(
    [
      '',
      'design-audit: missing required environment variable(s): ' + missingCreds.join(', '),
      '',
      'The authenticated design pass needs a real account to sign in with. Set:',
      '',
      '  AUDIT_EMAIL=<login email for the audit account>',
      '  AUDIT_PASSWORD=<password for the audit account>',
      '',
      'Bash / Git Bash:',
      '  AUDIT_EMAIL=you@example.com AUDIT_PASSWORD=\'...\' node scripts/design-audit.mjs',
      '',
      'PowerShell:',
      '  $env:AUDIT_EMAIL="you@example.com"; $env:AUDIT_PASSWORD="..."; node scripts/design-audit.mjs',
      '',
      'There is deliberately no hardcoded default. Seed the account first, then export the',
      'values for the shell that runs the audit. Credentials are never written to disk.',
      '',
    ].join('\n'),
  )
  process.exit(1)
}

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 900 },
  { name: 'mobile-375', width: 375, height: 900 },
  { name: 'tablet-768', width: 768, height: 1000 },
  { name: 'desktop-1440', width: 1440, height: 900 },
]

const report = []

const browser = await chromium.launch()

async function probe(page, label, url) {
  const res = await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 30000 })
  const metrics = await page.evaluate(() => {
    const de = document.documentElement
    const overflow = de.scrollWidth - de.clientWidth
    const offenders = []
    if (overflow > 1) {
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        if (r.right > de.clientWidth + 1 || r.left < -1) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className?.toString?.() ?? '').slice(0, 90),
            right: Math.round(r.right),
            width: Math.round(r.width),
          })
        }
      }
    }

    // small text + contrast
    const lowContrast = []
    const smallTargets = []
    const parseRGB = (s) => (s.match(/[\d.]+/g) || []).map(Number)
    const lum = ([r, g, b]) => {
      const f = (c) => {
        c /= 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const bgOf = (el) => {
      let n = el
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor
        if (bg && !bg.includes('rgba(0, 0, 0, 0)')) return parseRGB(bg)
        n = n.parentElement
      }
      return parseRGB(getComputedStyle(document.body).backgroundColor)
    }

    for (const el of document.querySelectorAll('p,span,a,li,td,th,label,small,button,div,h1,h2,h3,h4,h5,h6')) {
      const text = (el.textContent ?? '').trim()
      if (!text || el.children.length > 0) continue
      const cs = getComputedStyle(el)
      const size = parseFloat(cs.fontSize)
      const fg = parseRGB(cs.color)
      const bg = bgOf(el)
      if (fg.length < 3 || bg.length < 3) continue
      const l1 = lum(fg) + 0.05
      const l2 = lum(bg) + 0.05
      const ratio = Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100
      const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700)
      const min = large ? 3 : 4.5
      if (ratio < min) {
        lowContrast.push({ text: text.slice(0, 45), size, weight: cs.fontWeight, ratio, min })
      }
    }

    for (const el of document.querySelectorAll('a,button,[role="button"],input,select,textarea')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.height < 44 || r.width < 44) {
        smallTargets.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 35),
          w: Math.round(r.width),
          h: Math.round(r.height),
        })
      }
    }

    const h = [...document.querySelectorAll('h1,h2,h3')]
    const headings = h.map((e) => ({ tag: e.tagName, text: e.textContent.trim().slice(0, 50) }))

    return {
      overflow,
      offenders: offenders.slice(0, 12),
      lowContrast: lowContrast.slice(0, 20),
      lowContrastCount: lowContrast.length,
      smallTargets: smallTargets.slice(0, 20),
      smallTargetCount: smallTargets.length,
      headings,
      title: document.title,
    }
  })
  report.push({ label, url, status: res?.status(), viewport: page.viewportSize(), ...metrics })
  await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: true })
}

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await ctx.newPage()
  for (const [path, label] of [
    ['/', 'landing'],
    ['/login', 'login'],
    ['/signup', 'signup'],
  ]) {
    await probe(page, `${vp.name}-${label}`, path)
  }
  // authenticated
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', AUDIT_EMAIL)
  await page.fill('input[type="password"]', AUDIT_PASSWORD)
  // Credentials come from the environment (AUDIT_EMAIL / AUDIT_PASSWORD).
  // No hardcoded default — running bare exits with a clear message to export them.
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard|workouts/, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1500)
  for (const [path, label] of [
    ['/dashboard', 'dashboard'],
    ['/workouts', 'workouts'],
    ['/diet', 'diet'],
    ['/progress', 'progress'],
    ['/coach', 'coach'],
    ['/settings', 'settings'],
  ]) {
    await probe(page, `${vp.name}-${label}`, path)
  }
  await ctx.close()
}

await browser.close()
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report.map((r) => ({ label: r.label, overflow: r.overflow, contrast: r.lowContrastCount, targets: r.smallTargetCount })), null, 1))
