import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createMocks } from 'node-mocks-http'
import progressHandler from '@/pages/api/progress/index'
import metricsHandler from '@/pages/api/progress/metrics'
import { prisma } from '@/lib/db'
import { createSession, SESSION_COOKIE } from '@/lib/auth'

const FREE_EMAIL = 'progress-free@test.local'
const PREMIUM_EMAIL = 'progress-premium@test.local'
const SLUG = 'test-progress-api'
const OTHER_SLUG = 'test-progress-api-other'

const dummyPasswordHash = '$2b$12$abcdefghijklmnopqrstuv'
const DAY = 24 * 60 * 60 * 1000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY)

async function purgeFixtures(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: [FREE_EMAIL, PREMIUM_EMAIL] } } })
  await prisma.workout.deleteMany({ where: { slug: { in: [SLUG, OTHER_SLUG] } } })
}

let freeUserId = ''

beforeEach(async () => {
  await purgeFixtures()

  const free = await prisma.user.create({
    data: { email: FREE_EMAIL, passwordHash: dummyPasswordHash, name: 'Free Fay' },
  })
  freeUserId = free.id
  await prisma.user.create({
    data: {
      email: PREMIUM_EMAIL,
      passwordHash: dummyPasswordHash,
      name: 'Premium Pia',
      subscriptionTier: 'premium',
    },
  })

  const workout = await prisma.workout.create({
    data: {
      slug: SLUG,
      title: 'Progress API Session',
      description: 'Fixture for the progress API tests.',
      category: 'Strength',
      difficulty: 'beginner',
      durationMin: 30,
      equipment: 'None',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    },
  })
  await prisma.workout.create({
    data: {
      slug: OTHER_SLUG,
      title: 'Progress API Other',
      description: 'Second fixture so a workout id is not the only one.',
      category: 'HIIT',
      difficulty: 'advanced',
      durationMin: 20,
      equipment: 'None',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    },
  })

  await prisma.workoutLog.create({
    data: { userId: free.id, workoutId: workout.id, completedAt: daysAgo(2), durationMin: 30 },
  })
  await prisma.exerciseSet.create({
    data: { userId: free.id, workoutId: workout.id, setNumber: 1, reps: 10, weightKg: 40, loggedAt: daysAgo(2) },
  })
  await prisma.bodyMetric.createMany({
    data: [
      { userId: free.id, weightKg: 80.1, recordedAt: daysAgo(14) },
      { userId: free.id, weightKg: 78.6, recordedAt: daysAgo(1) },
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

describe('GET /api/progress', () => {
  it('rejects an anonymous caller with 401', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await progressHandler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })

  it('gives a free caller the weight series but not the premium series', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({ method: 'GET', cookies: { [SESSION_COOKIE]: token } })
    await progressHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const body = res._getJSONData() as {
      ok: boolean
      data: {
        weightSeries: unknown[]
        volumeSeries?: unknown[]
        macroSeries?: unknown[]
        workoutCount: number
      }
    }
    expect(body.ok).toBe(true)
    expect(body.data.weightSeries.length).toBeGreaterThan(0)
    expect(body.data.volumeSeries).toBeUndefined()
    expect(body.data.macroSeries).toBeUndefined()
    expect(body.data.workoutCount).toBe(1)
  })

  it('gives a premium caller the volume series', async () => {
    const token = await sessionCookieFor(PREMIUM_EMAIL)
    const { req, res } = createMocks({ method: 'GET', cookies: { [SESSION_COOKIE]: token } })
    await progressHandler(req, res)

    const body = res._getJSONData() as { data: { volumeSeries?: unknown[]; macroSeries?: unknown[] } }
    expect(body.data.volumeSeries).toBeDefined()
  })

  it('never returns another user’s data', async () => {
    const token = await sessionCookieFor(PREMIUM_EMAIL)
    const { req, res } = createMocks({ method: 'GET', cookies: { [SESSION_COOKIE]: token } })
    await progressHandler(req, res)

    // The premium user has no rows of their own, so nothing of the free user's
    // may leak into the response.
    const body = res._getJSONData() as { data: { workoutCount: number; weightSeries: unknown[] } }
    expect(body.data.workoutCount).toBe(0)
    expect(body.data.weightSeries).toEqual([])
  })

  it('rejects a non-GET method with 405', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({ method: 'POST', cookies: { [SESSION_COOKIE]: token } })
    await progressHandler(req, res)
    expect(res._getStatusCode()).toBe(405)
  })
})

describe('POST /api/progress/metrics', () => {
  it('rejects an anonymous metric with 401', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { weightKg: 78 } })
    await metricsHandler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })

  it('records a body metric for the session user', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({
      method: 'POST',
      cookies: { [SESSION_COOKIE]: token },
      body: { weightKg: 78.2, bodyFatPct: 17.5 },
    })
    await metricsHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const stored = await prisma.bodyMetric.findFirst({
      where: { userId: freeUserId },
      orderBy: { recordedAt: 'desc' },
    })
    expect(stored?.weightKg).toBe(78.2)
    expect(stored?.bodyFatPct).toBe(17.5)
  })

  it('rejects an invalid metric with 400', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({
      method: 'POST',
      cookies: { [SESSION_COOKIE]: token },
      body: { weightKg: -100 },
    })
    await metricsHandler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  it('never accepts a userId from the request body', async () => {
    const other = await prisma.user.create({
      data: { email: 'progress-metric-intruder@test.local', passwordHash: dummyPasswordHash, name: 'Ida' },
    })
    try {
      const token = await sessionCookieFor(FREE_EMAIL)
      const { req, res } = createMocks({
        method: 'POST',
        cookies: { [SESSION_COOKIE]: token },
        body: { weightKg: 75, userId: other.id },
      })
      await metricsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(await prisma.bodyMetric.count({ where: { userId: other.id } })).toBe(0)
    } finally {
      await prisma.user.delete({ where: { id: other.id } })
    }
  })

  it('rejects a non-POST method with 405', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await metricsHandler(req, res)
    expect(res._getStatusCode()).toBe(405)
  })
})
