import Stripe from 'stripe'
import type { BillingProvider } from '@/lib/services/billing/types'
import { prisma } from '@/lib/db'

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  // No explicit apiVersion: the pinned SDK types only accept the version it ships
  // with, and passing anything else is a compile error.
  return new Stripe(secretKey)
}

async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  })

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId
  }

  const client = getStripeClient()
  const customer = await client.customers.create({ email, metadata: { userId } })
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  })
  return customer.id
}

export class StripeBillingProvider implements BillingProvider {
  async createCheckout(input: { userId: string; tier: string; email: string }): Promise<{ url: string }> {
    const client = getStripeClient()
    const customerId = await getOrCreateCustomer(input.userId, input.email)

    // For a premium tier, we assume a monthly subscription. In a real app, you'd have
    // a price ID mapping. Here we use a placeholder price ID.
    const priceId = process.env.STRIPE_PRICE_ID_PREMIUM ?? 'price_premium_monthly'

    const session = await client.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings?checkout=canceled`,
      metadata: { userId: input.userId, tier: input.tier },
    })

    return { url: session.url ?? '' }
  }

  async createPortal(input: { userId: string; stripeCustomerId: string }): Promise<{ url: string }> {
    const client = getStripeClient()
    const session = await client.billingPortal.sessions.create({
      customer: input.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings`,
    })
    return { url: session.url }
  }
}