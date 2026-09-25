import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { findWorkout } from '@/lib/workouts'

const SLUG = 'lookup-test-workout'

const workout = {
  slug: SLUG,
  title: 'Lookup Test Workout',
  description: 'Fixture workout for findWorkout lookup tests.',
  category: 'strength',
  difficulty: 'beginner',
  durationMin: 30,
  equipment: 'none',
  embedUrl: 'https://example.test/embed',
  thumbnail: 'https://example.test/thumb.jpg',
}

async function purgeFixtures(): Promise<void> {
  await prisma.workout.deleteMany({ where: { slug: SLUG } })
}

beforeEach(async () => {
  await purgeFixtures()
})

afterAll(async () => {
  await purgeFixtures()
})

describe('findWorkout', () => {
  it('resolves a workout by slug', async () => {
    const created = await prisma.workout.create({ data: workout })
    const found = await findWorkout(SLUG)

    expect(found?.id).toBe(created.id)
    expect(found?.title).toBe('Lookup Test Workout')
  })

  it('resolves a workout by id when no slug matches', async () => {
    const created = await prisma.workout.create({ data: workout })
    const found = await findWorkout(created.id)

    expect(found?.slug).toBe(SLUG)
  })

  it('trims surrounding whitespace before looking up', async () => {
    const created = await prisma.workout.create({ data: workout })
    const found = await findWorkout(`  ${SLUG}  `)

    expect(found?.id).toBe(created.id)
  })

  it('returns null for a non-string identifier', async () => {
    expect(await findWorkout(undefined)).toBeNull()
    expect(await findWorkout(42)).toBeNull()
    expect(await findWorkout({ slug: SLUG })).toBeNull()
  })

  it('returns null for a blank or whitespace-only identifier', async () => {
    expect(await findWorkout('')).toBeNull()
    expect(await findWorkout('   ')).toBeNull()
  })

  it('returns null when neither a slug nor an id matches', async () => {
    expect(await findWorkout('no-such-workout-anywhere')).toBeNull()
  })
})
