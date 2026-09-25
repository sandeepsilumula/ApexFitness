import { prisma } from '@/lib/db'

export type WeightPoint = { date: string; weightKg: number }
export type VolumePoint = { week: string; totalKg: number; setCount: number }

export type ProgressData = {
  weightSeries: WeightPoint[]
  workoutCount: number
  weeklyWorkoutCount: number
  /** Present only for premium users — the series is never computed otherwise. */
  volumeSeries?: VolumePoint[]
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Truncating to a Monday UTC boundary gives one stable key per week. `toISOString`
 * always formats in UTC, so the key never shifts with the server's local zone.
 */
function weekStart(date: Date): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = start.getUTCDay()
  const daysSinceMonday = (day + 6) % 7
  start.setUTCDate(start.getUTCDate() - daysSinceMonday)
  return start
}

function weekKey(date: Date): string {
  return weekStart(date).toISOString().slice(0, 10)
}

type SetRow = { loggedAt: Date; reps: number; weightKg: number | null }

/** Sets logged without a load contribute no volume, so they are skipped entirely. */
function totalVolume(sets: SetRow[]): number {
  return sets.reduce((total, set) => total + (set.weightKg ?? 0) * set.reps, 0)
}

function groupByWeek<T>(rows: T[], dateOf: (row: T) => Date): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const key = weekKey(dateOf(row))
    const existing = groups.get(key)
    if (existing) existing.push(row)
    else groups.set(key, [row])
  }
  // Insertion order follows the query order; sorting makes that explicit and
  // immune to a provider that changes its default ordering.
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

export async function getProgressSeries(
  userId: string,
  isPremiumUser: boolean,
): Promise<ProgressData> {
  const weekAgo = new Date(Date.now() - WEEK_MS)

  const [workoutCount, weeklyWorkoutCount, metrics] = await Promise.all([
    prisma.workoutLog.count({ where: { userId } }),
    prisma.workoutLog.count({ where: { userId, completedAt: { gte: weekAgo } } }),
    prisma.bodyMetric.findMany({
      where: { userId, weightKg: { not: null } },
      orderBy: { recordedAt: 'asc' },
      select: { weightKg: true, recordedAt: true },
    }),
  ])

  const weightSeries: WeightPoint[] = metrics
    .filter((metric): metric is typeof metric & { weightKg: number } => metric.weightKg !== null)
    .map((metric) => ({
      date: metric.recordedAt.toISOString().slice(0, 10),
      weightKg: metric.weightKg,
    }))

  const base: ProgressData = { weightSeries, workoutCount, weeklyWorkoutCount }

  // The premium series are not fetched at all for a free caller — computing them
  // and dropping them afterwards would leak them through response timing.
  if (!isPremiumUser) return base

  const sets = await prisma.exerciseSet.findMany({
    where: { userId },
    orderBy: { loggedAt: 'asc' },
    select: { loggedAt: true, reps: true, weightKg: true },
  })

  const setsByWeek = groupByWeek(sets, (set) => set.loggedAt)

  const volumeSeries: VolumePoint[] = [...setsByWeek.entries()].map(([week, weekSets]) => ({
    week,
    totalKg: Math.round(totalVolume(weekSets) * 10) / 10,
    setCount: weekSets.length,
  }))

  return { ...base, volumeSeries }
}
