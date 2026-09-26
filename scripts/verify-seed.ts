import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db' }),
})

async function main(): Promise<void> {
  let failures = 0

  const plans = await prisma.mealPlan.findMany()
  for (const plan of plans) {
    const meals = await prisma.meal.findMany({ where: { mealPlanId: plan.id } })
    const derived = plan.proteinGrams * 4 + plan.carbsGrams * 4 + plan.fatGrams * 9
    const drift = (Math.abs(derived - plan.caloriesTarget) / plan.caloriesTarget) * 100
    const mealCalories = meals.reduce((sum, meal) => sum + meal.calories, 0)
    const mealProtein = meals.reduce((sum, meal) => sum + meal.proteinGrams, 0)
    const withinTolerance = drift <= 10
    if (!withinTolerance) failures += 1

    process.stdout.write(
      `${plan.slug} target=${plan.caloriesTarget} derived=${derived} drift=${drift.toFixed(1)}% ` +
        `meals=${meals.length} mealCalSum=${mealCalories} proteinSum=${mealProtein}/${plan.proteinGrams} ` +
        `${withinTolerance ? 'OK' : 'FAIL'}\n`,
    )
  }

  const workouts = await prisma.workout.findMany()
  const byCategory = workouts.reduce<Record<string, number>>((acc, w) => {
    acc[w.category] = (acc[w.category] ?? 0) + 1
    return acc
  }, {})
  const byDifficulty = workouts.reduce<Record<string, number>>((acc, w) => {
    acc[w.difficulty] = (acc[w.difficulty] ?? 0) + 1
    return acc
  }, {})

  process.stdout.write(`categories=${JSON.stringify(byCategory)}\n`)
  process.stdout.write(`difficulties=${JSON.stringify(byDifficulty)}\n`)
  process.stdout.write(`withSetsJson=${workouts.filter((w) => w.setsJson).length}\n`)
  process.stdout.write(`premium=${workouts.filter((w) => w.isPremium).map((w) => w.slug).join(',')}\n`)
  process.stdout.write(failures === 0 ? 'MACRO CHECK PASS\n' : `MACRO CHECK FAIL (${failures})\n`)
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
