import type { NextApiRequest, NextApiResponse } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { canViewWorkout } from '@/lib/services/tier'
import { findWorkout } from '@/lib/workouts'
import { ok, fail } from '@/lib/http'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use GET'))

  const workout = await findWorkout(req.query.id)
  if (!workout) return res.status(404).json(fail('NOT_FOUND', 'Workout not found'))

  // An anonymous caller is treated as free-tier: the detail is gated, while the
  // list endpoint still shows the workout with a lock.
  const user = (await getCurrentUser(req)) ?? { subscriptionTier: 'free' }
  if (!canViewWorkout(user, workout)) {
    return res.status(403).json(fail('PREMIUM_REQUIRED', 'This workout requires a premium subscription'))
  }

  return res.status(200).json(ok({ ...workout, locked: false }))
}
