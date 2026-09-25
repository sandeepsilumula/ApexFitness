import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { getBillingProvider } from '@/lib/services/billing'

const BILLING_EMAIL = 'billing-test@test.local'
const dummyPasswordHash = '$2b$12$abcdefghijklmnopqrstuv'

async function purgeFixtures(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: BILLING_EMAIL } })
}

beforeEach(async () => {
  await purgeFixtures()
  vi.resetModules()
  delete process.env.STRIPE_SECRET_KEY
})

describe('getBillingProvider()', () => {
  it('uses the simulated provider when STRIPE_SECRET_KEY is absent', async () => {
    const provider = getBillingProvider()
    expect(provider.constructor.name).toBe('SimulatedBillingProvider')
  })

  it('uses the stripe provider when STRIPE_SECRET_KEY is present', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    // Fresh import after env change
    const { getBillingProvider: freshProvider } = await import('@/lib/services/billing')
    const provider = freshProvider()
    expect(provider.constructor.name).toBe('StripeBillingProvider')
  })
})

describe('SimulatedBillingProvider', () => {
  it('flips the user to premium on checkout', async () => {
    await prisma.user.create({
      data: { email: BILLING_EMAIL, passwordHash: dummyPasswordHash, name: 'Billing Test' },
    })
    const user = await prisma.user.findUniqueOrThrow({ where: { email: BILLING_EMAIL } })

    const { SimulatedBillingProvider } = await import('@/lib/services/billing/simulated')
    const provider = new SimulatedBillingProvider()

    const result = await provider.createCheckout({ userId: user.id, tier: 'premium', email: user.email })

    expect(result.url).toContain('/checkout?plan=premium&simulated=1')
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(updated.subscriptionTier).toBe('premium')
  })

  it('is idempotent for an already-premium user', async () => {    await prisma.user.create({
      data: { email: BILLING_EMAIL, passwordHash: dummyPasswordHash, name: 'Billing Test', subscriptionTier: 'premium' },
    })
    const user = await prisma.user.findUniqueOrThrow({ where: { email: BILLING_EMAIL } })

    const { SimulatedBillingProvider } = await import('@/lib/services/billing/simulated')
    const provider = new SimulatedBillingProvider()

    const result = await provider.createCheckout({ userId: user.id, tier: 'premium', email: user.email })

    expect(result.url).toContain('/checkout?plan=premium&simulated=1')
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(updated.subscriptionTier).toBe('premium')
  })

  it('leaves the tier untouched for a non-premium tier request', async () => {
    await prisma.user.create({
      data: { email: BILLING_EMAIL, passwordHash: dummyPasswordHash, name: 'Billing Test' },
    })
    const user = await prisma.user.findUniqueOrThrow({ where: { email: BILLING_EMAIL } })

    const { SimulatedBillingProvider } = await import('@/lib/services/billing/simulated')
    const result = await new SimulatedBillingProvider().createCheckout({
      userId: user.id,
      tier: 'free',
      email: user.email,
    })

    expect(result.url).toBe('/checkout?plan=free&simulated=1')
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(updated.subscriptionTier).toBe('free')
  })

  it('returns a simulated portal url without touching the user record', async () => {
    await prisma.user.create({
      data: { email: BILLING_EMAIL, passwordHash: dummyPasswordHash, name: 'Billing Test' },
    })
    const user = await prisma.user.findUniqueOrThrow({ where: { email: BILLING_EMAIL } })

    const { SimulatedBillingProvider } = await import('@/lib/services/billing/simulated')
    const result = await new SimulatedBillingProvider().createPortal({
      userId: user.id,
      stripeCustomerId: 'cus_nope',
    })

    expect(result.url).toBe('/billing/portal?simulated=1')
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(updated.stripeCustomerId).toBeNull()
  })
})