import { prisma } from '@/lib/db'

export type PreviewSet = {
  name: string
  sets: number
  reps: number
}

/**
 * Only what the landing preview renders. Deliberately narrow: it must never
 * carry a premium workout's `embedUrl` or full set list, because the landing
 * page is public and the entitlement check lives in the API.
 */
export type ShowcaseWorkout = {
  title: string
  embedUrl: string
  category: string
  difficulty: string
  durationMin: number
  equipment: string
  sets: PreviewSet[]
}

/** Set lists are user-visible data, so never trust the stored JSON's shape. */
export function parsePreviewSets(setsJson: string | null): PreviewSet[] {
  if (!setsJson) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(setsJson)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter(
      (entry): entry is PreviewSet =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as PreviewSet).name === 'string' &&
        typeof (entry as PreviewSet).sets === 'number' &&
        typeof (entry as PreviewSet).reps === 'number',
    )
    .slice(0, 3)
}

/**
 * Picks the free session that showcases the library on the landing page.
 * A premium workout is never used — its embed would play to anonymous
 * visitors and bypass the paywall. Returns null rather than throwing so an
 * empty or unseeded library still renders the rest of the page.
 */
export async function loadShowcaseWorkout(): Promise<ShowcaseWorkout | null> {
  const workout = await prisma.workout.findFirst({
    where: { isPremium: false, embedUrl: { not: '' } },
    orderBy: [{ category: 'asc' }, { durationMin: 'asc' }],
    select: {
      title: true,
      embedUrl: true,
      category: true,
      difficulty: true,
      durationMin: true,
      equipment: true,
      setsJson: true,
    },
  })
  if (!workout || !workout.embedUrl) return null

  return { ...workout, sets: parsePreviewSets(workout.setsJson) }
}
