import type { CoachContext } from '@/lib/services/coach/context'

export interface CoachHistoryEntry {
  role: 'user' | 'assistant'
  content: string
}

export interface CoachReplyInput {
  message: string
  context: CoachContext
  history?: CoachHistoryEntry[]
}

/**
 * `degraded` is true when the answer did not come from the model — either no key
 * is configured, or the live call failed and fell back. The UI must say so,
 * because a scripted answer is indistinguishable from a real one otherwise and
 * a broken coach looks like a working one.
 */
export interface CoachReply {
  text: string
  degraded: boolean
}

export interface CoachProvider {
  reply(input: CoachReplyInput): Promise<CoachReply>
}
