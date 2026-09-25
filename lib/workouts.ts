import { prisma } from '@/lib/db'

/**
 * The UI links to workouts by slug so URLs stay readable, but an id is accepted
 * too so the routes work with whatever the caller already holds.
 */
export async function findWorkout(idOrSlug: unknown) {
  if (typeof idOrSlug !== 'string' || idOrSlug.trim().length === 0) return null
  const value = idOrSlug.trim()

  return (
    (await prisma.workout.findUnique({ where: { slug: value } })) ??
    (await prisma.workout.findUnique({ where: { id: value } }))
  )
}
