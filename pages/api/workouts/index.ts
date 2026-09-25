import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isPremium } from '@/lib/services/tier'
import { ok, fail } from '@/lib/http'

interface ListFilters {
  category?: string
  difficulty?: string
  q?: string
}

function readFilters(query: NextApiRequest['query']): ListFilters {
  const one = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  return {
    category: one(query.category),
    difficulty: one(query.difficulty),
    q: one(query.q),
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use GET'))

  const { category, difficulty, q } = readFilters(req.query)
  const user = await getCurrentUser(req)

  const workouts = await prisma.workout.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(difficulty ? { difficulty } : {}),
    },
    orderBy: { title: 'asc' },
  })

  // SQLite has no case-insensitive `contains` in Prisma, so the free-text
  // filter is applied in memory over the small seeded library.
  const needle = q?.toLowerCase()
  const filtered = needle
    ? workouts.filter((workout) =>
        [workout.title, workout.description, workout.category, workout.equipment]
          .join(' ')
          .toLowerCase()
          .includes(needle),
      )
    : workouts

  // An anonymous or free caller still sees every workout — the library stays
  // browsable — but premium entries are flagged so the UI can show a lock.
  // The `locked` flag is a display hint, NOT the paywall: the authoritative
  // check is in /api/workouts/[id]. So the premium payload must be stripped
  // down to list-safe fields here, or the lock would be bypassable by simply
  // reading the list response and pulling `embedUrl` (the playable video) and
  // `setsJson` (the prescribed exercise data) straight out of the JSON.
  const canSeeAll = isPremium(user ?? { subscriptionTier: 'free' })

  // Session counts drive the card progress bar. Only ever counted for the
  // signed-in user, so this cannot leak anyone else's training history.
  const logCounts = new Map<string, number>()
  if (user) {
    const grouped = await prisma.workoutLog.groupBy({
      by: ['workoutId'],
      where: { userId: user.id },
      _count: { _all: true },
    })
    for (const row of grouped) logCounts.set(row.workoutId, row._count._all)
  }

  const payload = filtered.map((workout) => {
    const logCount = logCounts.get(workout.id) ?? 0
    const locked = workout.isPremium && !canSeeAll
    if (!locked) return { ...workout, locked: false, logCount }
    const { embedUrl: _embedUrl, setsJson: _setsJson, ...listing } = workout
    return { ...listing, locked: true, logCount }
  })

  return res.status(200).json(ok(payload))
}
