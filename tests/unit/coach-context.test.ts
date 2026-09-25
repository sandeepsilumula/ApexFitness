import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { buildCoachContext } from '@/lib/services/coach/context'

const DAY_MS = 24 * 60 * 60 * 1000

const TEST_EMAILS = [
  'coach-context-active@test.local',
  'coach-context-weekly@test.local',
  'coach-context-empty@test.local',
  'coach-context-one-metric@test.local',
  'coach-context-stable@test.local',
]

// Test rows are cleaned up before creation as well as after, so a run that is
// interrupted still leaves the next run able to create its fixtures.
async function purgeFixtures(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true },
  })
  const ids = users.map((user) => user.id)
  if (ids.length === 0) return

  await prisma.exerciseSet.deleteMany({ where: { userId: { in: ids } } })
  await prisma.workoutLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.bodyMetric.deleteMany({ where: { userId: { in: ids } } })
  await prisma.session.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
}

async function createUser(email: string) {
  return prisma.user.create({
    data: { email, passwordHash: 'x', name: 'Test Athlete' },
  })
}

async function createWorkout(slug: string, title: string) {
  return prisma.workout.create({
    data: {
      slug,
      title,
      description: 'Test workout',
      category: 'strength',
      difficulty: 'beginner',
      durationMin: 30,
      equipment: 'None',
      embedUrl: `https://www.youtube-nocookie.com/embed/${slug}`,
      thumbnail: 'https://example.com/t.jpg',
    },
  })
}

describe('buildCoachContext', () => {
  const created: string[] = []

  beforeEach(async () => {
    created.length = 0
    await purgeFixtures()
  })

  afterAll(async () => {
    await purgeFixtures()
    // These workouts have no unique-to-user marker, so they are cleaned up by
    // the deterministic slugs the tests create.
    await prisma.workout.deleteMany({
      where: { slug: { in: ['ctx-upper', 'ctx-lower', 'ctx-weekly'] } },
    })
  })

  it('summarises workout history, set volume and weight trend', async () => {
    const user = await createUser('coach-context-active@test.local')
    created.push(user.id)

    const upper = await createWorkout('ctx-upper', 'Upper Body Push')
    const lower = await createWorkout('ctx-lower', 'Lower Body Strength')

    await prisma.workoutLog.createMany({
      data: [
        { userId: user.id, workoutId: upper.id, durationMin: 45, completedAt: new Date(Date.now() - 2 * DAY_MS) },
        { userId: user.id, workoutId: lower.id, durationMin: 50, completedAt: new Date(Date.now() - 1 * DAY_MS) },
      ],
    })

    await prisma.exerciseSet.createMany({
      data: [
        { userId: user.id, workoutId: upper.id, setNumber: 1, reps: 10, weightKg: 40 },
        { userId: user.id, workoutId: upper.id, setNumber: 2, reps: 8, weightKg: 42.5 },
        { userId: user.id, workoutId: lower.id, setNumber: 1, reps: 12, weightKg: 60 },
      ],
    })

    await prisma.bodyMetric.createMany({
      data: [
        { userId: user.id, weightKg: 82, recordedAt: new Date(Date.now() - 14 * DAY_MS) },
        { userId: user.id, weightKg: 78.5, recordedAt: new Date(Date.now() - 1 * DAY_MS) },
      ],
    })

    const ctx = await buildCoachContext(user.id)

    expect(ctx.userName).toBe('Test Athlete')
    expect(ctx.workoutCount).toBe(2)
    expect(ctx.totalSets).toBe(3)
    // 40*10 + 42.5*8 + 60*12
    expect(ctx.totalVolumeKg).toBeCloseTo(1460, 1)
    expect(ctx.weightTrend).toBe('down')
    expect(ctx.latestWeightKg).toBeCloseTo(78.5, 1)
    expect(ctx.recentWorkoutTitles).toContain('Upper Body Push')
  })

  it('counts only workouts from the last seven days as weekly', async () => {
    const user = await createUser('coach-context-weekly@test.local')
    created.push(user.id)
    const workout = await createWorkout('ctx-weekly', 'Recent Session')

    await prisma.workoutLog.createMany({
      data: [
        { userId: user.id, workoutId: workout.id, durationMin: 30, completedAt: new Date(Date.now() - 1 * DAY_MS) },
        { userId: user.id, workoutId: workout.id, durationMin: 30, completedAt: new Date(Date.now() - 2 * DAY_MS) },
        { userId: user.id, workoutId: workout.id, durationMin: 30, completedAt: new Date(Date.now() - 20 * DAY_MS) },
      ],
    })

    const ctx = await buildCoachContext(user.id)

    expect(ctx.workoutCount).toBe(3)
    expect(ctx.weeklyWorkoutCount).toBe(2)
  })

  it('returns zeros and an unknown trend for a brand-new account', async () => {
    const user = await createUser('coach-context-empty@test.local')
    created.push(user.id)

    const ctx = await buildCoachContext(user.id)

    expect(ctx.workoutCount).toBe(0)
    expect(ctx.weeklyWorkoutCount).toBe(0)
    expect(ctx.totalSets).toBe(0)
    expect(ctx.totalVolumeKg).toBe(0)
    expect(ctx.weightTrend).toBe('unknown')
    expect(ctx.latestWeightKg).toBeNull()
    expect(ctx.recentWorkoutTitles).toEqual([])
  })

  it('does not report a trend from a single body metric', async () => {
    const user = await createUser('coach-context-one-metric@test.local')
    created.push(user.id)

    await prisma.bodyMetric.create({
      data: { userId: user.id, weightKg: 70, recordedAt: new Date(Date.now() - 3 * DAY_MS) },
    })

    const ctx = await buildCoachContext(user.id)

    expect(ctx.weightTrend).toBe('unknown')
    expect(ctx.latestWeightKg).toBeCloseTo(70, 1)
  })

  it('reports a stable trend when weight is unchanged across metrics', async () => {
    const user = await createUser('coach-context-stable@test.local')
    created.push(user.id)

    await prisma.bodyMetric.createMany({
      data: [
        { userId: user.id, weightKg: 75, recordedAt: new Date(Date.now() - 10 * DAY_MS) },
        { userId: user.id, weightKg: 75, recordedAt: new Date(Date.now() - DAY_MS) },
      ],
    })

    const ctx = await buildCoachContext(user.id)

    expect(ctx.weightTrend).toBe('stable')
  })

  it('throws rather than inventing a summary for a user that does not exist', async () => {
    await expect(buildCoachContext('no-such-user-id')).rejects.toThrow(
      'Cannot build coach context: user not found',
    )
  })
})
