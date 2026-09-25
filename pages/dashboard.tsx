import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/lib/http'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

type WeightPoint = { date: string; weightKg: number }
type VolumePoint = { week: string; totalKg: number; setCount: number }
type ProgressData = {
  weightSeries: WeightPoint[]
  workoutCount: number
  weeklyWorkoutCount: number
  volumeSeries?: VolumePoint[]
}

function formatWeek(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  )
}

function DashboardContent() {
  const router = useRouter()
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    apiFetch<ProgressData>('/api/progress')
      .then((data) => {
        if (active) setProgress(data)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load progress')
      })
    return () => {
      active = false
    }
  }, [])

  const latestWeight = progress?.weightSeries.length
    ? progress.weightSeries[progress.weightSeries.length - 1].weightKg
    : null

  return (
    <div className="space-y-8">
      <section className="grid gap-6 sm:grid-cols-3">
        <Card>
          <CardTitle>Workouts logged</CardTitle>
          <CardBody>{progress?.workoutCount ?? 0}</CardBody>
        </Card>
        <Card>
          <CardTitle>This week</CardTitle>
          <CardBody>{progress?.weeklyWorkoutCount ?? 0}</CardBody>
        </Card>
        <Card>
          <CardTitle>Latest weight</CardTitle>
          <CardBody>
            {latestWeight !== null ? `${latestWeight} kg` : 'Not recorded'}
          </CardBody>
        </Card>
      </section>

      {progress?.volumeSeries && progress.volumeSeries.length > 0 ? (
        <section>
          <h2 className="mb-4 font-display text-section text-white">Weekly volume</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {progress.volumeSeries.map((week) => (
              <Card key={week.week}>
                <CardTitle>{formatWeek(week.week)}</CardTitle>
                <CardBody>
                  {week.totalKg} kg across {week.setCount} sets
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {progress?.weightSeries && progress.weightSeries.length > 1 ? (
        <section>
          <h2 className="mb-4 font-display text-section text-white">Weight trend</h2>
          <div className="overflow-hidden rounded-xl border border-navy-800 bg-navy-900 p-4">
            <div className="flex items-end gap-1" style={{ height: 160 }}>
              {progress.weightSeries.map((point) => {
                const min = Math.min(...progress.weightSeries.map((p) => p.weightKg))
                const max = Math.max(...progress.weightSeries.map((p) => p.weightKg))
                const range = max - min || 1
                const height = ((point.weightKg - min) / range) * 120 + 20
                return (
                  <div
                    key={point.date}
                    className="flex-1 rounded-t bg-emerald-500/70"
                    style={{ height }}
                    title={`${point.date}: ${point.weightKg} kg`}
                  />
                )
              })}
            </div>
            <div className="mt-2 flex justify-between text-caption text-slate-400">
              {progress.weightSeries.slice(0, 5).map((point) => (
                <span key={point.date}>{point.date}</span>
              ))}
              {progress.weightSeries.length > 5 ? (
                <span>{progress.weightSeries[progress.weightSeries.length - 1].date}</span>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <div className="flex gap-4">
        <Link href="/workouts" className="focus-ring rounded-md">
          <Button>Browse workouts</Button>
        </Link>
        <Link href="/progress" className="focus-ring rounded-md">
          <Button variant="secondary">Full analytics</Button>
        </Link>
      </div>
    </div>
  )
}
