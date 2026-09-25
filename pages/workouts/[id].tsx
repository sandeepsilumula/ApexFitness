import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/lib/http'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
  embedUrl: string
  thumbnail: string
  setsJson: string | null
  isPremium: boolean
}

type Exercise = {
  name: string
  sets: number
  reps: number
}

type WorkoutLog = {
  id: string
  workoutId: string
  completedAt: string
  durationMin: number
  notes: string | null
}

type ExerciseSet = {
  id: string
  userId: string
  workoutId: string
  setNumber: number
  reps: number
  weightKg: number | null
  loggedAt: string
}

type FetchState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T }

export default function WorkoutDetailPage() {
  return (
    <AppShell>
      <WorkoutDetailContent />
    </AppShell>
  )
}

function WorkoutDetailContent() {
  const router = useRouter()
  const { id } = router.query as { id?: string }

  const [workoutState, setWorkoutState] = useState<FetchState<Workout>>({ status: 'loading' })
  const [logState, setLogState] = useState<FetchState<WorkoutLog>>({ status: 'loading' })
  const [setsState, setSetsState] = useState<FetchState<ExerciseSet[]>>({ status: 'loading' })
  const [isPremiumLocked, setIsPremiumLocked] = useState(false)

  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [setInputs, setSetInputs] = useState<Array<{ setNumber: number; reps: string; weight: string }>>([])
  const [logging, setLogging] = useState(false)
  const [setLoggingError, setSetLoggingError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setWorkoutState({ status: 'loading' })
    // Reset on every id change, otherwise a premium lock from a previous
    // workout would keep rendering while the next one is still loading.
    setIsPremiumLocked(false)
    apiFetch<Workout>(`/api/workouts/${id}`)
      .then((data) => setWorkoutState({ status: 'success', data }))
      .catch((err: unknown) => {
        const msg = err instanceof ApiError ? err.message : 'Failed to load workout'
        // Branch on the API's error CODE, not on the message text: matching
        // /premium/ in a human-readable string silently breaks the moment the
        // copy is reworded, and a paywall screen that stops rendering is a
        // paywall bypass.
        setIsPremiumLocked(err instanceof ApiError && err.code === 'PREMIUM_REQUIRED')
        setWorkoutState({ status: 'error', message: msg })
        setLogState({ status: 'error', message: msg })
        setSetsState({ status: 'error', message: msg })
      })
  }, [id])

  useEffect(() => {
    if (!id || workoutState.status === 'loading') {
      setSetsState({ status: 'loading' })
      return
    }
    setSetsState({ status: 'loading' })
    apiFetch<ExerciseSet[]>(`/api/workouts/${id}/sets`)
      .then((data) => setSetsState({ status: 'success', data }))
      .catch((err: unknown) => {
        const msg = err instanceof ApiError ? err.message : 'Failed to load sets'
        setSetsState({ status: 'error', message: msg })
      })
  }, [id, workoutState.status])

  const exercises =
    workoutState.status === 'success' && workoutState.data.setsJson
      ? JSON.parse(workoutState.data.setsJson) as Exercise[]
      : []

  function handlePresetSetCount(count: number) {
    setSetInputs(
      Array.from({ length: count }, (_, i) => ({
        setNumber: i + 1,
        reps: '',
        weight: '',
      })),
    )
  }

  async function handleLogWorkout() {
    if (!id) return
    setLogging(true)
    setLogState({ status: 'loading' })

    try {
      const log = await apiFetch<WorkoutLog>(`/api/workouts/${id}/log`, {
        method: 'POST',
        body: JSON.stringify({
          durationMin: Number(duration),
          notes: notes || undefined,
        }),
      })
      setLogState({ status: 'success', data: log })
      setDuration('')
      setNotes('')
    } catch (err: unknown) {
      setLogState({
        status: 'error',
        message: err instanceof ApiError ? err.message : 'Failed to log workout',
      })
    } finally {
      setLogging(false)
    }
  }

  async function handleLogSet(setNumber: number, reps: number, weight: number | undefined) {
    if (!id) return
    setSetLoggingError(null)
    try {
      await apiFetch<ExerciseSet>(`/api/workouts/${id}/sets`, {
        method: 'POST',
        body: JSON.stringify({ setNumber, reps, weightKg: weight }),
      })
      // Refresh the sets list
      const data = await apiFetch<ExerciseSet[]>(`/api/workouts/${id}/sets`)
      setSetsState({ status: 'success', data })
    } catch (err: unknown) {
      setSetLoggingError(err instanceof ApiError ? err.message : 'Failed to log set')
    }
  }

  if (workoutState.status === 'error' && isPremiumLocked) {
    return (
      <div className="space-y-8">
        <section>
          <h2 className="mb-4 font-display text-section text-white">Premium workout</h2>
          <p className="text-slate-300">This workout requires a premium subscription.</p>
          <Link href="/checkout" className="focus-ring inline-block rounded-md">
            <Button className="mt-4">Upgrade to premium</Button>
          </Link>
        </section>
      </div>
    )
  }

  if (workoutState.status === 'error') {
    return (
      <div className="space-y-8">
        <p role="alert" className="text-red-300">{workoutState.message}</p>
      </div>
    )
  }

  if (workoutState.status === 'loading') {
    return <p className="text-slate-400">Loading workout…</p>
  }

  const workout = workoutState.data

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 font-display text-page text-white">{workout.title}</h2>
        <p className="text-slate-400">
          {workout.category} · {workout.difficulty} · {workout.durationMin} min · {workout.equipment}
        </p>
        <p className="mt-2 text-slate-300">{workout.description}</p>
      </section>

      <section>
        <div className="aspect-video w-full max-w-3xl rounded-xl border border-navy-800 bg-navy-950">
          <iframe
            src={workout.embedUrl}
            title={workout.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full rounded-lg"
          />
        </div>
      </section>

      {exercises.length > 0 ? (
        <section>
          <h3 className="mb-3 font-display text-section text-white">Prescribed sets</h3>
          <div className="space-y-3">
            {exercises.map((exercise) => (
              <Card key={exercise.name}>
                <CardTitle>{exercise.name}</CardTitle>
                <CardBody>
                  {exercise.sets} sets × {exercise.reps} reps
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 font-display text-section text-white">Mark as complete</h3>
        <Card>
          <CardBody>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                await handleLogWorkout()
              }}
              className="flex flex-col gap-4"
            >
              <Input
                label="Duration (minutes)"
                type="number"
                min="1"
                max="600"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                disabled={logging || logState.status === 'success'}
              />
              <Input
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                disabled={logging || logState.status === 'success'}
              />
              <Button type="submit" disabled={logging || logState.status === 'success'} size="sm">
                {logging ? 'Saving…' : 'Mark complete'}
              </Button>
            </form>

            {logState.status === 'error' ? (
              <p role="alert" className="mt-3 text-caption text-red-300">{logState.message}</p>
            ) : null}
            {logState.status === 'success' ? (
              <p className="mt-3 text-caption text-emerald-400">Workout logged!</p>
            ) : null}
          </CardBody>
        </Card>
      </section>

      <section>
        <h3 className="mb-3 font-display text-section text-white">Log sets</h3>
        <Card>
          <CardBody>
            {exercises.length > 0 ? (
              <div className="mb-4 flex gap-2">
                {exercises.map((exercise, i) => (
                  <button
                    key={exercise.name}
                    type="button"
                    onClick={() => handlePresetSetCount(exercise.sets)}
                    className="focus-ring min-tap rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-caption text-slate-300 hover:bg-navy-800"
                  >
                    {exercise.name} ({exercise.sets} sets)
                  </button>
                ))}
              </div>
            ) : null}

            {setInputs.length === 0 ? (
              <p className="text-caption text-slate-400">
                Pick a preset above or set reps manually per set.
              </p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  for (const input of setInputs) {
                    const reps = Number(input.reps)
                    if (!reps || Number.isNaN(reps)) continue
                    const weight = input.weight ? Number(input.weight) : undefined
                    await handleLogSet(input.setNumber, reps, weight)
                  }
                }}
              >
                <div className="space-y-2">
                  {setInputs.map((s) => (
                    <div key={s.setNumber} className="flex items-end gap-2">
                      <span className="text-caption text-slate-400 w-12">Set {s.setNumber}</span>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        placeholder="Reps"
                        value={s.reps}
                        onChange={(e) =>
                          setSetInputs((prev) =>
                            prev.map((p) =>
                              p.setNumber === s.setNumber ? { ...p, reps: e.target.value } : p,
                            ),
                          )
                        }
                        className="focus-ring min-tap w-16 rounded-md border border-navy-800 bg-navy-950 px-2 text-caption text-slate-100"
                      />
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        placeholder="kg"
                        value={s.weight}
                        onChange={(e) =>
                          setSetInputs((prev) =>
                            prev.map((p) =>
                              p.setNumber === s.setNumber ? { ...p, weight: e.target.value } : p,
                            ),
                          )
                        }
                        className="focus-ring min-tap w-20 rounded-md border border-navy-800 bg-navy-950 px-2 text-caption text-slate-100"
                      />
                    </div>
                  ))}
                </div>
                <Button type="submit" size="sm" className="mt-3">
                  Save sets
                </Button>
              </form>
            )}

            {setsState.status === 'success' && setsState.data.length > 0 ? (
              <ul className="mt-4 space-y-1 text-caption">
                {setsState.data.map((set) => (
                  <li key={set.id} className="text-slate-400">
                    Set {set.setNumber}: {set.reps} reps{set.weightKg ? ` @ ${set.weightKg} kg` : ''}
                  </li>
                ))}
              </ul>
            ) : null}

            {setLoggingError ? (
              <p role="alert" className="mt-3 text-caption text-red-300">{setLoggingError}</p>
            ) : null}
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
