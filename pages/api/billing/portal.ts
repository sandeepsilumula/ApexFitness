import type { NextApiRequest, NextApiResponse } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { getBillingProvider } from '@/lib/services/billing'
import { ok, fail } from '@/lib/http'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use GET'))

  const user = await getCurrentUser(req)
  if (!user) return res.status(401).json(fail('UNAUTHORISED', 'Sign in to manage your subscription'))

  if (!user.stripeCustomerId) {
    return res.status(400).json(fail('NO_CUSTOMER', 'No Stripe customer ID found for this user'))
  }

  const { url } = await getBillingProvider().createPortal({
    userId: user.id,
    stripeCustomerId: user.stripeCustomerId,
  })

  return res.status(200).json(ok({ url }))
}
