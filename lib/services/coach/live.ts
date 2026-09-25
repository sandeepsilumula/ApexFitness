import Anthropic from '@anthropic-ai/sdk'
import type { CoachContext } from '@/lib/services/coach/context'
import { SimulatedCoachProvider } from '@/lib/services/coach/simulated'
import type { CoachProvider, CoachReply, CoachReplyInput } from '@/lib/services/coach/types'

const MODEL_ID = 'claude-opus-5'
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
 * reads it as a training summary, and the stable shape keeps the cached prefix
 * intact when only the numbers change.
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

function buildMessages(input: CoachReplyInput): Anthropic.MessageParam[] {
  const history = (input.history ?? []).slice(-HISTORY_TURNS)

  // The API is stateless, so prior turns are replayed before the new question.
  const historyParams = history
    .filter((entry) => entry.role === 'user' || entry.role === 'assistant')
    .map((entry) => ({ role: entry.role, content: entry.content }))

  return [
    ...historyParams,
    {
      role: 'user' as const,
      content: `<training_summary>\n${summariseContext(input.context)}\n</training_summary>\n\n${input.message}`,
    },
  ]
}

function firstTextBlock(response: Anthropic.Message): string {
  const block = response.content.find((entry) => entry.type === 'text')
  return block && block.type === 'text' ? block.text.trim() : ''
}

export class LiveCoachProvider implements CoachProvider {
  private readonly fallback = new SimulatedCoachProvider()
  // Held so a failure can close the client and release its connection pool.
  private client: Anthropic | null = null

  private getClient(): Anthropic {
    this.client ??= new Anthropic({
      maxRetries: 1,
      timeout: REQUEST_TIMEOUT_MS,
    })
    return this.client
  }

  /**
   * Drops the client so a failed instance is not reused. The SDK keeps a
   * connection pool alive, and holding a client that failed on a bad key or an
   * unreachable API would keep the process from exiting.
   */
  private discardClient(): void {
    this.client = null
  }

  async reply(input: CoachReplyInput): Promise<CoachReply> {
    try {
      const response = await this.getClient().messages.create({
        model: MODEL_ID,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            // The instruction block is identical on every request, so it is the
            // stable prefix worth caching; the summary and the question vary.
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: buildMessages(input),
      })

      const text = firstTextBlock(response)
      // A refusal or an empty completion leaves nothing useful to show, so the
      // simulated coach answers rather than the UI rendering a blank bubble.
      if (text.length === 0) return this.fallback.reply(input)
      return { text, degraded: false }
    } catch {
      // Network errors, auth failures, rate limits and timeouts all land here.
      // The user gets a useful answer instead of a raw SDK error message, and
      // `degraded` tells the UI to label it as a fallback rather than the coach.
      this.discardClient()
      return this.fallback.reply(input)
    }
  }
}
