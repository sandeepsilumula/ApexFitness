import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createMocks } from 'node-mocks-http'
import dietPlansHandler from '@/pages/api/diet-plans'
import { prisma } from '@/lib/db'
import { createSession, SESSION_COOKIE } from '@/lib/auth'

const FREE_EMAIL = 'diet-free@test.local'
const PREMIUM_EMAIL = 'diet-premium@test.local'

const FREE_SLUG = 'test-diet-free'
const PREMIUM_SLUG = 'test-diet-premium'

const dummyPasswordHash = '$2b$12$abcdefghijklmnopqrstuv'

async function purgeFixtures(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: [FREE_EMAIL, PREMIUM_EMAIL] } } })
  await prisma.mealPlan.deleteMany({ where: { slug: { in: [FREE_SLUG, PREMIUM_SLUG] } } })
}

beforeEach(async () => {
  await purgeFixtures()

  await Promise.all([
    prisma.user.create({
      data: { email: FREE_EMAIL, passwordHash: dummyPasswordHash, name: 'Free Dana' },
    }),
    prisma.user.create({
      data: {
        email: PREMIUM_EMAIL,
        passwordHash: dummyPasswordHash,
        name: 'Premium Drew',
        subscriptionTier: 'premium',
      },
    }),
  ])

  const free = await prisma.mealPlan.create({
    data: {
      slug: FREE_SLUG,
      title: 'Test Free Plan',
      goal: 'cut',
      description: 'A free plan used only by the API tests.',
      caloriesTarget: 1800,
      proteinGrams: 155,
      carbsGrams: 165,
      fatGrams: 55,
      isPremium: false,
    },
  })
  const premium = await prisma.mealPlan.create({
    data: {
      slug: PREMIUM_SLUG,
      title: 'Test Premium Plan',
      goal: 'bulk',
      description: 'A premium plan used only by the API tests.',
      caloriesTarget: 3000,
      proteinGrams: 186,
      carbsGrams: 350,
      fatGrams: 80,
      isPremium: true,
    },
  })
  await prisma.meal.createMany({
    data: [
      {
        mealPlanId: free.id,
        slot: 'lunch',
        name: 'Test Bowl',
        calories: 520,
        proteinGrams: 48,
        items: 'Chicken, rice, greens',
      },
      {
        mealPlanId: premium.id,
        slot: 'dinner',
        name: 'Test Plate',
        calories: 780,
        proteinGrams: 52,
        items: 'Beef, noodles, greens',
      },
    ],
  })
})

afterAll(async () => {
  await purgeFixtures()
})

async function sessionCookieFor(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } })
  return createSession(user.id)
}

describe('GET /api/diet-plans', () => {
  it('returns only the free plan to a free user', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({ method: 'GET', cookies: { [SESSION_COOKIE]: token } })
    await dietPlansHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const body = res._getJSONData() as { ok: boolean; data: Array<{ slug: string; locked: boolean }> }
    expect(body.ok).toBe(true)
    expect(body.data.map((p) => p.slug)).toEqual([FREE_SLUG])
    expect(body.data[0]?.locked).toBe(false)
    // A free member must not even see the premium plan's meals.
    expect(JSON.stringify(body)).not.toContain('Test Plate')
  })

  it('returns all plans to a premium user', async () => {
    const token = await sessionCookieFor(PREMIUM_EMAIL)
    const { req, res } = createMocks({ method: 'GET', cookies: { [SESSION_COOKIE]: token } })
    await dietPlansHandler(req, res)

    const body = res._getJSONData() as { data: Array<{ slug: string; locked: boolean }> }
    expect(body.data.map((p) => p.slug).sort()).toEqual([FREE_SLUG, PREMIUM_SLUG].sort())
    expect(body.data.every((p) => p.locked === false)).toBe(true)
  })

  it('marks premium plans as locked rather than hiding them from anonymous callers', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await dietPlansHandler(req, res)

    const body = res._getJSONData() as { data: Array<{ slug: string; locked: boolean }> }
    const bySlug = new Map(body.data.map((p) => [p.slug, p.locked]))
    expect(bySlug.get(FREE_SLUG)).toBe(false)
    expect(bySlug.get(PREMIUM_SLUG)).toBe(true)
  })

  it('includes the meals for each plan', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await dietPlansHandler(req, res)

    const body = res._getJSONData() as { data: Array<{ slug: string; meals: Array<{ name: string }> }> }
    const free = body.data.find((p) => p.slug === FREE_SLUG)
    expect(free?.meals.map((m) => m.name)).toEqual(['Test Bowl'])
  })

  it('filters by goal', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { goal: 'cut' } })
    await dietPlansHandler(req, res)

    const body = res._getJSONData() as { data: Array<{ slug: string }> }
    expect(body.data.map((p) => p.slug)).toEqual([FREE_SLUG])
  })

  it('rejects a non-GET method with 405', async () => {
    const { req, res } = createMocks({ method: 'POST' })
    await dietPlansHandler(req, res)
    expect(res._getStatusCode()).toBe(405)
  })
})
