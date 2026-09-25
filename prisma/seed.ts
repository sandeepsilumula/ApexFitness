import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
})
const prisma = new PrismaClient({ adapter })

interface PrescribedSet {
  name: string
  sets: number
  reps: number
}

interface WorkoutSeed {
  slug: string
  title: string
  description: string
  category: 'strength' | 'cardio' | 'mobility' | 'yoga'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  durationMin: number
  equipment: string
  videoId: string
  isPremium: boolean
  sets?: PrescribedSet[]
}

const workouts: WorkoutSeed[] = [
  {
    slug: 'beginner-full-body-strength',
    title: 'Beginner Full-Body Strength',
    description:
      'A low-barrier introduction to compound lifting. Three rounds of push, pull and squat patterns using only dumbbells, built to teach movement quality before load.',
    category: 'strength',
    difficulty: 'beginner',
    durationMin: 15,
    equipment: 'None',
    videoId: 'U0bhE67HuDY',
    isPremium: false,
    sets: [
      { name: 'Goblet Squat', sets: 3, reps: 10 },
      { name: 'Push-Ups', sets: 3, reps: 8 },
      { name: 'Dumbbell Row', sets: 3, reps: 10 },
      { name: 'Glute Bridge', sets: 3, reps: 12 },
      { name: 'Dead Bug', sets: 3, reps: 10 },
    ],
  },
  {
    slug: 'abs-in-two-weeks',
    title: 'Two-Week Abs Challenge',
    description:
      'A guided two-week abdominal progression with a new challenge every session. Consistency and bracing technique carry more of the load than any single variation.',
    category: 'strength',
    difficulty: 'beginner',
    durationMin: 12,
    equipment: 'None',
    videoId: '2pLT-olgUJs',
    isPremium: false,
    sets: [
      { name: 'Hollow Hold', sets: 3, reps: 30 },
      { name: 'Bicycle Crunch', sets: 3, reps: 20 },
      { name: 'Plank', sets: 3, reps: 45 },
    ],
  },
  {
    slug: 'ten-minute-deep-core',
    title: 'Ten-Minute Deep Core',
    description:
      'Short, dense core session built around anti-rotation and lateral loading. Ideal when a full workout is not on the table but the spine still wants training.',
    category: 'strength',
    difficulty: 'intermediate',
    durationMin: 10,
    equipment: 'None',
    videoId: '-Q_lgxUMD6c',
    isPremium: false,
    sets: [
      { name: 'Pallof Press', sets: 3, reps: 12 },
      { name: 'Side Plank', sets: 3, reps: 30 },
      { name: 'Bird Dog', sets: 3, reps: 12 },
    ],
  },
  {
    slug: 'advanced-dumbbell-full-body',
    title: 'Advanced Dumbbell Full Body',
    description:
      'A no-repeat, high-density full-body session for lifters with three or more years of consistent training. Supersets, tempo work and minimal rest between blocks.',
    category: 'strength',
    difficulty: 'advanced',
    durationMin: 30,
    equipment: 'Dumbbells',
    videoId: 'oPVebDQ1Yjo',
    isPremium: true,
    sets: [
      { name: 'Bulgarian Split Squat', sets: 4, reps: 10 },
      { name: 'Weighted Pull-Up', sets: 4, reps: 6 },
      { name: 'Dumbbell Bench Press', sets: 4, reps: 8 },
      { name: 'Chest-Supported Row', sets: 4, reps: 10 },
      { name: 'Romanian Deadlift', sets: 3, reps: 10 },
    ],
  },
  {
    slug: 'thirty-minute-brisk-walk',
    title: 'Thirty-Minute Brisk Walk',
    description:
      'A follow-along indoor walk that needs no equipment and produces a genuine cardiovascular load. The lowest barrier entry point in the library.',
    category: 'cardio',
    difficulty: 'beginner',
    durationMin: 30,
    equipment: 'None',
    videoId: 'enYITYwvPAQ',
    isPremium: false,
  },
  {
    slug: 'fifteen-minute-hiit-blocks',
    title: 'Fifteen-Minute HIIT Blocks',
    description:
      'Tabata intervals — twenty seconds of work against ten of rest — repeated across eight blocks. No equipment, no repeat, and short enough to finish on a bad day.',
    category: 'cardio',
    difficulty: 'intermediate',
    durationMin: 15,
    equipment: 'None',
    videoId: 'UKJzb1pFbTo',
    isPremium: false,
  },
  {
    slug: 'kettlebell-full-body-30',
    title: 'Kettlebell Full Body — Supersets',
    description:
      'Thirty minutes of no-repeat kettlebell supersets with no jumping, so the session stays quiet and apartment-friendly while the hinge patterns do the work.',
    category: 'cardio',
    difficulty: 'intermediate',
    durationMin: 30,
    equipment: 'Kettlebell',
    videoId: 'LJLjlrdBM6k',
    isPremium: false,
  },
  {
    slug: 'core-complex-ten',
    title: 'Ten-Minute Ab Complex',
    description:
      'A short sequence that cycles through flexion, extension and lateral core work rather than hammering the same crunch variation for ten minutes.',
    category: 'cardio',
    difficulty: 'advanced',
    durationMin: 10,
    equipment: 'None',
    videoId: 'r7gKGvjfyHg',
    isPremium: false,
  },
  {
    slug: 'full-body-stretching',
    title: 'Full-Body Stretching Flow',
    description:
      'A slow thirty-minute sequence that moves every major joint through a usable range. The most effective single session for undoing a week of desk work.',
    category: 'mobility',
    difficulty: 'beginner',
    durationMin: 30,
    equipment: 'None',
    videoId: 'Sl6q1igrxpk',
    isPremium: false,
  },
  {
    slug: 'eight-minute-hip-mobility',
    title: 'Eight-Minute Hip Mobility',
    description:
      'A focused eight-minute sequence for tight hips, built around active range of work rather than passive stretching. Ideal between heavier training days.',
    category: 'mobility',
    difficulty: 'intermediate',
    durationMin: 8,
    equipment: 'None',
    videoId: 'WUKHM6-ekJM',
    isPremium: false,
  },
  {
    slug: 'hips-shoulders-spine-mobility',
    title: 'Hips, Shoulders & Spine Mobility',
    description:
      'A whole-upper-body mobility routine that threads the spine through flexion, extension and rotation while opening the hips and shoulders.',
    category: 'mobility',
    difficulty: 'advanced',
    durationMin: 20,
    equipment: 'None',
    videoId: 'NEr4_LAcpQA',
    isPremium: false,
  },
  {
    slug: 'yoga-for-complete-beginners',
    title: 'Yoga for Complete Beginners',
    description:
      'A twenty-minute home yoga practice for people who have never set foot on a mat. Every pose is cued, scaled and held long enough to learn.',
    category: 'yoga',
    difficulty: 'beginner',
    durationMin: 20,
    equipment: 'Mat',
    videoId: 'v7AYKMP6rOE',
    isPremium: false,
  },
]

interface MealSeed {
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  calories: number
  proteinGrams: number
  items: string
}

interface MealPlanSeed {
  slug: string
  title: string
  goal: 'cut' | 'maintain' | 'bulk'
  description: string
  caloriesTarget: number
  isPremium: boolean
  meals: MealSeed[]
}

/** Calories implied by a plan's own macro numbers: 4/4/9 kcal per gram. */
function macroCalories(proteinGrams: number, carbsGrams: number, fatGrams: number): number {
  return proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9
}

interface ResolvedPlan {
  slug: string
  title: string
  goal: 'cut' | 'maintain' | 'bulk'
  description: string
  caloriesTarget: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  isPremium: boolean
  meals: MealSeed[]
}

/**
 * Derives the plan's macro totals from its meals, then checks the implied
 * calories land within 10% of the stated target. The seed refuses to write
 * numbers that do not hold.
 */
function resolvePlan(plan: MealPlanSeed): ResolvedPlan {
  const proteinGrams = plan.meals.reduce((total, meal) => total + meal.proteinGrams, 0)
  const carbsGrams = plan.meals.reduce((total, meal) => total + Math.round(meal.calories * 0.45) / 4, 0)
  const fatGrams = plan.meals.reduce((total, meal) => total + Math.round(meal.calories * 0.25) / 9, 0)

  const derived = macroCalories(proteinGrams, carbsGrams, fatGrams)
  const drift = Math.abs(derived - plan.caloriesTarget) / plan.caloriesTarget
  if (drift > 0.1) {
    throw new Error(
      `Seed aborted: plan "${plan.slug}" macros imply ${derived} kcal against a target of ${plan.caloriesTarget} (${(drift * 100).toFixed(1)}% drift, limit 10%).`,
    )
  }

  return {
    ...plan,
    proteinGrams: Math.round(proteinGrams),
    carbsGrams: Math.round(carbsGrams),
    fatGrams: Math.round(fatGrams),
  }
}

const mealPlanSeeds: MealPlanSeed[] = [
  {
    slug: 'lean-cut',
    title: 'Lean Cut',
    goal: 'cut',
    description:
      'A high-protein, moderate-carb plan for a controlled deficit. Protein is held high to protect lean mass while total calories sit below maintenance.',
    caloriesTarget: 1800,
    isPremium: false,
    meals: [
      { slot: 'breakfast', name: 'Greek Yoghurt & Berries Bowl', calories: 380, proteinGrams: 34, items: '200g Greek yoghurt, 100g blueberries, 20g almonds, 10g honey' },
      { slot: 'lunch', name: 'Grilled Chicken & Quinoa Salad', calories: 520, proteinGrams: 48, items: '180g chicken breast, 150g quinoa, mixed leaves, cucumber, olive oil' },
      { slot: 'dinner', name: 'Salmon, Broccoli & Sweet Potato', calories: 610, proteinGrams: 45, items: '170g salmon fillet, 200g broccoli, 250g sweet potato' },
      { slot: 'snack', name: 'Cottage Cheese & Apple', calories: 290, proteinGrams: 28, items: '200g cottage cheese, 1 medium apple' },
    ],
  },
  {
    slug: 'maintain-balanced',
    title: 'Maintain — Balanced',
    goal: 'maintain',
    description:
      'A maintenance plan built around whole foods and predictable portions. Suits training days where the goal is to hold weight while performance improves.',
    caloriesTarget: 2400,
    isPremium: true,
    meals: [
      { slot: 'breakfast', name: 'Oats, Banana & Whey', calories: 520, proteinGrams: 32, items: '80g rolled oats, 1 banana, 1 scoop whey protein, 15g peanut butter' },
      { slot: 'lunch', name: 'Turkey & Farro Power Bowl', calories: 640, proteinGrams: 46, items: '180g turkey breast, 120g farro, roasted vegetables, tahini dressing' },
      { slot: 'dinner', name: 'Beef Stir-Fry with Rice', calories: 780, proteinGrams: 52, items: '180g lean beef, 180g jasmine rice, mixed stir-fry vegetables' },
      { slot: 'snack', name: 'Protein Smoothie', calories: 460, proteinGrams: 34, items: '1 scoop whey, 250ml milk, 1 banana, 1 tbsp peanut butter' },
    ],
  },
  {
    slug: 'lean-bulk',
    title: 'Lean Bulk',
    goal: 'bulk',
    description:
      'A moderate surplus for muscle gain, with carbs and calories raised rather than protein alone. Best paired with a progressive resistance programme.',
    caloriesTarget: 3000,
    isPremium: true,
    meals: [
      { slot: 'breakfast', name: 'Full English-Style Plate', calories: 680, proteinGrams: 42, items: '4 eggs, 2 rashers bacon, 2 slices wholegrain toast, 1 avocado' },
      { slot: 'lunch', name: 'Chicken Burrito Bowl', calories: 820, proteinGrams: 58, items: '220g chicken thigh, 220g brown rice, black beans, corn, salsa' },
      { slot: 'dinner', name: 'Pasta Bolognese with Salad', calories: 860, proteinGrams: 50, items: '250g pasta, 200g lean mince, tomato sauce, green salad' },
      { slot: 'snack', name: 'Cottage Cheese & Crackers', calories: 640, proteinGrams: 36, items: '250g cottage cheese, wholegrain crackers, 1 banana' },
    ],
  },
]

const FREE_MEAL_PLAN_COUNT = 1
const PREMIUM_MEAL_PLAN_COUNT = 2

// Macros are derived from the meal data below, never hand-typed, so the plan
// totals and the per-meal numbers can never disagree.
const mealPlans: ResolvedPlan[] = mealPlanSeeds.map(resolvePlan)

interface VideoUrl {
  embedUrl: string
  thumbnail: string
}

function videoUrls(videoId: string): VideoUrl {
  return {
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  }
}

async function seedWorkouts(): Promise<void> {
  for (const workout of workouts) {
    const { embedUrl, thumbnail } = videoUrls(workout.videoId)
    const data = {
      title: workout.title,
      description: workout.description,
      category: workout.category,
      difficulty: workout.difficulty,
      durationMin: workout.durationMin,
      equipment: workout.equipment,
      embedUrl,
      thumbnail,
      isPremium: workout.isPremium,
      setsJson: workout.sets ? JSON.stringify(workout.sets) : null,
    }

    await prisma.workout.upsert({
      where: { slug: workout.slug },
      create: { slug: workout.slug, ...data },
      update: data,
    })
  }
}

async function seedMealPlans(): Promise<void> {
  for (const plan of mealPlans) {
    const { meals, ...planData } = plan
    const record = await prisma.mealPlan.upsert({
      where: { slug: plan.slug },
      create: planData,
      update: planData,
    })

    // Meals have no natural key of their own, so the plan's meals are
    // replaced wholesale. Seeding is a script, not a user-facing write path,
    // and this keeps re-runs from stacking duplicates.
    await prisma.meal.deleteMany({ where: { mealPlanId: record.id } })
    for (const meal of meals) {
      await prisma.meal.create({
        data: { mealPlanId: record.id, ...meal },
      })
    }
  }
}

async function main(): Promise<void> {
  const premiumWorkouts = workouts.filter((workout) => workout.isPremium).length
  if (premiumWorkouts !== 1) {
    throw new Error(`Seed aborted: expected exactly 1 premium workout, found ${premiumWorkouts}.`)
  }
  if (workouts.length !== 12) {
    throw new Error(`Seed aborted: expected 12 workouts, found ${workouts.length}.`)
  }

  const freePlans = mealPlans.filter((plan) => !plan.isPremium).length
  const premiumPlans = mealPlans.filter((plan) => plan.isPremium).length
  if (freePlans !== FREE_MEAL_PLAN_COUNT || premiumPlans !== PREMIUM_MEAL_PLAN_COUNT) {
    throw new Error(
      `Seed aborted: expected 1 free and 2 premium meal plans, found ${freePlans} and ${premiumPlans}.`,
    )
  }

  const slugs = new Set(workouts.map((workout) => workout.slug))
  if (slugs.size !== workouts.length) {
    throw new Error('Seed aborted: duplicate workout slugs in seed data.')
  }

  const videoIds = new Set(workouts.map((workout) => workout.videoId))
  if (videoIds.size !== workouts.length) {
    throw new Error(
      'Seed aborted: duplicate video IDs in seed data. Each workout needs its own video.',
    )
  }

  await seedWorkouts()
  await seedMealPlans()

  const counts = {
    workouts: await prisma.workout.count(),
    premiumWorkouts: await prisma.workout.count({ where: { isPremium: true } }),
    mealPlans: await prisma.mealPlan.count(),
    meals: await prisma.meal.count(),
  }

  process.stdout.write(`Seed complete: ${JSON.stringify(counts)}\n`)
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Seed failed: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
