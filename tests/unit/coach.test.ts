import { describe, it, expect } from 'vitest'
import { getCoachProvider, LiveCoachProvider } from '@/lib/services/coach'
import { SimulatedCoachProvider } from '@/lib/services/coach/simulated'
import type { CoachContext } from '@/lib/services/coach/context'

const noLogs: CoachContext = {
  userName: 'Sam',
  goal: 'cut',
  experienceLevel: 'beginner',
  workoutCount: 0,
  weeklyWorkoutCount: 0,
  totalSets: 0,
  totalVolumeKg: 0,
  weightTrend: 'unknown',
  latestWeightKg: null,
  recentWorkoutTitles: [],
}

const active: CoachContext = {
  ...noLogs,
  workoutCount: 6,
  weeklyWorkoutCount: 3,
  totalSets: 42,
  totalVolumeKg: 18400,
  weightTrend: 'down',
  latestWeightKg: 78.4,
  recentWorkoutTitles: ['Upper Body', 'Leg Day'],
}

describe('provider selection', () => {
  it('uses the simulated provider when ANTHROPIC_API_KEY is absent', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(getCoachProvider()).toBeInstanceOf(SimulatedCoachProvider)
  })

  it('uses the live provider when ANTHROPIC_API_KEY is present', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    expect(getCoachProvider()).toBeInstanceOf(LiveCoachProvider)
    delete process.env.ANTHROPIC_API_KEY
  })
})

describe('simulated coach', () => {
  const coach = new SimulatedCoachProvider()

  /** The provider now returns `{ text, degraded }`; these tests assert on prose. */
  async function replyText(
    provider: SimulatedCoachProvider,
    input: { message: string; context: CoachContext },
  ): Promise<string> {
    return (await provider.reply(input)).text
  }

  it('nudges a user with no logged workouts', async () => {
    const reply = await replyText(coach,{ message: 'How should I start?', context: noLogs })
    expect(reply).toMatch(/log|start|begin/i)
  })

  it("cites the user's real weight when discussing progress", async () => {
    const reply = await replyText(coach,{ message: 'How is my progress?', context: active })
    expect(reply).toContain('78.4')
  })

  it('gives nutrition guidance when weight is trending up against a cut goal', async () => {
    const reply = await replyText(coach,{
      message: 'What should I change?',
      context: { ...active, weightTrend: 'up' },
    })
    expect(reply).toMatch(/protein|calorie|nutrition|intake/i)
  })

  it('never returns an empty reply', async () => {
    for (const ctx of [noLogs, active]) {
      const reply = await replyText(coach,{ message: 'x', context: ctx })
      expect(reply.length).toBeGreaterThan(20)
    }
  })

  it('calls a low set total a volume floor rather than a problem', async () => {
    const reply = await replyText(coach,{
      message: 'Am I doing enough?',
      context: { ...active, totalSets: 9, recentWorkoutTitles: [] },
    })

    expect(reply).toContain('9 set(s)')
    expect(reply).toMatch(/low volume floor|progressive overload/i)
  })

  it('describes a stable weight as holding steady', async () => {
    const reply = await replyText(coach,{
      message: 'How is my weight?',
      context: { ...active, weightTrend: 'stable' },
    })

    expect(reply).toContain('holding steady at 78.4 kg')
  })

  it('refuses to narrate a trend when no weight is recorded', async () => {
    const reply = await replyText(coach,{
      message: 'How is my weight?',
      context: { ...active, latestWeightKg: null, weightTrend: 'unknown' },
    })

    expect(reply).toContain('no weight recorded yet')
  })

  it('says the trend is undetermined when a weight exists but history is too short', async () => {
    const reply = await replyText(coach,{
      message: 'How is my weight?',
      context: { ...active, weightTrend: 'unknown', recentWorkoutTitles: [] },
    })

    expect(reply).toContain('not enough readings yet to call a trend')
    expect(reply).not.toContain(' Your recent work includes')
  })

  it('describes an upward trend as being up to the latest weight', async () => {
    const reply = await replyText(coach,{
      message: 'How is my weight?',
      context: { ...active, weightTrend: 'up', goal: 'build', weeklyWorkoutCount: 1 },
    })

    expect(reply).toContain('up to 78.4 kg')
    expect(reply).toContain('a light week')
  })

  it('calls three or more weekly sessions a solid cadence', async () => {
    const reply = await replyText(coach,{
      message: 'How is my week?',
      context: { ...active, weeklyWorkoutCount: 4, totalSets: 40 },
    })

    expect(reply).toContain('a solid weekly cadence')
  })

  it('lists only the three most recent workout titles', async () => {
    const reply = await replyText(coach,{
      message: 'What have I been doing?',
      context: {
        ...active,
        recentWorkoutTitles: ['Upper', 'Lower', 'Arms', 'Legs', 'Glutes'],
      },
    })

    expect(reply).toContain('Upper, Lower, Arms.')
    expect(reply).not.toContain('Glutes')
  })

  it('formats total volume with thousands separators', async () => {
    const reply = await replyText(coach,{
      message: 'How much have I lifted?',
      context: { ...active, totalVolumeKg: 12345.6 },
    })

    expect(reply).toContain('12,346 kg')
  })

  it('marks every simulated reply as degraded', async () => {
    for (const ctx of [noLogs, active]) {
      expect((await coach.reply({ message: 'hi', context: ctx })).degraded).toBe(true)
    }
  })
})

/**
 * The bug these cover: the coach answered from the training summary only, so
 * every message — "hi" and "need a diet plan" alike — returned the same
 * paragraph. Each intent must now produce its own answer.
 */
describe('simulated coach intent routing', () => {
  const coach = new SimulatedCoachProvider()

  const ask = (message: string, context: CoachContext = noLogs) => coach.reply({ message, context })

  it('answers a greeting differently from an unrelated question', async () => {
    const greeting = await ask('hi')
    const question = await ask('How is my progress?', active)

    expect(greeting.text).not.toBe(question.text)
    expect(greeting.text).toContain('Hello, Sam')
  })

  it('gives a nutrition answer to a diet plan request', async () => {
    const reply = await ask('need a dite plan', active)

    expect(reply.text).toMatch(/protein|nutrition|diet/i)
    // 78.4 kg at 1.8 g/kg rounds to 141 g.
    expect(reply.text).toContain('141 g')
  })

  it('gives a nutrition answer to ordinary spellings too', async () => {
    for (const message of ['what should I eat', 'build me a diet', 'how many calories']) {
      expect((await ask(message, active)).text).toMatch(/protein|nutrition|calorie/i)
    }
  })

  it('tailors nutrition advice to the goal', async () => {
    const cut = await ask('diet advice', { ...active, goal: 'cut' })
    const build = await ask('diet advice', { ...active, goal: 'build' })

    expect(cut.text).toContain('trim 200')
    expect(build.text).toContain('add 200')
    expect(cut.text).not.toBe(build.text)
  })

  it('asks for a bodyweight rather than inventing a protein target without one', async () => {
    const reply = await ask('what should I eat', { ...active, latestWeightKg: null })

    expect(reply.text).toMatch(/record your bodyweight/i)
    expect(reply.text).not.toMatch(/\d+ g of protein a day/)
  })

  it('refuses to coach through pain instead of answering as a training question', async () => {
    const reply = await ask('my knee hurts when I squat, what should I do?', active)

    expect(reply.text).toMatch(/doctor|physiotherapist/i)
    expect(reply.text).not.toMatch(/protein|calorie/i)
  })

  it('prioritises the health check over the nutrition check', async () => {
    // "diet" and "pain" both match; the unsafe topic must win.
    const reply = await ask('is this diet safe with my back pain?', active)

    expect(reply.text).toMatch(/doctor|physiotherapist/i)
  })

  it('falls through to the context summary for a question it cannot route', async () => {
    const reply = await ask('what happened to my squat depth last week?', active)

    expect(reply.text).toContain('78.4')
    expect(reply.text).toContain('6 logged workout(s)')
  })

  it('asks for clarification on a bare continuation instead of restarting', async () => {
    for (const message of ['proceed', 'ok', 'go on', 'thanks', 'continue', 'and?']) {
      const reply = await ask(message, active)
      expect(reply.text).toMatch(/not sure what you would like/i)
    }
  })

  it('does not treat a continuation as a real question about the summary', async () => {
    // The old behaviour: "proceed" fell through and re-delivered the summary,
    // which reads as the coach ignoring the turn it was replying to.
    const reply = await ask('proceed', active)

    expect(reply.text).not.toContain('6 logged workout(s)')
  })

  it('still routes a real question that merely starts with an acknowledgement', async () => {
    expect((await ask('ok and what about protein?', active)).text).toMatch(/protein|calorie/i)
  })

  it('treats a mid-sentence greeting as a greeting, not a fallback', async () => {
    // The bug: "how are you" was not in the greeting list at all, so it fell
    // through to the no-logs welcome and read as the coach ignoring the turn.
    for (const message of ['how are you', 'how are you?', "how's it going", 'hey how are you']) {
      const reply = await ask(message, noLogs)
      expect(reply.text).toContain('Hello, Sam')
      expect(reply.text).not.toContain('You have not logged a workout yet, so start there')
    }
  })

  it('answers the question, not the pleasantry, when both are present', async () => {
    // GREETING is un-anchored, so this message carries a greeting keyword.
    const reply = await ask('hi, how much protein should I eat?', active)

    expect(reply.text).toContain('141 g')
  })

  it('is case and punctuation insensitive', async () => {
    for (const message of ['HI!', 'Hello.', '  hi  ']) {
      expect((await ask(message, active)).text).toContain('Hello, Sam')
    }
  })
})
