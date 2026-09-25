import { StripeBillingProvider } from './stripe'
import { SimulatedBillingProvider } from './simulated'
import type { BillingProvider } from './types'

export type { BillingProvider } from './types'
export { StripeBillingProvider } from './stripe'
export { SimulatedBillingProvider } from './simulated'

/**
 * Resolved at call time so tests can toggle STRIPE_SECRET_KEY without
 * restarting the process.
 */
export function getBillingProvider(): BillingProvider {
  return process.env.STRIPE_SECRET_KEY
    ? new StripeBillingProvider()
    : new SimulatedBillingProvider()
}

export type PremiumPlan = {
  tier: 'premium'
  /** Human-readable amount, e.g. "$9.99/month". Null when not configured. */
  priceLabel: string | null
  /** Whether real payments are wired up, so the UI can say what will happen. */
  simulated: boolean
}

/**
 * The single source of truth for what the premium plan IS and what it COSTS.
 * The price lives here rather than in the page so no client component ever
 * hardcodes an amount, and so the label can change with a redeploy instead of
 * a source edit. Stripe only ever exposes the price ID, so the display label
 * is operator-supplied and we report null rather than inventing a number.
 */
export function getPremiumPlan(): PremiumPlan {
  const label = process.env.NEXT_PUBLIC_PREMIUM_PRICE_LABEL?.trim()
  return {
    tier: 'premium',
    priceLabel: label && label.length > 0 ? label : null,
    simulated: !process.env.STRIPE_SECRET_KEY,
  }
}
