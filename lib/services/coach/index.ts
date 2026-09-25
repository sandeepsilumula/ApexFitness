import { LiveCoachProvider } from '@/lib/services/coach/live'
import { OpenRouterCoachProvider } from '@/lib/services/coach/openrouter'
import { SimulatedCoachProvider } from '@/lib/services/coach/simulated'
import type { CoachProvider } from '@/lib/services/coach/types'

export type { CoachHistoryEntry, CoachProvider, CoachReply, CoachReplyInput } from '@/lib/services/coach/types'
export { LiveCoachProvider } from '@/lib/services/coach/live'
export { OpenRouterCoachProvider } from '@/lib/services/coach/openrouter'
export { SimulatedCoachProvider } from '@/lib/services/coach/simulated'

/**
 * Resolved per call rather than at module load, so a test or a dev server can
 * toggle the key without restarting the process. With no key set the app still
 * answers — the simulated coach is a real implementation, not a stub.
 *
 * OpenRouter is checked first so an open-model key takes precedence; the
 * Anthropic provider stays available for anyone who prefers it.
 */
export function getCoachProvider(): CoachProvider {
  if (process.env.OPENROUTER_API_KEY) return new OpenRouterCoachProvider()
  if (process.env.ANTHROPIC_API_KEY) return new LiveCoachProvider()
  return new SimulatedCoachProvider()
}
