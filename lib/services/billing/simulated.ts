import type { BillingProvider } from '@/lib/services/billing/types'
import { prisma } from '@/lib/db'

export class SimulatedBillingProvider implements BillingProvider {
  async createCheckout(input: { userId: string; tier: string; email: string }): Promise<{ url: string }> {
    // If the user is not already premium, set them to premium.
    // The simulated provider is used when there's no Stripe key, so we just flip the tier.
    if (input.tier === 'premium') {
      await prisma.user.update({
        where: { id: input.userId },
        data: { subscriptionTier: 'premium' },
      })
    }
    // Return a simulated URL. In a real app, this would redirect to a Stripe Checkout.
    // For simulation, we return a local URL with a flag.
    return { url: `/checkout?plan=${input.tier}&simulated=1` }
  }

  async createPortal(input: { userId: string; stripeCustomerId: string }): Promise<{ url: string }> {
    // The simulated provider does not have a customer portal, so we return a URL that
    // would be used in the real app, but note that the brief says the simulated provider
    // has no portal. However, the route handler for the portal will check for the Stripe
    // customer ID and return 400 if missing. The simulated provider does not set a
    // stripeCustomerId, so the portal route will return 400.
    // We still return a URL for consistency, but the route will handle the missing ID.
    return { url: '/billing/portal?simulated=1' }
  }
}