import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regression cover for the P2 audit item: below `lg` the six destinations were
 * a single horizontally scrollable strip, so Coach and Settings scrolled off
 * screen with no affordance and users never found them.
 *
 * This asserts the *source* rather than a rendered DOM, because vitest runs in
 * the `node` environment here with no testing-library — and because the
 * properties that matter (a 44px target, `env(safe-area-inset-bottom)`, a tab
 * count of exactly five) live in className strings and CSS, not in props.
 */

const ROOT = process.cwd()
const source = (rel: string) => readFileSync(path.resolve(ROOT, rel), 'utf8')

const BOTTOM_NAV = source('components/layout/BottomNav.tsx')
const SIDEBAR = source('components/layout/Sidebar.tsx')
const APP_SHELL = source('components/layout/AppShell.tsx')
const GLOBALS_CSS = source('styles/globals.css')

/** Reads the route list the More tab claims as its own, so a destination
 *  dropped from that array fails here rather than becoming unreachable. */
function moreRoutes(): string[] {
  const match = BOTTOM_NAV.match(/const MORE_ROUTES = \[([^\]]*)\]/)
  expect(match, 'MORE_ROUTES is missing from BottomNav.tsx').not.toBeNull()
  return [...(match as RegExpMatchArray)[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

describe('the mobile bottom tab bar', () => {
  it('shows exactly five tabs: four destinations plus More', () => {
    // Four of the six destinations become permanent tabs; the fifth tab is
    // More. A sixth tab would be the regression this replaced.
    const destinations = (SIDEBAR.match(/\{ href: '/g) ?? []).length
    expect(destinations).toBe(6)
    expect(BOTTOM_NAV).toContain('NAV_ITEMS.slice(0, 4)')
    expect(BOTTOM_NAV).toContain('>More</span>')
  })

  it('promotes only Dashboard, Workouts, Diet and Progress to permanent tabs', () => {
    expect(BOTTOM_NAV).toContain('NAV_ITEMS.slice(0, 4)')
    // Coach and Settings must not also appear as bar tabs, or the bar would
    // carry six destinations and the labels would truncate.
    expect(BOTTOM_NAV).toContain('NAV_ITEMS.slice(4)')
  })

  it('keeps Coach, Settings, premium and sign out behind the More sheet', () => {
    expect(BOTTOM_NAV).toContain('<Modal open={moreOpen} title="More"')
    expect(BOTTOM_NAV).toContain('Go premium')
    expect(BOTTOM_NAV).toContain('Sign out')
    expect(BOTTOM_NAV).toContain('NAV_ITEMS.slice(4)')
    expect(moreRoutes()).toEqual(['/coach', '/settings', '/checkout'])
  })

  it('gives every tab target at least a 44px hit area', () => {
    // `min-h-11` is 2.75rem = 44px, the same floor `min-tap` carries elsewhere.
    const minHeight = BOTTOM_NAV.match(/min-h-11/g) ?? []
    expect(minHeight.length).toBeGreaterThanOrEqual(2)
    expect(BOTTOM_NAV).toContain('gap-2')
  })

  it('clears the iOS home indicator and Android gesture bar', () => {
    expect(GLOBALS_CSS).toContain('--safe-bottom: env(safe-area-inset-bottom, 0px)')
    expect(BOTTOM_NAV).toContain('pb-[var(--safe-bottom)]')
  })

  it('reserves its own height in <main> from the same custom property', () => {
    // One source of truth: the bar and the padding that clears it must not
    // be two hand-maintained numbers.
    expect(GLOBALS_CSS).toContain('--bottom-nav-total: calc(var(--bottom-nav-height) + var(--safe-bottom))')
    expect(BOTTOM_NAV).toContain("style={{ height: 'var(--bottom-nav-height)' }}")
    expect(APP_SHELL).toContain('pb-[calc(var(--bottom-nav-total)+1.5rem)]')
  })

  it('is hidden at lg and up, where the sidebar column takes over', () => {
    expect(BOTTOM_NAV).toContain('lg:hidden')
    // The desktop column must not render below lg, or the two navigations
    // would stack and the strip defect would return in a worse form.
    expect(SIDEBAR).toContain('lg:flex')
    expect(SIDEBAR).not.toContain('max-lg:')
    expect(SIDEBAR).not.toContain('overflow-x-auto')
  })

  it('marks the active tab by more than colour', () => {
    expect(BOTTOM_NAV).toContain("aria-current={active ? 'page' : undefined}")
    expect(BOTTOM_NAV).toContain('ActiveRule')
    // The rule is a 2px-tall bar, not a one-pixel hairline.
    expect(BOTTOM_NAV).toContain('h-0.5')
  })

  it('names every tab and marks the More button as opening a dialog', () => {
    expect(BOTTOM_NAV).toContain('aria-haspopup="dialog"')
    expect(BOTTOM_NAV).toContain('aria-expanded={moreOpen}')
    // Every tab carries a visible text label, so the decorative svgs and the
    // active rule must stay out of the accessibility tree.
    expect((BOTTOM_NAV.match(/aria-hidden="true"/g) ?? []).length).toBe(6)
    for (const item of ['Dashboard', 'Workouts', 'Diet', 'Progress']) {
      expect(SIDEBAR).toContain(`label: '${item}'`)
    }
  })
})
