import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { CoachContext } from '@/lib/services/coach/context'
import { getCoachProvider, OpenRouterCoachProvider } from '@/lib/services/coach'
import { SimulatedCoachProvider } from '@/lib/services/coach/simulated'

const fetchMock = vi.fn()

/**
 * `fetch` is stubbed so each outcome — auth failure, rate limit, timeout, empty
 * completion, success — is driven explicitly rather than waiting on real
 * request timeouts or spending someone's API credits.
 */
vi.stubGlobal('fetch', fetchMock)

const context: CoachContext = {
  userName: 'Rory',
  goal: 'cut',
  experienceLevel: 'intermediate',
  workoutCount: 4,
  weeklyWorkoutCount: 2,
  totalSets: 30,
  totalVolumeKg: 9000,
  weightTrend: 'up',
  latestWeightKg: 81.2,
  recentWorkoutTitles: ['Push Day', 'Pull Day'],
}

function jsonOk(content: unknown) {
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) }
}

function requestBody(call = 0): {
  model: string
  max_tokens: number
  messages: { role: string; content: string }[]
} {
  return JSON.parse(fetchMock.mock.calls[call][1].body)
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.OPENROUTER_API_KEY = 'sk-or-v1-test'
  delete process.env.COACH_MODEL
  // The failure path logs; keep the expected noise out of the test output.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY
  delete process.env.COACH_MODEL
  vi.restoreAllMocks()
})

describe('OpenRouterCoachProvider', () => {
  it('returns the model text when the completion carries one', async () => {
    fetchMock.mockResolvedValue(jsonOk('  Add a second weekly session.  '))

    const reply = await new OpenRouterCoachProvider().reply({ message: 'What next?', context })

    expect(reply).toEqual({ text: 'Add a second weekly session.', degraded: false })
  })

  it('degrades and logs the reason when the key is rejected', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"error":{"message":"No auth credentials found"}}',
    })

    const reply = await new OpenRouterCoachProvider().reply({ message: 'What next?', context })
    const simulated = await new SimulatedCoachProvider().reply({ message: 'What next?', context })

    expect(reply).toEqual(simulated)
    // The reason is logged, which is the point: a 401 otherwise looks identical
    // to a working scripted coach.
    expect(console.error).toHaveBeenCalledWith(
      '[coach] openrouter request failed',
      expect.objectContaining({ error: expect.stringContaining('401') }),
    )
  })

  it('degrades when the network call throws', async () => {
    fetchMock.mockRejectedValue(new Error('The operation was aborted due to timeout'))

    const reply = await new OpenRouterCoachProvider().reply({ message: 'What next?', context })

    expect(reply.degraded).toBe(true)
    expect(reply.text.length).toBeGreaterThan(20)
  })

  it('degrades when the completion is empty', async () => {
    fetchMock.mockResolvedValue(jsonOk(''))

    const reply = await new OpenRouterCoachProvider().reply({ message: 'What next?', context })

    expect(reply.degraded).toBe(true)
  })

  it('degrades without a request when no key is configured', async () => {
    delete process.env.OPENROUTER_API_KEY

    const reply = await new OpenRouterCoachProvider().reply({ message: 'What next?', context })

    expect(reply.degraded).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the default model, the system prompt and the training summary', async () => {
    fetchMock.mockResolvedValue(jsonOk('ok'))

    await new OpenRouterCoachProvider().reply({ message: 'How many sets?', context })

    const body = requestBody()
    expect(body.model).toBe('meta-llama/llama-3.3-70b-instruct')
    expect(body.max_tokens).toBe(2048)
    expect(body.messages[0].role).toBe('system')
    expect(body.messages[0].content).toContain('fitness app')
    expect(body.messages.at(-1)?.content).toContain('<training_summary>')
    expect(body.messages.at(-1)?.content).toContain('Rory')
    expect(body.messages.at(-1)?.content).toContain('How many sets?')
  })

  it('honours COACH_MODEL over the default', async () => {
    process.env.COACH_MODEL = 'qwen/qwen-2.5-72b-instruct'
    fetchMock.mockResolvedValue(jsonOk('ok'))

    await new OpenRouterCoachProvider().reply({ message: 'hi', context })

    expect(requestBody().model).toBe('qwen/qwen-2.5-72b-instruct')
  })

  it('sends the key as a bearer token', async () => {
    fetchMock.mockResolvedValue(jsonOk('ok'))

    await new OpenRouterCoachProvider().reply({ message: 'hi', context })

    const headers = fetchMock.mock.calls[0][1].headers
    expect(headers.Authorization).toBe('Bearer sk-or-v1-test')
  })

  it('labels unset context fields rather than printing "null"', async () => {
    fetchMock.mockResolvedValue(jsonOk('ok'))

    await new OpenRouterCoachProvider().reply({
      message: 'hello',
      context: { ...context, goal: null, experienceLevel: null, recentWorkoutTitles: [] },
    })

    const summary = requestBody().messages.at(-1)?.content ?? ''
    expect(summary).toContain('Goal: not set')
    expect(summary).toContain('Recent workouts: none')
  })

  it('replays prior turns and caps them at the most recent ten', async () => {
    fetchMock.mockResolvedValue(jsonOk('ok'))

    const history = Array.from({ length: 14 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `turn ${i}`,
    }))

    await new OpenRouterCoachProvider().reply({ message: 'newest', context, history })

    // +1 for the system message.
    const messages = requestBody().messages
    expect(messages).toHaveLength(12)
    expect(messages[1].content).toBe('turn 4')
    expect(messages.at(-1)?.content).toContain('newest')
  })

  it('works with no history at all', async () => {
    fetchMock.mockResolvedValue(jsonOk('ok'))

    await new OpenRouterCoachProvider().reply({ message: 'first ever question', context })

    const messages = requestBody().messages
    expect(messages).toHaveLength(2)
    expect(messages.at(-1)?.role).toBe('user')
  })
})

describe('getCoachProvider with an open-model key', () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  it('prefers the OpenRouter provider when its key is set', () => {
    delete process.env.ANTHROPIC_API_KEY
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test'

    expect(getCoachProvider()).toBeInstanceOf(OpenRouterCoachProvider)
  })

  it('still falls back to Anthropic when only that key is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
    delete process.env.OPENROUTER_API_KEY

    expect(getCoachProvider().constructor.name).toBe('LiveCoachProvider')
  })

  it('uses the simulated coach when no key is set at all', () => {
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENROUTER_API_KEY

    expect(getCoachProvider()).toBeInstanceOf(SimulatedCoachProvider)
  })
})
