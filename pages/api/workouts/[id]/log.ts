import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canViewWorkout } from '@/lib/services/tier'
import { findWorkout } from '@/lib/workouts'
import { logWorkoutSchema } from '@/lib/validation/schemas'
import { ok, fail } from '@/lib/http'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use POST'))

  const user = await getCurrentUser(req)
  if (!user) return res.status(401).json(fail('UNAUTHORISED', 'Sign in to log a workout'))

  const parsed = logWorkoutSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json(fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input'))
  }

  const workout = await findWorkout(req.query.id)
  if (!workout) return res.status(404).json(fail('NOT_FOUND', 'Workout not found'))

  if (!canViewWorkout(user, workout)) {
    return res.status(403).json(fail('PREMIUM_REQUIRED', 'This workout requires a premium subscription'))
  }

  // Identity comes from the session only — a userId in the body is ignored.
  const log = await prisma.workoutLog.create({
    data: {
      userId: user.id,
      workoutId: workout.id,
      durationMin: parsed.data.durationMin,
      notes: parsed.data.notes ?? null,
    },
  })

  return res.status(200).json(ok(log))
}
