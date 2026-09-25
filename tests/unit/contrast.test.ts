import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AA_LARGE_OR_NON_TEXT,
  AA_TEXT,
  APP_TOKENS,
  EXEMPT,
  contrast,
  hexToRgb,
  relativeLuminance,
} from '@/lib/contrast'

/**
 * Regression cover for the P1 audit item: several 12px labels used
 * `text-slate-500`, which measures 3.75:1 on `navy-900` and 3.93:1 on
 * `navy-950` — below the 4.5:1 WCAG AA floor for normal-size text.
 *
 * This asserts the *palette* rather than the rendered DOM, because the token
 * contract is what every `text-slate-*` class resolves to. A class can only be
 * as legible as its token, so fixing the token fixes every use site at once.
 */

const GLOBALS_CSS = path.resolve(process.cwd(), 'styles/globals.css')

function declaredTokens(): Map<string, string> {
  const css = readFileSync(GLOBALS_CSS, 'utf8')
  const tokens = new Map<string, string>()

  for (const match of css.matchAll(/--color-([\w-]+):\s*(#[\da-f]{3,6});/gi)) {
    tokens.set(match[1], match[2])
  }

  return tokens
}

describe('relative luminance', () => {
  it('returns 1 for white and 0 for black', () => {
    expect(relativeLuminance(hexToRgb('#ffffff'))).toBeCloseTo(1, 5)
    expect(relativeLuminance(hexToRgb('#000000'))).toBeCloseTo(0, 5)
  })
})

describe('hexToRgb', () => {
  it('expands the three-digit shorthand form', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#0a1128')).toEqual({ r: 10, g: 17, b: 40 })
  })

  it('rejects a value that is not a hex colour', () => {
    expect(() => hexToRgb('rebeccapurple')).toThrow('Not a hex colour')
  })
})

describe('contrastRatio', () => {
  it('matches the 21:1 maximum for black on white', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 2)
  })

  it('returns 1 for a colour against itself', () => {
    expect(contrast('#94a3b8', '#94a3b8')).toBeCloseTo(1, 5)
  })
})

describe('the shipped palette', () => {
  const { surfaces, foregrounds } = APP_TOKENS

  it('mirrors styles/globals.css so the two cannot drift', () => {
    const declared = declaredTokens()
    const palette = { ...surfaces, ...foregrounds }

    // Forward: every token this project overrides must still hold the value the
    // palette claims, or the audit above is measuring a colour nothing renders.
    for (const [name, hex] of Object.entries(palette)) {
      if (!declared.has(name)) continue // Tailwind built-in, not overridden here

      expect(
        declared.get(name),
        `--color-${name} drifted in styles/globals.css`,
      ).toBe(hex)
    }

    // Reverse: any token the project adds to the theme must be registered here,
    // so it gets a contrast verdict instead of silently shipping unverified.
    for (const [name, hex] of declared) {
      expect(
        palette[name as keyof typeof palette],
        `--color-${name} (${hex}) is declared in styles/globals.css but is not in APP_TOKENS`,
      ).toBe(hex)
    }
  })

  it('keeps every text foreground at or above the 4.5:1 AA floor on every surface', () => {
    for (const [fgName, fgHex] of Object.entries(foregrounds)) {
      if (fgName in EXEMPT) continue

      for (const [bgName, bgHex] of Object.entries(surfaces)) {
        const ratio = contrast(fgHex, bgHex)

        expect(
          ratio,
          `${fgName} on ${bgName} is ${ratio.toFixed(2)}:1, below the ${AA_TEXT}:1 AA floor for normal text`,
        ).toBeGreaterThanOrEqual(AA_TEXT)
      }
    }
  })

  it('holds exempt tokens to the 3:1 non-text floor rather than waiving them entirely', () => {
    for (const fgName of Object.keys(EXEMPT)) {
      const fgHex = foregrounds[fgName as keyof typeof foregrounds]
      expect(fgHex, `${fgName} is exempt but is not in the foreground palette`).toBeDefined()

      for (const [bgName, bgHex] of Object.entries(surfaces)) {
        const ratio = contrast(fgHex, bgHex)

        expect(
          ratio,
          `exempt token ${fgName} on ${bgName} is ${ratio.toFixed(2)}:1, below even the 3:1 non-text floor — if it is purely decorative, say so in EXEMPT`,
        ).toBeGreaterThanOrEqual(AA_LARGE_OR_NON_TEXT)
      }
    }
  })
})
