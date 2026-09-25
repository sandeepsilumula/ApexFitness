import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/lib/http'
import Link from 'next/link'

type ProgressData = {
  weightSeries: { date: string; weightKg: number }[]
  workoutCount: number
  weeklyWorkoutCount: number
  volumeSeries?: { week: string; totalKg: number; setCount: number }[]
}

export default function ProgressPage() {
  return (
    <AppShell>
      <ProgressContent />
    </AppShell>
  )
}

function ProgressContent() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    apiFetch<ProgressData>('/api/progress')
      .then((d) => { if (active) { setData(d); setLoading(false) } })
      .catch((e: unknown) => { if (active) { setError(e instanceof ApiError ? e.message : 'Failed to load progress'); setLoading(false) } })
    return () => { active = false }
  }, [])

  if (loading) return <p className="text-slate-400">Loading analytics…</p>
  if (error) return <p role="alert" className="text-red-300">{error}</p>
  if (!data) return <p className="text-slate-400">No progress data yet.</p>

  return (
    <div className="space-y-8">
      <section className="grid gap-6 sm:grid-cols-3">
        <Card><CardTitle>Workouts logged</CardTitle><CardBody>{data.workoutCount}</CardBody></Card>
        <Card><CardTitle>This week</CardTitle><CardBody>{data.weeklyWorkoutCount}</CardBody></Card>
        <Card><CardTitle>Latest weight</CardTitle><CardBody>{data.weightSeries.length ? `${data.weightSeries[data.weightSeries.length-1].weightKg} kg` : 'Not recorded'}</CardBody></Card>
      </section>

      {/*
        The API omits volumeSeries for free users and sends it (possibly empty)
        for premium ones, so the key's presence — not its length — is what tells
        us whether the feature is unlocked. Testing the length would upsell a
        paying user who simply has no sets logged yet.
      */}
      {data.volumeSeries === undefined ? (
        <section className="rounded-xl border border-navy-800 bg-navy-900 p-6">
          <h2 className="mb-2 font-display text-section text-white">Weekly volume — premium</h2>
          <p className="text-slate-400">Unlock detailed weekly training volume with premium.</p>
          <Link href="/checkout" className="focus-ring mt-3 inline-block rounded-md">
            <Button size="sm">Upgrade to unlock</Button>
          </Link>
        </section>
      ) : data.volumeSeries.length > 0 ? (
        <section>
          <h2 className="mb-4 font-display text-section text-white">Weekly volume</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.volumeSeries.map((w) => (
              <Card key={w.week}>
                <CardTitle>{w.week}</CardTitle>
                <CardBody>{w.totalKg} kg · {w.setCount} sets</CardBody>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <h2 className="mb-2 font-display text-section text-white">Weekly volume</h2>
          <p className="text-slate-400">
            No sets logged yet — weekly training volume appears once you log a workout.
          </p>
        </section>
      )}

      {data.weightSeries && data.weightSeries.length > 1 && (
        <section>
          <h2 className="mb-4 font-display text-section text-white">Weight trend</h2>
          <div className="overflow-hidden rounded-xl border border-navy-800 bg-navy-900 p-4">
            <div className="flex items-end gap-1" style={{ height: 160 }}>
              {data.weightSeries.map((p) => {
                const min = Math.min(...data.weightSeries.map(x => x.weightKg))
                const max = Math.max(...data.weightSeries.map(x => x.weightKg))
                const range = max - min || 1
                const h = ((p.weightKg - min) / range) * 120 + 20
                return <div key={p.date} className="flex-1 rounded-t bg-emerald-500/70" style={{ height: h }} title={`${p.date}: ${p.weightKg} kg`} />
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
