import type { NextApiRequest, NextApiResponse } from 'next'
import { getPremiumPlan } from '@/lib/services/billing'
import { ok, fail } from '@/lib/http'

/**
 * Read-only description of the premium plan. The page fetches this instead of
 * reading process.env itself, so the displayed price has exactly one owner —
 * lib/services/billing — and can never drift from what checkout actually bills.
 *
 * It carries no user data, so it needs no auth: the price is public
 * information and there is nothing here to leak.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use GET'))

  return res.status(200).json(ok(getPremiumPlan()))
}
