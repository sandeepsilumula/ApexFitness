import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { apiFetch } from '@/lib/api-client'
import { LockIcon } from '@/components/ui/Icon'
import { ApiError } from '@/lib/http'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

type Workout = {
  id: string
  slug: string
  title: string
  description: string
  category: string
  difficulty: string
  durationMin: number
  equipment: string
  isPremium: boolean
  locked: boolean
  logCount: number
}

type Filters = {
  category?: string
  difficulty?: string
  q?: string
}

/** Sessions before a workout counts as a completed habit. */
const SESSION_GOAL = 10

export default function WorkoutsPage() {
  return (
    <AppShell>
      <WorkoutsContent />
    </AppShell>
  )
}

function WorkoutsContent() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filters: Filters = {
    category: typeof router.query.category === 'string' ? router.query.category : undefined,
    difficulty: typeof router.query.difficulty === 'string' ? router.query.difficulty : undefined,
    q: typeof router.query.q === 'string' ? router.query.q : undefined,
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (filters.category) params.set('category', filters.category)
    if (filters.difficulty) params.set('difficulty', filters.difficulty)
    if (filters.q) params.set('q', filters.q)

    apiFetch<Workout[]>(`/api/workouts?${params}`)
      .then((data) => {
        if (active) {
          setWorkouts(data)
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load workouts')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filters.category, filters.difficulty, filters.q])

  function handleFilter(key: string, value: string) {
    const query: Record<string, string | string[] | undefined> = { ...router.query }
    if (value) {
      query[key] = value
    } else {
      delete query[key]
    }
    router.push({ query })
  }

  const categories = [...new Set(workouts.map((w) => w.category))].sort()
  const difficulties = [...new Set(workouts.map((w) => w.difficulty))].sort()

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 font-display text-section text-white">Workout library</h2>

        <div className="mb-6 flex flex-wrap gap-3">
          <select
            aria-label="Filter by category"
            value={filters.category ?? ''}
            onChange={(e) => handleFilter('category', e.target.value)}
            className="focus-ring min-tap rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-caption text-slate-200 focus:border-emerald-500"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by difficulty"
            value={filters.difficulty ?? ''}
            onChange={(e) => handleFilter('difficulty', e.target.value)}
            className="focus-ring min-tap rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-caption text-slate-200 focus:border-emerald-500"
          >
            <option value="">All levels</option>
            {difficulties.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <input
            type="search"
            aria-label="Search workouts"
            placeholder="Search workouts…"
            defaultValue={filters.q ?? ''}
            onChange={(e) => handleFilter('q', e.target.value)}
            className="focus-ring min-tap rounded-md border border-navy-800 bg-navy-950 px-3 text-caption text-slate-100 placeholder:text-slate-400 focus:border-emerald-500"
          />
        </div>
      </section>

      {loading ? (
        <p className="text-slate-400">Loading workouts…</p>
      ) : error ? (
        <p role="alert" className="text-red-300">{error}</p>
      ) : workouts.length === 0 ? (
        <p className="text-slate-400">No workouts match those filters.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </div>
  )
}

function WorkoutCard({ workout }: { workout: Workout }) {
  if (workout.locked) {
    return (
      <Card className="relative">
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-navy-950/80">
          <div className="text-center">
            <LockIcon className="size-8 text-slate-400" label="Locked" />
            <p className="mt-2 text-caption text-slate-400">Premium</p>
          </div>
        </div>
        <CardTitle>{workout.title}</CardTitle>
        <CardBody>
          {workout.category} · {workout.difficulty} · {workout.durationMin} min
        </CardBody>
        <Link href="/checkout" className="focus-ring mt-2 block rounded-md">
          <Button size="sm" variant="ghost">Upgrade to unlock</Button>
        </Link>
      </Card>
    )
  }

  return (
    <Link href={`/workouts/${workout.slug}`} className="focus-ring block rounded-xl">
      <Card className="cursor-pointer transition-colors hover:border-gold-600/60">
        <CardTitle>{workout.title}</CardTitle>
        <CardBody>
          <p>{workout.description}</p>
          <p className="mt-2 text-caption text-slate-400">
            {workout.category} · {workout.difficulty} · {workout.durationMin} min · {workout.equipment}
          </p>
          <SessionProgress logCount={workout.logCount} />
        </CardBody>
      </Card>
    </Link>
  )
}

/** Progress bar is gold for the "do more" state, emerald once a workout is
    actually in the user's logged history. */
function SessionProgress({ logCount }: { logCount: number }) {
  if (logCount === 0) {
    return <p className="mt-4 text-caption text-slate-400">Not started yet</p>
  }

  const percent = Math.min(100, Math.round((logCount / SESSION_GOAL) * 100))
  const isComplete = logCount >= SESSION_GOAL

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-caption">
        <span className={isComplete ? 'text-emerald-500' : 'text-gold-400'}>
          {isComplete ? 'Goal reached' : `${percent}% of goal`}
        </span>
        <span className="text-slate-400">
          {logCount} {logCount === 1 ? 'session' : 'sessions'}
        </span>
      </div>
      <div aria-hidden="true" className="mt-2 h-1.5 w-full rounded-full bg-navy-950">
        <div
          className={`h-1.5 rounded-full ${isComplete ? 'w-full bg-emerald-600' : 'bg-gold-600'}`}
          style={isComplete ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
