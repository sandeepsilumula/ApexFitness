import { prisma } from '@/lib/db'

export type WeightTrend = 'up' | 'down' | 'stable' | 'unknown'

export type CoachContext = {
  userName: string
  goal: string | null
  experienceLevel: string | null
  workoutCount: number
  weeklyWorkoutCount: number
  totalSets: number
  totalVolumeKg: number
  weightTrend: WeightTrend
  latestWeightKg: number | null
  recentWorkoutTitles: string[]
}

const RECENT_WORKOUT_LIMIT = 5

/** Weight differences under this are noise, not a trend. */
const STABLE_THRESHOLD_KG = 0.2

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * A single weight reading cannot establish a direction, and neither can a pair
 * with a missing value. Rather than guess, the coach is told the trend is
 * unknown so it does not narrate a change that was never measured.
 */
function deriveWeightTrend(weights: number[]): WeightTrend {
  if (weights.length < 2) return 'unknown'

  const earliest = weights[0]
  const latest = weights[weights.length - 1]
  if (earliest === undefined || latest === undefined) return 'unknown'

  const delta = latest - earliest
  if (Math.abs(delta) < STABLE_THRESHOLD_KG) return 'stable'
  return delta > 0 ? 'up' : 'down'
}

export async function buildCoachContext(userId: string): Promise<CoachContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, goal: true, experienceLevel: true },
  })

  if (!user) {
    throw new Error('Cannot build coach context: user not found')
  }

  const weekAgo = new Date(Date.now() - WEEK_MS)

  const [workoutCount, weeklyWorkoutCount, totalSets, metrics, recentLogs, setsWithLoad] =
    await Promise.all([
      prisma.workoutLog.count({ where: { userId } }),
      prisma.workoutLog.count({ where: { userId, completedAt: { gte: weekAgo } } }),
      prisma.exerciseSet.count({ where: { userId } }),
      prisma.bodyMetric.findMany({
        where: { userId, weightKg: { not: null } },
        orderBy: { recordedAt: 'asc' },
        select: { weightKg: true },
      }),
      prisma.workoutLog.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: RECENT_WORKOUT_LIMIT,
        select: { workout: { select: { title: true } } },
      }),
      prisma.exerciseSet.findMany({
        where: { userId },
        select: { reps: true, weightKg: true },
      }),
    ])

  const weights = metrics
    .map((metric) => metric.weightKg)
    .filter((weight): weight is number => weight !== null)

  // Sets without a recorded load cannot contribute volume; weight defaults to
  // bodyweight, which is not a number we can honestly multiply out.
  const totalVolumeKg = setsWithLoad.reduce(
    (total, set) => total + (set.weightKg === null ? 0 : set.weightKg * set.reps),
    0,
  )

  return {
    userName: user.name,
    goal: user.goal,
    experienceLevel: user.experienceLevel,
    workoutCount,
    weeklyWorkoutCount,
    totalSets,
    totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
    weightTrend: deriveWeightTrend(weights),
    latestWeightKg: weights.length > 0 ? (weights[weights.length - 1] ?? null) : null,
    recentWorkoutTitles: recentLogs.map((log) => log.workout.title),
  }
}
