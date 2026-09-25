import type { NextApiRequest, NextApiResponse } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { checkoutSchema } from '@/lib/validation/schemas'
import { getBillingProvider } from '@/lib/services/billing'
import { fail, ok } from '@/lib/http'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use POST'))

  const user = await getCurrentUser(req)
  if (!user) return res.status(401).json(fail('UNAUTHORISED', 'Sign in to subscribe'))

  const parsed = checkoutSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json(fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input'))
  }

  const { tier } = parsed.data
  if (tier !== 'premium') {
    return res.status(400).json(fail('INVALID_TIER', 'Only premium tier is available'))
  }

  try {
    const { url } = await getBillingProvider().createCheckout({ userId: user.id, tier, email: user.email })
    return res.status(200).json(ok({ url }))
  } catch (error) {
    console.error('Checkout error:', error)
    return res.status(500).json(fail('CHECKOUT_ERROR', 'Failed to create checkout session'))
  }
}
