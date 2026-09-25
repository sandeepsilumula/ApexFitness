import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { bodyMetricSchema } from '@/lib/validation/schemas'
import { ok, fail } from '@/lib/http'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use POST'))

  const user = await getCurrentUser(req)
  if (!user) return res.status(401).json(fail('UNAUTHORISED', 'Sign in to record measurements'))

  const parsed = bodyMetricSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json(fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input'))
  }

  // Identity comes from the session only — a userId in the body is ignored.
  const metric = await prisma.bodyMetric.create({
    data: {
      userId: user.id,
      weightKg: parsed.data.weightKg ?? null,
      bodyFatPct: parsed.data.bodyFatPct ?? null,
    },
  })

  return res.status(200).json(ok(metric))
}
