/**
 * WCAG 2.1 relative-luminance contrast maths.
 *
 * The app's colour tokens are declared as hex in `styles/globals.css` under
 * `@theme`, so they are not readable from TypeScript. `APP_TOKENS` below mirrors
 * that block, and `tests/unit/contrast.test.ts` fails if the two ever drift.
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

/** Parses `#rgb` or `#rrggbb`. Throws on anything else, so a typo fails loudly. */
export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '')

  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(normalized)) {
    throw new Error(`Not a hex colour: ${hex}`)
  }

  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized

  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number): number => {
    const normalized = value / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG 2.1 contrast ratio, from 1 to 21. Order-independent. */
export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Convenience wrapper for hex inputs. */
export function contrast(foregroundHex: string, backgroundHex: string): number {
  return contrastRatio(hexToRgb(foregroundHex), hexToRgb(backgroundHex))
}

/**
 * WCAG 2.1 SC 1.4.3. The 4.5:1 figure is the floor for normal-size body text.
 * The 3:1 figure is SC 1.4.11 for large text (18.66px bold or 24px regular) and
 * for meaningful non-text graphics such as control borders and progress bars.
 */
export const AA_TEXT = 4.5
export const AA_LARGE_OR_NON_TEXT = 3

/**
 * The app's tokens, mirroring the `@theme` block in `styles/globals.css`
 * plus the Tailwind built-ins it relies on. Add a token here in the same
 * commit you add it there.
 */
export const APP_TOKENS = {
  surfaces: {
    'navy-950': '#0a1128',
    'navy-900': '#0f172a',
    'navy-850': '#16203a',
    'navy-800': '#1e293b',
  },
  foregrounds: {
    white: '#ffffff',
    'slate-200': '#e2e8f0',
    'slate-300': '#cbd5e1',
    'slate-400': '#94a3b8',
    'slate-500': '#64748b',
    'emerald-300': '#6ee7b7',
    'emerald-400': '#34d399',
    'emerald-500': '#10b981',
    'emerald-600': '#059669',
    'gold-300': '#e8d9a0',
    'gold-400': '#fbbf24',
    'gold-450': '#c9a227',
    'gold-500': '#f59e0b',
    'gold-550': '#a8842a',
    'gold-600': '#d97706',
    'brand-200': '#6ee7c8',
    'brand-300': '#4bd6b2',
    'brand-400': '#2fb894',
    'brand-500': '#23a884',
    'brand-700': '#1c8f70',
  },
} as const

/**
 * Tokens exempt from the AA text floor because the app does not use them as a
 * text colour on a navy surface. Each entry names the real use sites that
 * justify it, so an exemption cannot quietly outlive the case that justified
 * it. Every exempt token is still held to the 3:1 SC 1.4.11 floor by the test
 * suite, and a token that cannot clear 3:1 on a surface it actually appears on
 * is a use-site defect, not an exemption.
 */
export const EXEMPT: Record<string, string> = {
  'slate-500':
    'Fails AA on every surface (3.93:1 / 3.75:1 / 3.07:1) and clears the 3:1 ' +
    'non-text floor only barely. Its last text use site, the Input ' +
    'placeholder, was promoted to slate-400 (7.29:1) in the P0 fix; nothing ' +
    'renders slate-500 as a foreground now. Do not reintroduce it as a text ' +
    'colour.',
  'emerald-600':
    'Never a text colour: it is a component background under navy-950 label ' +
    'text (Button success variant, the "Most popular" pricing badge, the user ' +
    'chat bubble), a progress or chart fill (workout goal bar, weight-trend ' +
    'bars), a container border (success Toast, assistant message Card, the ' +
    'checkout notice on top of its own 10% tint), and a decorative blur on the ' +
    'landing hero. It clears 3:1 on navy-950 and navy-900 but reaches only ' +
    '3.88:1 on navy-800, so no emerald-600 text may sit on navy-800.',
  'gold-600':
    'Never a text colour: it is a component background under navy-950 label ' +
    'text (Button primary variant, PublicNav and hero CTAs), a progress-bar ' +
    'fill, and a hover or accent border. Those uses are held to the 3:1 ' +
    'SC 1.4.11 non-text floor rather than the 4.5:1 text floor.',
  'gold-550':
    'The deep step of the custom gold ramp, defined for borders and subtle ' +
    'fills. It clears the 3:1 non-text floor on all four navy surfaces ' +
    '(5.34 / 5.10 / 4.61 / 4.18) but falls below the 4.5:1 text floor on ' +
    'navy-800, and it has no text use site anywhere in the repo yet. Use ' +
    'gold-300 or gold-450 for any text.',
  'brand-700':
    'The dark step of the brand ramp, defined for background and border use ' +
    'only. It clears the 3:1 non-text floor on all four navy surfaces ' +
    '(4.64 / 4.43 / 4.00 / 3.63) and has no text use site in the repo yet. ' +
    'It is the tint behind brand-coloured text, never the text itself — ' +
    'brand-300 through brand-500 are the text steps.',
}
