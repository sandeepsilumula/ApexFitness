import type { CoachContext } from '@/lib/services/coach/context'
import { SimulatedCoachProvider } from '@/lib/services/coach/simulated'
import type { CoachProvider, CoachReply, CoachReplyInput } from '@/lib/services/coach/types'

/**
 * OpenRouter proxies hundreds of open-weight models behind one
 * OpenAI-compatible `/chat/completions` endpoint, so the coach can run on
 * Llama, Qwen or DeepSeek with no per-vendor code.
 *
 * Plain `fetch` rather than the OpenAI SDK: this is a single POST with a string
 * body, and a whole SDK would be more code than the request itself.
 */

const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct'
const MAX_TOKENS = 2048

/** The chat route must stay responsive; a slow model is worse than a local answer. */
const REQUEST_TIMEOUT_MS = 8000

const HISTORY_TURNS = 10

const SYSTEM_PROMPT = [
  'You are the coaching assistant inside a fitness app. You speak to one named user at a time.',
  'You have no access to tools, files or the internet, and you cannot see anything beyond the',
  'training summary and the conversation provided in the request. Never claim to have looked',
  'something up or to have seen a workout video.',
  'Be concrete and specific: name sets, reps, load, protein quantities or session choices when',
  'the summary supports it. Keep replies to a short paragraph or two — this is a chat panel,',
  'not a long-form plan.',
  'You give general fitness guidance, not medical advice. If the user describes an injury,',
  'pain or a condition that needs a clinician, say so plainly and suggest they speak to a doctor.',
  'If the summary shows the user has logged nothing yet, help them take the first small step',
  'rather than handing them a full programme.',
].join(' ')

/**
 * Serialises the context as short labelled lines rather than JSON. The model
 * reads it as a training summary, and the stable shape keeps the prompt prefix
 * identical when only the numbers change.
 */
function summariseContext(context: CoachContext): string {
  const lines = [
    `Name: ${context.userName}`,
    `Goal: ${context.goal ?? 'not set'}`,
    `Experience level: ${context.experienceLevel ?? 'not set'}`,
    `Workouts logged (all time): ${context.workoutCount}`,
    `Workouts logged (last 7 days): ${context.weeklyWorkoutCount}`,
    `Total sets logged: ${context.totalSets}`,
    `Total volume lifted: ${context.totalVolumeKg} kg`,
    `Weight trend: ${context.weightTrend}`,
    `Latest weight: ${context.latestWeightKg === null ? 'not recorded' : `${context.latestWeightKg} kg`}`,
    `Recent workouts: ${
      context.recentWorkoutTitles.length > 0 ? context.recentWorkoutTitles.join(', ') : 'none'
    }`,
  ]
  return lines.join('\n')
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function buildMessages(input: CoachReplyInput): ChatMessage[] {
  const history = (input.history ?? []).slice(-HISTORY_TURNS)

  // The API is stateless, so prior turns are replayed before the new question.
  const historyMessages = history
    .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
    .map((entry) => ({ role: entry.role, content: entry.content }))

  return [
    // OpenRouter has no prompt caching, so unlike the Anthropic path there is
    // no cache_control to set. The prompt is still stable, just not cached.
    { role: 'system', content: SYSTEM_PROMPT },
    ...historyMessages,
    {
      role: 'user',
      content: `<training_summary>\n${summariseContext(input.context)}\n</training_summary>\n\n${input.message}`,
    },
  ]
}

/**
 * The completion is a plain string, not an Anthropic content-block array, so
 * this reads one path rather than searching for a text block.
 */
function firstText(content: unknown): string {
  if (typeof content !== 'string') return ''
  return content.trim()
}

export class OpenRouterCoachProvider implements CoachProvider {
  private readonly fallback = new SimulatedCoachProvider()
  private readonly model = process.env.COACH_MODEL || DEFAULT_MODEL

  async reply(input: CoachReplyInput): Promise<CoachReply> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return this.fallback.reply(input)

    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          // OpenRouter attributes usage by these; both are optional.
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
          'X-Title': 'Fitness App Coach',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: MAX_TOKENS,
          messages: buildMessages(input),
        }),
      })

      if (!response.ok) {
        // Read the body for the reason: a 401 and a 429 both degrade to the
        // same scripted reply, and only the body says which happened.
        const detail = await response.text()
        throw new Error(`openrouter ${response.status}: ${detail.slice(0, 300)}`)
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: unknown } }[]
      }
      const text = firstText(payload.choices?.[0]?.message?.content)

      // A refusal or an empty completion leaves nothing useful to show, so the
      // simulated coach answers rather than the UI rendering a blank bubble.
      if (text.length === 0) return this.fallback.reply(input)
      return { text, degraded: false }
    } catch (error: unknown) {
      // Auth failures, rate limits and timeouts all land here. The user gets a
      // useful answer and `degraded` labels it, but the reason is logged —
      // otherwise a wrong key is indistinguishable from a working script.
      console.error('[coach] openrouter request failed', {
        model: this.model,
        error: error instanceof Error ? error.message : String(error),
      })
      return this.fallback.reply(input)
    }
  }
}
