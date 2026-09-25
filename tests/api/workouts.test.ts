import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createMocks } from 'node-mocks-http'
import listHandler from '@/pages/api/workouts/index'
import detailHandler from '@/pages/api/workouts/[id]'
import logHandler from '@/pages/api/workouts/[id]/log'
import setHandler from '@/pages/api/workouts/[id]/sets'
import { prisma } from '@/lib/db'
import { createSession, SESSION_COOKIE } from '@/lib/auth'

const FREE_EMAIL = 'workout-free@test.local'
const PREMIUM_EMAIL = 'workout-premium@test.local'
const INTRUDER_EMAIL = 'workout-intruder@test.local'
const TEST_EMAILS = [FREE_EMAIL, PREMIUM_EMAIL, INTRUDER_EMAIL]

const FREE_SLUG = 'test-free-session'
const PREMIUM_SLUG = 'test-premium-session'

const dummyPasswordHash = '$2b$12$abcdefghijklmnopqrstuv'

let freeUserId = ''
let premiumUserId = ''
let intruderUserId = ''

/** Purged in both beforeEach and afterAll so an interrupted run cannot poison the next. */
async function purgeFixtures(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } })
  await prisma.workout.deleteMany({ where: { slug: { in: [FREE_SLUG, PREMIUM_SLUG] } } })
}

async function seedFixtures(): Promise<void> {
  const [free, premium, intruder] = await Promise.all([
    prisma.user.create({
      data: { email: FREE_EMAIL, passwordHash: dummyPasswordHash, name: 'Free Sam' },
    }),
    prisma.user.create({
      data: {
        email: PREMIUM_EMAIL,
        passwordHash: dummyPasswordHash,
        name: 'Premium Pat',
        subscriptionTier: 'premium',
      },
    }),
    prisma.user.create({
      data: { email: INTRUDER_EMAIL, passwordHash: dummyPasswordHash, name: 'Intruder Ida' },
    }),
  ])
  freeUserId = free.id
  premiumUserId = premium.id
  intruderUserId = intruder.id

  await prisma.workout.createMany({
    data: [
      {
        slug: FREE_SLUG,
        title: 'Test Free Session',
        description: 'A free session used only by the API tests.',
        category: 'Strength',
        difficulty: 'beginner',
        durationMin: 20,
        equipment: 'None',
        embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        isPremium: false,
      },
      {
        slug: PREMIUM_SLUG,
        title: 'Test Premium Session',
        description: 'A premium session used only by the API tests.',
        category: 'HIIT',
        difficulty: 'advanced',
        durationMin: 30,
        equipment: 'Dumbbells',
        embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        isPremium: true,
      },
    ],
  })
}

beforeEach(async () => {
  await purgeFixtures()
  await seedFixtures()
})
afterAll(async () => {
  await purgeFixtures()
})

async function sessionCookieFor(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } })
  return createSession(user.id)
}

function routeQuery(id: string) {
  return { id }
}

describe('GET /api/workouts', () => {
  it('returns the whole library to an anonymous caller with premium marked locked', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await listHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const body = res._getJSONData() as { ok: boolean; data: Array<{ slug: string; locked: boolean }> }
    expect(body.ok).toBe(true)

    const free = body.data.find((w) => w.slug === FREE_SLUG)
    const premium = body.data.find((w) => w.slug === PREMIUM_SLUG)
    expect(free?.locked).toBe(false)
    expect(premium?.locked).toBe(true)
  })

  it('marks a premium workout unlocked for a premium subscriber', async () => {
    const token = await sessionCookieFor(PREMIUM_EMAIL)
    const { req, res } = createMocks({ method: 'GET', cookies: { [SESSION_COOKIE]: token } })
    await listHandler(req, res)

    const body = res._getJSONData() as { data: Array<{ slug: string; locked: boolean }> }
    expect(body.data.find((w) => w.slug === PREMIUM_SLUG)?.locked).toBe(false)
  })

  it('reports a zero log count for an anonymous caller', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await listHandler(req, res)

    const body = res._getJSONData() as { data: Array<{ slug: string; logCount: number }> }
    expect(body.data.every((w) => w.logCount === 0)).toBe(true)
  })

  it('counts only the signed-in user logs toward logCount', async () => {
    const freeWorkout = await prisma.workout.findUniqueOrThrow({ where: { slug: FREE_SLUG } })
    const premiumWorkout = await prisma.workout.findUniqueOrThrow({ where: { slug: PREMIUM_SLUG } })

    await prisma.workoutLog.create({
      data: { userId: freeUserId, workoutId: freeWorkout.id, durationMin: 20 },
    })
    await prisma.workoutLog.create({
      data: { userId: freeUserId, workoutId: freeWorkout.id, durationMin: 20 },
    })
    // Same workout, different user. Must not inflate freeUserId's count.
    await prisma.workoutLog.create({
      data: { userId: intruderUserId, workoutId: freeWorkout.id, durationMin: 20 },
    })
    await prisma.workoutLog.create({
      data: { userId: freeUserId, workoutId: premiumWorkout.id, durationMin: 30 },
    })

    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({ method: 'GET', cookies: { [SESSION_COOKIE]: token } })
    await listHandler(req, res)

    const body = res._getJSONData() as { data: Array<{ slug: string; logCount: number }> }
    expect(body.data.find((w) => w.slug === FREE_SLUG)?.logCount).toBe(2)
    expect(body.data.find((w) => w.slug === PREMIUM_SLUG)?.logCount).toBe(1)
  })

  it('filters by category', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { category: 'HIIT' } })
    await listHandler(req, res)

    const body = res._getJSONData() as { data: Array<{ slug: string }> }
    expect(body.data.every((w) => w.slug === PREMIUM_SLUG)).toBe(true)
  })

  it('filters by difficulty', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { difficulty: 'beginner' } })
    await listHandler(req, res)

    const body = res._getJSONData() as { data: Array<{ slug: string }> }
    expect(body.data.every((w) => w.slug === FREE_SLUG)).toBe(true)
  })

  it('filters by a free-text query', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { q: 'Premium Session' } })
    await listHandler(req, res)

    const body = res._getJSONData() as { data: Array<{ slug: string }> }
    expect(body.data.map((w) => w.slug)).toContain(PREMIUM_SLUG)
    expect(body.data.map((w) => w.slug)).not.toContain(FREE_SLUG)
  })

  it('rejects a non-GET method with 405', async () => {
    const { req, res } = createMocks({ method: 'POST' })
    await listHandler(req, res)
    expect(res._getStatusCode()).toBe(405)
  })
})

describe('GET /api/workouts/[id]', () => {
  it('resolves a workout by slug', async () => {
    const { req, res } = createMocks({ method: 'GET', query: routeQuery(FREE_SLUG) })
    await detailHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const body = res._getJSONData() as { data: { slug: string } }
    expect(body.data.slug).toBe(FREE_SLUG)
  })

  it('resolves a workout by id', async () => {
    const workout = await prisma.workout.findUniqueOrThrow({ where: { slug: FREE_SLUG } })
    const { req, res } = createMocks({ method: 'GET', query: routeQuery(workout.id) })
    await detailHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
  })

  it('returns 404 for an unknown workout', async () => {
    const { req, res } = createMocks({ method: 'GET', query: routeQuery('does-not-exist') })
    await detailHandler(req, res)

    expect(res._getStatusCode()).toBe(404)
    const body = res._getJSONData() as { ok: boolean; error: { code: string } }
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 403 for a premium workout when the caller is not entitled', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({
      method: 'GET',
      query: routeQuery(PREMIUM_SLUG),
      cookies: { [SESSION_COOKIE]: token },
    })
    await detailHandler(req, res)

    expect(res._getStatusCode()).toBe(403)
    const body = res._getJSONData() as { error: { code: string } }
    expect(body.error.code).toBe('PREMIUM_REQUIRED')
  })

  it('returns 403 for a premium workout requested anonymously', async () => {
    const { req, res } = createMocks({ method: 'GET', query: routeQuery(PREMIUM_SLUG) })
    await detailHandler(req, res)
    expect(res._getStatusCode()).toBe(403)
  })

  it('returns the premium workout to a subscriber', async () => {
    const token = await sessionCookieFor(PREMIUM_EMAIL)
    const { req, res } = createMocks({
      method: 'GET',
      query: routeQuery(PREMIUM_SLUG),
      cookies: { [SESSION_COOKIE]: token },
    })
    await detailHandler(req, res)
    expect(res._getStatusCode()).toBe(200)
  })
})

describe('POST /api/workouts/[id]/log', () => {
  it('rejects an anonymous workout log with 401', async () => {
    const { req, res } = createMocks({ method: 'POST', query: routeQuery(FREE_SLUG), body: { durationMin: 30 } })
    await logHandler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })

  it('records a workout log for the session user', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({
      method: 'POST',
      query: routeQuery(FREE_SLUG),
      cookies: { [SESSION_COOKIE]: token },
      body: { durationMin: 30, notes: 'Felt strong' },
    })
    await logHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const body = res._getJSONData() as { ok: boolean; data: { userId: string; durationMin: number } }
    expect(body.ok).toBe(true)
    expect(body.data.userId).toBe(freeUserId)
    expect(body.data.durationMin).toBe(30)

    const stored = await prisma.workoutLog.findFirst({ where: { userId: freeUserId } })
    expect(stored?.notes).toBe('Felt strong')
  })

  it('rejects a log for a workout that does not exist with 404', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({
      method: 'POST',
      query: routeQuery('does-not-exist'),
      cookies: { [SESSION_COOKIE]: token },
      body: { durationMin: 30 },
    })
    await logHandler(req, res)
    expect(res._getStatusCode()).toBe(404)
  })

  it('rejects a premium workout log from a free user with 403', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({
      method: 'POST',
      query: routeQuery(PREMIUM_SLUG),
      cookies: { [SESSION_COOKIE]: token },
      body: { durationMin: 30 },
    })
    await logHandler(req, res)
    expect(res._getStatusCode()).toBe(403)
  })

  it('rejects an invalid body with 400', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({
      method: 'POST',
      query: routeQuery(FREE_SLUG),
      cookies: { [SESSION_COOKIE]: token },
      body: { durationMin: -5 },
    })
    await logHandler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })

  it('rejects a non-POST method with 405', async () => {
    const { req, res } = createMocks({ method: 'GET', query: routeQuery(FREE_SLUG) })
    await logHandler(req, res)
    expect(res._getStatusCode()).toBe(405)
  })
})

describe('POST /api/workouts/[id]/sets', () => {
  it('records an exercise set', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({
      method: 'POST',
      query: routeQuery(FREE_SLUG),
      cookies: { [SESSION_COOKIE]: token },
      body: { setNumber: 1, reps: 10, weightKg: 40 },
    })
    await setHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const body = res._getJSONData() as { ok: boolean; data: { userId: string; reps: number; weightKg: number } }
    expect(body.ok).toBe(true)
    expect(body.data.reps).toBe(10)
    expect(body.data.weightKg).toBe(40)
    expect(body.data.userId).toBe(freeUserId)

    const stored = await prisma.exerciseSet.findFirst({ where: { userId: freeUserId } })
    expect(stored?.setNumber).toBe(1)
  })

  it('never accepts a userId from the request body', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({
      method: 'POST',
      query: routeQuery(FREE_SLUG),
      cookies: { [SESSION_COOKIE]: token },
      body: { setNumber: 1, reps: 12, weightKg: 30, userId: intruderUserId },
    })
    await setHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const stored = await prisma.exerciseSet.findFirst({ where: { workoutId: { not: '' } } })
    expect(stored?.userId).toBe(freeUserId)
    expect(stored?.userId).not.toBe(intruderUserId)
    expect(await prisma.exerciseSet.count({ where: { userId: intruderUserId } })).toBe(0)
  })

  it('rejects an anonymous set with 401', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: routeQuery(FREE_SLUG),
      body: { setNumber: 1, reps: 10 },
    })
    await setHandler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })

  it('rejects a set for a workout that does not exist with 404', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({
      method: 'POST',
      query: routeQuery('does-not-exist'),
      cookies: { [SESSION_COOKIE]: token },
      body: { setNumber: 1, reps: 10 },
    })
    await setHandler(req, res)
    expect(res._getStatusCode()).toBe(404)
  })

  it('rejects a set on a premium workout from a free user with 403', async () => {
    const token = await sessionCookieFor(FREE_EMAIL)
    const { req, res } = createMocks({
      method: 'POST',
      query: routeQuery(PREMIUM_SLUG),
      cookies: { [SESSION_COOKIE]: token },
      body: { setNumber: 1, reps: 10 },
    })
    await setHandler(req, res)
    expect(res._getStatusCode()).toBe(403)
  })
})
