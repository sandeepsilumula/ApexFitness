import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getProgressSeries } from '@/lib/services/progress'
import { prisma } from '@/lib/db'

const EMAIL = 'progress-unit@test.local'
const SLUG = 'test-progress-unit'
const OTHER_SLUG = 'test-progress-other'

const dummyPasswordHash = '$2b$12$abcdefghijklmnopqrstuv'

let userId = ''
let workoutId = ''
let otherWorkoutId = ''

const DAY = 24 * 60 * 60 * 1000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY)

async function purgeFixtures(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: EMAIL } })
  await prisma.workout.deleteMany({ where: { slug: { in: [SLUG, OTHER_SLUG] } } })
}

beforeEach(async () => {
  await purgeFixtures()

  const user = await prisma.user.create({
    data: { email: EMAIL, passwordHash: dummyPasswordHash, name: 'Progress Pat' },
  })
  userId = user.id

  const workout = await prisma.workout.create({
    data: {
      slug: SLUG,
      title: 'Test Progress Session',
      description: 'Fixture for the progress service tests.',
      category: 'Strength',
      difficulty: 'beginner',
      durationMin: 30,
      equipment: 'None',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    },
  })
  workoutId = workout.id

  const other = await prisma.workout.create({
    data: {
      slug: OTHER_SLUG,
      title: 'Other Session',
      description: 'Second fixture so a workout id is not the only one.',
      category: 'HIIT',
      difficulty: 'advanced',
      durationMin: 20,
      equipment: 'None',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    },
  })
  otherWorkoutId = other.id

  // Two workouts in the current week, one well outside it.
  await prisma.workoutLog.createMany({
    data: [
      { userId, workoutId, completedAt: daysAgo(1), durationMin: 30 },
      { userId, workoutId: otherWorkoutId, completedAt: daysAgo(3), durationMin: 20 },
      { userId, workoutId, completedAt: daysAgo(20), durationMin: 25 },
    ],
  })

  // Volume is reps x load. The current week carries 40x10 + 42.5x8 = 740 kg;
  // the older week carries 60x12 = 720 kg.
  await prisma.exerciseSet.createMany({
    data: [
      { userId, workoutId, setNumber: 1, reps: 10, weightKg: 40, loggedAt: daysAgo(1) },
      { userId, workoutId, setNumber: 2, reps: 8, weightKg: 42.5, loggedAt: daysAgo(3) },
      { userId, workoutId, setNumber: 1, reps: 12, weightKg: 60, loggedAt: daysAgo(20) },
    ],
  })

  // Deliberately inserted newest-first so the service has to sort them.
  await prisma.bodyMetric.createMany({
    data: [
      { userId, weightKg: 80.1, recordedAt: daysAgo(14) },
      { userId, weightKg: 79.4, recordedAt: daysAgo(7) },
      { userId, weightKg: 78.6, recordedAt: daysAgo(1) },
    ],
  })
})

afterAll(async () => {
  await purgeFixtures()
})

describe('getProgressSeries', () => {
  it('counts every logged workout and the last seven days separately', async () => {
    const data = await getProgressSeries(userId, false)
    expect(data.workoutCount).toBe(3)
    expect(data.weeklyWorkoutCount).toBe(2)
  })

  it('returns the weight series oldest-first', async () => {
    const data = await getProgressSeries(userId, false)
    expect(data.weightSeries.map((p) => p.weightKg)).toEqual([80.1, 79.4, 78.6])

    const first = new Date(data.weightSeries[0]!.date).getTime()
    const last = new Date(data.weightSeries[data.weightSeries.length - 1]!.date).getTime()
    expect(first).toBeLessThan(last)
  })

  it('omits the premium series for a free caller', async () => {
    const data = await getProgressSeries(userId, false)
    expect(data.weightSeries.length).toBeGreaterThan(0)
    expect(data.volumeSeries).toBeUndefined()
  })

  it('groups premium volume by ISO week for a premium caller', async () => {
    const data = await getProgressSeries(userId, true)
    expect(data.volumeSeries).toBeDefined()

    const weeks = data.volumeSeries!
    expect(weeks).toHaveLength(2)
    expect(weeks[0]!.totalKg).toBe(720)
    expect(weeks[0]!.setCount).toBe(1)
    expect(weeks[1]!.totalKg).toBe(740)
    expect(weeks[1]!.setCount).toBe(2)

    // Weeks are chronological so a chart reads left to right.
    expect(new Date(weeks[0]!.week).getTime()).toBeLessThan(
      new Date(weeks[1]!.week).getTime(),
    )
  })

  it('returns empty series for a user with no data', async () => {
    const empty = await prisma.user.create({
      data: { email: 'progress-empty@test.local', passwordHash: dummyPasswordHash, name: 'Empty Ed' },
    })
    try {
      const data = await getProgressSeries(empty.id, true)
      expect(data.workoutCount).toBe(0)
      expect(data.weightSeries).toEqual([])
      expect(data.volumeSeries).toEqual([])
    } finally {
      await prisma.user.delete({ where: { id: empty.id } })
    }
  })

  it('ignores body metrics with no weight recorded', async () => {
    await prisma.bodyMetric.create({
      data: { userId, weightKg: null, bodyFatPct: 18, recordedAt: daysAgo(2) },
    })
    const data = await getProgressSeries(userId, false)
    expect(data.weightSeries).toHaveLength(3)
  })

  it('counts a bodyweight-only set in the week total without adding volume', async () => {
    // A set logged with no load is still a set, but it cannot contribute kg.
    await prisma.exerciseSet.create({
      data: { userId, workoutId, setNumber: 9, reps: 20, weightKg: null, loggedAt: daysAgo(2) },
    })

    const data = await getProgressSeries(userId, true)
    const currentWeek = data.volumeSeries!.at(-1)!

    expect(currentWeek.setCount).toBe(3)
    expect(currentWeek.totalKg).toBe(740)
  })
})
