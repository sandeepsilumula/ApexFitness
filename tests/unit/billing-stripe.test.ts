import { describe, it, expect, beforeEach, afterAll, afterEach, vi } from 'vitest'
import { prisma } from '@/lib/db'

const STRIPE_EMAIL = 'billing-stripe@test.local'
const dummyPasswordHash = '$2b$12$abcdefghijklmnopqrstuv'

const customersCreate = vi.fn()
const sessionsCreate = vi.fn()
const portalCreate = vi.fn()

/**
 * The Stripe SDK is mocked at module level so no network call is ever made:
 * these tests assert the provider's own logic (key guard, customer reuse,
 * price/URL selection), not Stripe's behaviour.
 */
vi.mock('stripe', () => {
  function Stripe() {
    return {
      customers: { create: customersCreate },
      checkout: { sessions: { create: sessionsCreate } },
      billingPortal: { sessions: { create: portalCreate } },
    }
  }
  return { default: Stripe }
})

const { StripeBillingProvider } = await import('@/lib/services/billing/stripe')

async function purgeFixtures(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: STRIPE_EMAIL } })
}

async function makeUser(stripeCustomerId: string | null = null) {
  return prisma.user.create({
    data: {
      email: STRIPE_EMAIL,
      passwordHash: dummyPasswordHash,
      name: 'Stripe Sam',
      stripeCustomerId,
    },
  })
}

beforeEach(async () => {
  await purgeFixtures()
  vi.clearAllMocks()
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.STRIPE_PRICE_ID_PREMIUM
  delete process.env.NEXT_PUBLIC_APP_URL
})

afterEach(async () => {
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.NEXT_PUBLIC_APP_URL
  delete process.env.STRIPE_PRICE_ID_PREMIUM
})

afterAll(async () => {
  await purgeFixtures()
})

describe('StripeBillingProvider without a secret key', () => {
  it('fails checkout with a configuration error when STRIPE_SECRET_KEY is unset', async () => {
    const user = await makeUser()
    const provider = new StripeBillingProvider()

    await expect(
      provider.createCheckout({ userId: user.id, tier: 'premium', email: user.email }),
    ).rejects.toThrow('STRIPE_SECRET_KEY is not set')
  })

  it('fails the portal with the same configuration error', async () => {
    const provider = new StripeBillingProvider()

    await expect(
      provider.createPortal({ userId: 'whoever', stripeCustomerId: 'cus_123' }),
    ).rejects.toThrow('STRIPE_SECRET_KEY is not set')
  })
})

describe('StripeBillingProvider.createCheckout', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
  })

  it('reuses an existing stripe customer rather than creating a second one', async () => {
    const user = await makeUser('cus_existing')
    sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_1' })

    const provider = new StripeBillingProvider()
    const result = await provider.createCheckout({ userId: user.id, tier: 'premium', email: user.email })

    expect(customersCreate).not.toHaveBeenCalled()
    expect(result.url).toBe('https://checkout.stripe.com/session_1')
  })

  it('creates and persists a customer when the user has none', async () => {
    const user = await makeUser()
    customersCreate.mockResolvedValue({ id: 'cus_new' })
    sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_2' })

    const provider = new StripeBillingProvider()
    await provider.createCheckout({ userId: user.id, tier: 'premium', email: user.email })

    expect(customersCreate).toHaveBeenCalledWith({ email: user.email, metadata: { userId: user.id } })
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(updated.stripeCustomerId).toBe('cus_new')
  })

  it('uses the configured premium price id when present', async () => {
    process.env.STRIPE_PRICE_ID_PREMIUM = 'price_from_env'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.test'
    const user = await makeUser('cus_existing')
    sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_3' })

    const provider = new StripeBillingProvider()
    await provider.createCheckout({ userId: user.id, tier: 'premium', email: user.email })

    const arg = sessionsCreate.mock.calls[0][0]
    expect(arg.line_items).toEqual([{ price: 'price_from_env', quantity: 1 }])
    expect(arg.metadata).toEqual({ userId: user.id, tier: 'premium' })
    expect(arg.success_url).toBe('https://app.example.test/settings?checkout=success')
    expect(arg.cancel_url).toBe('https://app.example.test/settings?checkout=canceled')
  })

  it('falls back to the placeholder price and localhost urls when nothing is configured', async () => {
    const user = await makeUser('cus_existing')
    sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_4' })

    const provider = new StripeBillingProvider()
    await provider.createCheckout({ userId: user.id, tier: 'premium', email: user.email })

    const arg = sessionsCreate.mock.calls[0][0]
    expect(arg.line_items).toEqual([{ price: 'price_premium_monthly', quantity: 1 }])
    expect(arg.success_url).toBe('http://localhost:3000/settings?checkout=success')
    expect(arg.cancel_url).toBe('http://localhost:3000/settings?checkout=canceled')
  })

  it('returns an empty url when stripe gives back no session url', async () => {
    const user = await makeUser('cus_existing')
    sessionsCreate.mockResolvedValue({ url: null })

    const provider = new StripeBillingProvider()
    const result = await provider.createCheckout({ userId: user.id, tier: 'premium', email: user.email })

    expect(result.url).toBe('')
  })
})

describe('StripeBillingProvider.createPortal', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
  })

  it('opens a portal session for the supplied customer', async () => {
    portalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/p/portal' })

    const provider = new StripeBillingProvider()
    const result = await provider.createPortal({ userId: 'u1', stripeCustomerId: 'cus_existing' })

    expect(portalCreate).toHaveBeenCalledWith({
      customer: 'cus_existing',
      return_url: 'http://localhost:3000/settings',
    })
    expect(result.url).toBe('https://billing.stripe.com/p/portal')
  })

  it('uses the configured app url as the portal return url', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.test'
    portalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/p/portal' })

    const provider = new StripeBillingProvider()
    await provider.createPortal({ userId: 'u1', stripeCustomerId: 'cus_existing' })

    expect(portalCreate.mock.calls[0][0].return_url).toBe('https://app.example.test/settings')
  })
})
