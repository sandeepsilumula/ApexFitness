import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { visibleDietPlans } from '@/lib/services/tier'
import { ok, fail } from '@/lib/http'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use GET'))

  const goal = typeof req.query.goal === 'string' ? req.query.goal.trim() : ''
  const user = await getCurrentUser(req)

  const plans = await prisma.mealPlan.findMany({
    where: goal ? { goal } : {},
    include: { meals: { orderBy: { slot: 'asc' } } },
    orderBy: { caloriesTarget: 'asc' },
  })

  // A signed-in free member gets only what they can actually use. An anonymous
  // visitor still sees the premium plan's *summary* so the pricing upsell is
  // visible before signup, but the meals themselves are withheld — `locked` is
  // only a UI hint, so shipping the rows would hand the premium content to
  // anyone who simply omits the session cookie.
  const payload = user
    ? visibleDietPlans(user, plans).map((plan) => ({ ...plan, locked: false }))
    : plans.map((plan) => ({ ...plan, meals: plan.isPremium ? [] : plan.meals, locked: plan.isPremium }))

  return res.status(200).json(ok(payload))
}
