import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/lib/http'
import type { MealPlan, Meal } from '@prisma/client'
import { Card, CardBody, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

// The endpoint always returns the meals relation plus a `locked` flag: false for
// signed-in members (premium plans are filtered out server-side) and
// `isPremium` for anonymous visitors.
type MealPlanWithMeals = MealPlan & { meals: Meal[]; locked: boolean }

export default function DietPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<MealPlanWithMeals[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePlanId, setActivePlanId] = useState<string | null>(null)

  const goalFilter = (router.query.goal as string) ?? ''

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (goalFilter) {
      params.set('goal', goalFilter)
    }
    let cancelled = false
    apiFetch<MealPlanWithMeals[]>(`/api/diet-plans?${params.toString()}`)
      .then((data) => {
        if (cancelled) return
        setPlans(data)
        // Default to the first plan if the current selection is not in the result set
        setActivePlanId((current) =>
          data.length > 0 && !data.some((plan) => plan.id === current) ? data[0].id : current,
        )
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Failed to load diet plans')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [goalFilter])

  const handleGoalChange = (goal: string) => {
    void router.push({ query: { ...router.query, goal: goal === 'all' ? undefined : goal } })
  }

  const activePlan = plans.find((p) => p.id === activePlanId)

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-display text-page text-white">Diet Plans</h1>

        <div className="mb-6 flex gap-3">
          <Button
            variant={goalFilter === 'cut' ? 'primary' : 'secondary'}
            onClick={() => handleGoalChange('cut')}
          >
            Cut
          </Button>
          <Button
            variant={goalFilter === 'maintain' ? 'primary' : 'secondary'}
            onClick={() => handleGoalChange('maintain')}
          >
            Maintain
          </Button>
          <Button
            variant={goalFilter === 'bulk' ? 'primary' : 'secondary'}
            onClick={() => handleGoalChange('bulk')}
          >
            Bulk
          </Button>
          <Button
            variant={goalFilter === '' ? 'primary' : 'secondary'}
            onClick={() => handleGoalChange('all')}
          >
            All
          </Button>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading diet plans...</p>
        ) : error ? (
          <p className="text-red-400">Error: {error}</p>
        ) : plans.length === 0 ? (
          <p className="text-slate-400">No diet plans found for this goal.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={plan.id === activePlanId ? 'border-emerald-500' : ''}>
                <CardTitle>{plan.title}</CardTitle>
                <CardBody>{plan.description}</CardBody>
                {plan.isPremium && <p className="mt-2 text-caption text-gold-400">Premium Plan</p>}
                {plan.locked ? (
                  <Link href="/checkout" className="focus-ring mt-4 block rounded-md">
                    <Button className="w-full">Upgrade to Premium</Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => setActivePlanId(plan.id)}
                    className="mt-4 w-full"
                    variant={plan.id === activePlanId ? 'primary' : 'secondary'}
                  >
                    View Plan
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        {activePlan && !activePlan.locked && (
          <div className="mt-10">
            <h2 className="mb-4 font-display text-page text-white">{activePlan.title}</h2>
            <Card>
              <CardBody>
                <p><strong>Goal:</strong> {activePlan.goal}</p>
                <p><strong>Calories:</strong> {activePlan.caloriesTarget} kcal</p>
                <p><strong>Protein:</strong> {activePlan.proteinGrams}g</p>
                <p><strong>Carbs:</strong> {activePlan.carbsGrams}g</p>
                <p><strong>Fat:</strong> {activePlan.fatGrams}g</p>

                <h3 className="mt-6 mb-3 font-display text-section text-white">Meals</h3>
                {activePlan.meals.map((meal) => (
                  <div key={meal.id} className="mb-4 rounded-md border border-navy-800 bg-navy-950 p-4">
                    <p className="text-section font-medium text-emerald-300">{meal.name} ({meal.slot})</p>
                    <p className="text-caption text-slate-400">Calories: {meal.calories} kcal</p>
                    <p className="text-caption text-slate-400">Protein: {meal.proteinGrams}g</p>
                    <p className="text-caption text-slate-400">Items: {meal.items}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  )
}
