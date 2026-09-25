import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { loadShowcaseWorkout } from '@/lib/showcase-workout'
import type { ShowcaseWorkout } from '@/lib/showcase-workout'
import { HeroSessionPicker } from '@/components/landing/HeroSessionPicker'
import { PublicNav } from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/Button'
import { CheckIcon } from '@/components/ui/Icon'

type LandingProps = {
  showcase: ShowcaseWorkout | null
}

type Feature = {
  id: FeatureId
  eyebrow: string
  title: string
  body: string
  points: string[]
}

type FeatureId = 'workouts' | 'diet' | 'coach' | 'progress'

/** Bar heights for the fake weekly-volume chart, oldest week first. The dip
    is deliberate: it shows a bad week without wiping out the trend. */
const VOLUME_BARS = [45, 62, 58, 80, 74, 92, 100] as const

/** Stylised previews of each section's real UI, so the marketing copy has
    something to point at instead of an empty panel. The workout preview plays
    a real library video and so is exposed to assistive tech; the rest are
    illustrations and are hidden from it. */
function FeatureVisual({
  featureId,
  className,
  showcase,
}: {
  featureId: FeatureId
  className?: string
  showcase: ShowcaseWorkout | null
}) {
  if (featureId === 'workouts' && showcase) {
    return (
      <div className={className}>
        <WorkoutPreview workout={showcase} />
      </div>
    )
  }

  return (
    <div aria-hidden="true" className={className}>
      {featureId === 'diet' && <DietPreview />}
      {featureId === 'coach' && <CoachPreview />}
      {(featureId === 'progress' || featureId === 'workouts') && <ProgressPreview />}
    </div>
  )
}

const PREVIEW_PANEL = 'rounded-xl border border-navy-800 bg-navy-900 p-8'

/** Sets are listed as the real `sets × reps` target from the library, so the
    preview and the session a visitor lands on cannot drift apart. */
function WorkoutPreview({ workout }: { workout: ShowcaseWorkout }) {
  return (
    <div className={PREVIEW_PANEL}>
      <div className="flex items-center justify-between text-caption text-slate-400">
        <span className="font-medium text-white">{workout.title}</span>
        <span>{workout.durationMin} min</span>
      </div>

      <div className="mt-4 aspect-video overflow-hidden rounded-lg border border-navy-800 bg-navy-950">
        <iframe
          src={workout.embedUrl}
          title={`${workout.title} — preview`}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-caption">
        <span className="rounded-full bg-navy-800 px-2 py-1 capitalize text-slate-300">
          {workout.category}
        </span>
        <span className="rounded-full bg-navy-800 px-2 py-1 capitalize text-slate-300">
          {workout.difficulty}
        </span>
        <span className="rounded-full bg-navy-800 px-2 py-1 text-slate-300">
          {workout.equipment}
        </span>
      </div>

      <ul className="mt-6 space-y-3">
        {workout.sets.map((set) => (
          <li
            key={set.name}
            className="flex items-center justify-between rounded-lg border border-navy-800 px-4 py-3"
          >
            <span className="text-caption text-slate-300">{set.name}</span>
            <span className="font-display text-gold-400">
              {set.sets} × {set.reps}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DietPreview() {
  const macros = [
    { label: 'Protein', value: '150 g', share: 68, className: 'bg-emerald-500' },
    { label: 'Carbs', value: '220 g', share: 90, className: 'bg-gold-500' },
    { label: 'Fat', value: '70 g', share: 38, className: 'bg-gold-400' },
  ]

  return (
    <div className={PREVIEW_PANEL}>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold-400 font-display text-section text-gold-400">
          CUT
        </div>
        <div>
          <p className="font-medium text-white">Lean bulk</p>
          <p className="text-caption text-slate-400">2200 kcal · 5 days on, 2 off</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {macros.map((macro) => (
          <div key={macro.label}>
            <div className="flex items-center justify-between text-caption">
              <span className="text-slate-300">{macro.label}</span>
              <span className="font-display text-white">{macro.value}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-navy-950">
              <div className={`h-1.5 rounded-full ${macro.className}`} style={{ width: `${macro.share}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 border-t border-navy-800 pt-4 text-caption text-slate-400">
        Breakfast through dinner, itemised — every swap listed.
      </p>
    </div>
  )
}

function CoachPreview() {
  const turns: Array<{ from: 'ai' | 'you'; text: string }> = [
    { from: 'ai', text: 'How was your squat depth this week?' },
    { from: 'you', text: 'Struggled past 90 kg. Bar drifted forward.' },
    { from: 'ai', text: 'Drop to 82.5 kg and pause two seconds in the hole. Log it next session and we compare.' },
  ]

  return (
    <div className={`${PREVIEW_PANEL} space-y-4`}>
      {turns.map((turn) => (
        <div key={turn.text} className="flex items-end gap-3">
          {turn.from === 'you' && <CoachAvatar label="You" tone="user" />}
          <div
            className={`max-w-[80%] rounded-xl px-4 py-3 text-caption ${
              turn.from === 'ai'
                ? 'bg-navy-800 text-slate-200'
                : 'rounded-br-sm bg-emerald-600 text-navy-950'
            }`}
          >
            {turn.text}
          </div>
          {turn.from === 'ai' && <CoachAvatar label="AI" tone="ai" />}
        </div>
      ))}
      <p className="flex items-center gap-2 pt-1 text-caption text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Answered from your logged sessions, not a generic article.
      </p>
    </div>
  )
}

function CoachAvatar({ label, tone }: { label: string; tone: 'ai' | 'user' }) {
  const className =
    tone === 'ai' ? 'bg-emerald-600 text-navy-950' : 'bg-navy-800 text-slate-300'
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-caption font-semibold ${className}`}
    >
      {label}
    </span>
  )
}

function ProgressPreview() {
  return (
    <div className={PREVIEW_PANEL}>
      <div className="flex items-baseline justify-between">
        <span className="text-caption font-medium text-slate-300">Weekly volume</span>
        <span className="font-display text-emerald-400">+12%</span>
      </div>

      <div className="mt-6 flex h-32 items-end gap-1.5">
        {VOLUME_BARS.map((height, index) => (
          <div
            key={height + index}
            className={`flex-1 rounded-t ${index === VOLUME_BARS.length - 1 ? 'bg-emerald-500' : 'bg-emerald-500/70'}`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-caption text-slate-400">
        <span>Week 1</span>
        <span>Week 7</span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-navy-800 pt-6 text-center">
        <div>
          <p className="font-display text-section text-white">4</p>
          <p className="text-caption text-slate-400">Sessions</p>
        </div>
        <div>
          <p className="font-display text-section text-white">12,480</p>
          <p className="text-caption text-slate-400">Kg lifted</p>
        </div>
        <div>
          <p className="font-display text-section text-white">-1.2 kg</p>
          <p className="text-caption text-slate-400">Weight trend</p>
        </div>
      </div>
    </div>
  )
}

const FEATURES: Feature[] = [
  {
    id: 'workouts',
    eyebrow: 'Video library',
    title: 'Every session, demonstrated',
    body: 'Strength, conditioning, mobility and HIIT — each session with a full set list, the load and reps to hit, and a coach on screen for every movement.',
    points: ['Set-by-set targets, not guesswork', 'Filter by goal, difficulty and equipment', 'Log the session straight from the player'],
  },
  {
    id: 'diet',
    eyebrow: 'Nutrition',
    title: 'Plans built around your goal',
    body: 'Whether you are cutting, building or holding, each plan comes with calorie and macro targets plus a full day of meals you can actually cook.',
    points: ['Calorie, protein, carb and fat targets', 'Breakfast through dinner, itemised', 'Matches the goal on your profile'],
  },
  {
    id: 'coach',
    eyebrow: 'AI coaching',
    title: 'A coach that knows your numbers',
    body: 'Ask anything about your training. The coach is given your logged sessions, volume, weight trend and recent work, so its answers are about you rather than in general.',
    points: ['Grounded in your real training history', 'Remembers the last ten turns', 'General fitness guidance, never medical advice'],
  },
  {
    id: 'progress',
    eyebrow: 'Analytics',
    title: 'Progress you can actually read',
    body: 'Weekly volume, session frequency and body-weight trend on one screen, bucketed by week so a good month never disappears into a bad week.',
    points: ['Volume and weekly session count', 'Weight trend line over time', 'Premium unlocks the full series'],
  },
]

const PREMIUM_FEATURES = [
  'The full premium workout library',
  'Advanced programmes and diet plans',
  'Unlimited AI coaching',
  'Complete progress analytics',
]

export const getServerSideProps: GetServerSideProps<LandingProps> = async () => ({
  props: { showcase: await loadShowcaseWorkout() },
})

export default function LandingPage({ showcase }: LandingProps) {
  return (
    <div className="min-h-screen">
      <PublicNav />

      <main>
        <section className="relative overflow-hidden border-b border-navy-800 px-8 py-24">
          {/* A soft emerald wash behind the hero so the headline reads as lit
              rather than pasted onto the background. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-emerald-600/10 blur-3xl"
          />
          <div className="relative mx-auto max-w-5xl text-center">
            <p className="text-caption font-medium uppercase tracking-[0.25em] text-gold-400">
              Train · Fuel · Progress
            </p>
            <h1 className="mt-6 font-display text-display leading-tight text-white">
              The whole programme,
              <br />
              <span className="text-gold-500">in one place</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-body text-slate-300">
              Video sessions with real set targets, diet plans that match your goal, a coach that
              reads your training history, and analytics that show whether any of it is working.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup" className="focus-ring rounded-md">
                <Button size="lg">Start Training</Button>
              </Link>
              <Link href="/login" className="focus-ring rounded-md">
                <Button size="lg" variant="secondary">
                  I already have an account
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-caption text-slate-400">Free forever. No card required.</p>

            <HeroSessionPicker />
          </div>
        </section>

        {FEATURES.map((feature, index) => (
          <section
            key={feature.id}
            id={feature.id}
            aria-labelledby={`${feature.id}-heading`}
            className="border-b border-navy-800 px-8 py-20"
          >
            <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
              <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                <p className="text-caption font-medium uppercase tracking-[0.2em] text-emerald-500">
                  {feature.eyebrow}
                </p>
                <h2
                  id={`${feature.id}-heading`}
                  className="mt-3 font-display text-page text-white"
                >
                  {feature.title}
                </h2>
                <p className="mt-4 text-slate-300">{feature.body}</p>
                <ul className="mt-6 space-y-3">
                  {feature.points.map((point) => (
                    <li key={point} className="flex gap-3 text-slate-300">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* A stylised preview of the section rather than a screenshot, so it
                  stays honest and never goes stale. */}
              <FeatureVisual
                featureId={feature.id}
                className={index % 2 === 1 ? 'md:order-1' : ''}
                showcase={showcase}
              />
            </div>
          </section>
        ))}

        <section aria-labelledby="pricing-heading" className="px-8 py-24">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <p className="text-caption font-medium uppercase tracking-[0.2em] text-gold-400">
                Membership
              </p>
              <h2 id="pricing-heading" className="mt-3 font-display text-display text-white">
                Free to start. Premium when it earns its keep.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-300">
                Everything in the library, the coach and your progress history stays on the free
                plan. Premium opens the advanced work.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-navy-800 bg-navy-900 p-8">
                <h3 className="font-display text-section text-white">Free</h3>
                <p className="mt-2 text-display font-display text-white">$0</p>
                <p className="mt-2 text-caption text-slate-400">Forever, with no card.</p>
                <ul className="mt-6 space-y-3 text-caption text-slate-300">
                  <li className="flex gap-3">
                    <CheckIcon className="size-4 text-emerald-500" />
                    Core workout library
                  </li>
                  <li className="flex gap-3">
                    <CheckIcon className="size-4 text-emerald-500" />
                    Starter diet plans
                  </li>
                  <li className="flex gap-3">
                    <CheckIcon className="size-4 text-emerald-500" />
                    AI coaching and progress tracking
                  </li>
                </ul>
                <Link href="/signup" className="focus-ring mt-8 block rounded-md">
                  <Button className="w-full" variant="secondary">
                    Create a free account
                  </Button>
                </Link>
              </div>

              <div className="rounded-xl border border-emerald-500/70 bg-navy-900 p-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-section text-white">Premium</h3>
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-caption font-medium text-navy-950">
                    Most popular
                  </span>
                </div>
                <p className="mt-2 text-display font-display text-white">
                  $12<span className="text-caption text-slate-400">/month</span>
                </p>
                <p className="mt-2 text-caption text-slate-400">Cancel whenever you like.</p>
                <ul className="mt-6 space-y-3 text-caption text-slate-300">
                  {PREMIUM_FEATURES.map((item) => (
                    <li key={item} className="flex gap-3">
                      <CheckIcon className="size-4 text-gold-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="focus-ring mt-8 block rounded-md">
                  <Button className="w-full">Start free, upgrade later</Button>
                </Link>
              </div>
            </div>

            <p className="mt-8 text-center text-caption text-slate-400">
              Subscriptions are billed through Stripe. You can manage or cancel from your settings
              page at any time.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-navy-800 px-8 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-caption text-slate-400">
            Apex<span className="text-gold-400">Fitness</span> — general fitness guidance, not
            medical advice.
          </p>
          <div className="flex gap-6 text-caption">
            <Link href="/login" className="focus-ring flex min-tap items-center text-slate-300 hover:text-white">Sign in</Link>
            <Link href="/signup" className="focus-ring flex min-tap items-center text-slate-300 hover:text-white">Create an account</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
