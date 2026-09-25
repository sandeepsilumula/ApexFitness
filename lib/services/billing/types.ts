export interface BillingProvider {
  createCheckout(input: { userId: string; tier: string; email: string }): Promise<{ url: string }>
  createPortal(input: { userId: string; stripeCustomerId: string }): Promise<{ url: string }>
}