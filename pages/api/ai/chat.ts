import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { requirePremium } from '@/lib/services/tier'
import { buildCoachContext } from '@/lib/services/coach/context'
import { SimulatedCoachProvider } from '@/lib/services/coach/simulated'
import { getCoachProvider } from '@/lib/services/coach'
import type { CoachHistoryEntry, CoachReply } from '@/lib/services/coach'
import { RateLimiter } from '@/lib/rate-limit'
import { chatSchema } from '@/lib/validation/schemas'
import { ok, fail } from '@/lib/http'

/** Each call costs a model round trip, so the ceiling is per user rather than per IP. */
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 1000

const HISTORY_LIMIT = 20

const limiter = new RateLimiter({ limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use POST'))

  const user = await getCurrentUser(req)
  if (!user) return res.status(401).json(fail('UNAUTHORISED', 'Sign in to use the coach'))

  try {
    requirePremium(user)
  } catch {
    return res.status(403).json(fail('PREMIUM_REQUIRED', 'The AI coach requires a premium subscription'))
  }

  if (!limiter.check(user.id)) {
    return res.status(429).json(fail('RATE_LIMITED', 'Too many messages — take a moment'))
  }

  const parsed = chatSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json(fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input'))
  }

  const { message } = parsed.data
  const context = await buildCoachContext(user.id)

  const history = await prisma.coachMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
    select: { role: true, content: true },
  })

  // The query is newest-first, but the model needs the conversation in order.
  const orderedHistory: CoachHistoryEntry[] = history
    .reverse()
    .filter(
      (entry): entry is CoachHistoryEntry =>
        entry.role === 'user' || entry.role === 'assistant',
    )

  const input = { message, context, history: orderedHistory }
  let answer: CoachReply
  try {
    answer = await getCoachProvider().reply(input)
  } catch {
    // A provider failure must never dead-end the chat panel. The fallback is
    // still marked degraded so the UI can say the model was not reached.
    answer = await new SimulatedCoachProvider().reply(input)
  }

  // Identity comes from the session only — a userId in the body is ignored.
  await prisma.$transaction([
    prisma.coachMessage.create({ data: { userId: user.id, role: 'user', content: message } }),
    prisma.coachMessage.create({ data: { userId: user.id, role: 'assistant', content: answer.text } }),
  ])

  return res.status(200).json(ok({ reply: answer.text, degraded: answer.degraded }))
}
