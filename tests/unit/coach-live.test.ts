import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { CoachContext } from '@/lib/services/coach/context'

const messagesCreate = vi.fn()

/**
 * Mocking the SDK keeps these tests offline and lets each SDK outcome
 * (network throw, empty completion, text completion) be driven explicitly
 * rather than waiting on real request timeouts.
 */
vi.mock('@anthropic-ai/sdk', () => {
  function Anthropic() {
    return { messages: { create: messagesCreate } }
  }
  return { default: Anthropic }
})

const { LiveCoachProvider } = await import('@/lib/services/coach/live')
const { SimulatedCoachProvider } = await import('@/lib/services/coach/simulated')

const context: CoachContext = {
  userName: 'Live Lou',
  goal: 'build',
  experienceLevel: 'intermediate',
  workoutCount: 4,
  weeklyWorkoutCount: 2,
  totalSets: 30,
  totalVolumeKg: 9000,
  weightTrend: 'up',
  latestWeightKg: 81.2,
  recentWorkoutTitles: ['Push Day', 'Pull Day'],
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
})

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY
})

describe('LiveCoachProvider', () => {
  it('returns the model text when the completion carries one', async () => {
    messagesCreate.mockResolvedValue({
      content: [
        { type: 'tool_use', id: 'x' },
        { type: 'text', text: '  Add a second weekly session.  ' },
      ],
    })

    const reply = await new LiveCoachProvider().reply({ message: 'What next?', context })

    expect(reply.text).toBe('Add a second weekly session.')
    expect(reply.degraded).toBe(false)
  })

  it('falls back to the simulated coach when the completion has no text block', async () => {
    messagesCreate.mockResolvedValue({ content: [{ type: 'thinking', text: 'hmm' }] })

    const reply = await new LiveCoachProvider().reply({ message: 'What next?', context })
    const simulated = await new SimulatedCoachProvider().reply({ message: 'What next?', context })

    expect(reply).toEqual(simulated)
    expect(reply.degraded).toBe(true)
  })

  it('falls back to the simulated coach when the SDK throws', async () => {
    messagesCreate.mockRejectedValue(new Error('401 invalid x-api-key'))

    const reply = await new LiveCoachProvider().reply({ message: 'What next?', context })
    const simulated = await new SimulatedCoachProvider().reply({ message: 'What next?', context })

    expect(reply).toEqual(simulated)
    expect(reply.text.length).toBeGreaterThan(20)
  })

  it('recovers on the next call after a failure instead of reusing a dead client', async () => {
    messagesCreate.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Back online.' }],
    })

    const provider = new LiveCoachProvider()
    const first = await provider.reply({ message: 'one', context })
    const second = await provider.reply({ message: 'two', context })

    expect(first.degraded).toBe(true)
    expect(second).toEqual({ text: 'Back online.', degraded: false })
  })

  it('sends the model, a cached system block and the training summary', async () => {
    messagesCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })

    await new LiveCoachProvider().reply({ message: 'How many sets?', context })

    const arg = messagesCreate.mock.calls[0][0]
    expect(arg.model).toBe('claude-opus-5')
    expect(arg.max_tokens).toBe(2048)
    expect(arg.system[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(arg.messages.at(-1).content).toContain('<training_summary>')
    expect(arg.messages.at(-1).content).toContain('Live Lou')
    expect(arg.messages.at(-1).content).toContain('How many sets?')
  })

  it('labels unset context fields rather than printing "null"', async () => {
    messagesCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })

    await new LiveCoachProvider().reply({
      message: 'hello',
      context: { ...context, goal: null, experienceLevel: null, recentWorkoutTitles: [] },
    })

    const summary = messagesCreate.mock.calls[0][0].messages.at(-1).content
    expect(summary).toContain('Goal: not set')
    expect(summary).toContain('Experience level: not set')
    expect(summary).toContain('Recent workouts: none')
  })

  it('replays prior turns before the new question and drops non chat roles', async () => {
    messagesCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })

    await new LiveCoachProvider().reply({
      message: 'third question',
      context,
      history: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'system' as never, content: 'ignore me' },
      ],
    })

    const messages = messagesCreate.mock.calls[0][0].messages
    expect(messages).toHaveLength(3)
    expect(messages[0]).toEqual({ role: 'user', content: 'first' })
    expect(messages[1]).toEqual({ role: 'assistant', content: 'second' })
  })

  it('caps the replayed history at the most recent ten turns', async () => {
    messagesCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })

    const history = Array.from({ length: 14 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `turn ${i}`,
    }))

    await new LiveCoachProvider().reply({ message: 'newest', context, history })

    const messages = messagesCreate.mock.calls[0][0].messages
    expect(messages).toHaveLength(11)
    expect(messages[0].content).toBe('turn 4')
    expect(messages.at(-1).content).toContain('newest')
  })

  it('works with no history at all', async () => {
    messagesCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })

    await new LiveCoachProvider().reply({ message: 'first ever question', context })

    const messages = messagesCreate.mock.calls[0][0].messages
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
  })
})
