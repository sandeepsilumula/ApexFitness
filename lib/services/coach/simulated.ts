import type { CoachContext } from '@/lib/services/coach/context'
import type { CoachProvider, CoachReply, CoachReplyInput } from '@/lib/services/coach/types'

/** Below this much logged work, a beginner is better served by consistency than intensity. */
const LOW_VOLUME_SETS = 20

function describeWeight(context: CoachContext): string {
  if (context.latestWeightKg === null) return 'no weight recorded yet'

  const weight = `${context.latestWeightKg} kg`
  switch (context.weightTrend) {
    case 'down':
      return `down to ${weight} from your starting point`
    case 'up':
      return `up to ${weight}`
    case 'stable':
      return `holding steady at ${weight}`
    default:
      return `at ${weight}, with not enough readings yet to call a trend`
  }
}

function buildProgressReply(context: CoachContext): string {
  const recent =
    context.recentWorkoutTitles.length > 0
      ? ` Your recent work includes ${context.recentWorkoutTitles.slice(0, 3).join(', ')}.`
      : ''

  return (
    `You are ${describeWeight(context)} across ${context.workoutCount} logged workout(s), ` +
    `with ${context.totalSets} sets and ${Math.round(context.totalVolumeKg).toLocaleString('en-GB')} kg ` +
    `of total volume. ${context.weeklyWorkoutCount} of those fell in the last seven days, ` +
    `which is ${context.weeklyWorkoutCount >= 3 ? 'a solid weekly cadence' : 'a light week — one more session would help'}.` +
    recent +
    ' Keep the cadence consistent before changing anything else.'
  )
}

function buildContextReply(context: CoachContext): string {
  const { userName } = context

  if (context.workoutCount === 0) {
    return (
      `Welcome, ${userName}. You have not logged a workout yet, so start there — ` +
      'pick the shortest session in the library, do it once end to end, and log it. ' +
      'The habit of finishing one session matters far more this week than intensity.'
    )
  }

  if (context.goal === 'cut' && context.weightTrend === 'up') {
    return (
      `Your weight is ${describeWeight(context)}, which runs against your cut goal. ` +
      'Before adding training volume, check protein intake and total calories: aim for ' +
      '1.6–2.2 g of protein per kilo of bodyweight, then trim 200–300 kcal rather than ' +
      'cutting harder. If the trend holds for another week, reduce carbs around training ' +
      'rather than dropping the session itself.'
    )
  }

  if (context.totalSets < LOW_VOLUME_SETS) {
    return (
      `${userName}, you have logged ${context.workoutCount} workout(s) and ` +
      `${context.totalSets} set(s) in total. That is a low volume floor rather than a ` +
      'problem. Add one set per exercise, or a second weekly session, and let progressive ' +
      'overload do the rest — hold the movements and add reps or load before adding exercises.'
    )
  }

  return buildProgressReply(context)
}

// --- intent routing ---------------------------------------------------------
//
// The context branches above already answer progress and volume questions well,
// so routing only intercepts topics the context summary cannot serve: greetings,
// nutrition and anything health-related. Everything else falls through to the
// context reply, which is the pre-existing behaviour.

/**
 * Matched anywhere, not just at the start: "how are you" is a greeting, and an
 * anchored pattern let it fall through to the no-logs welcome, which reads as
 * the coach ignoring the turn. `how(?: s)? it going` covers the apostrophe form
 * too — normalise() strips punctuation, so "how's it going" arrives as
 * "how s it going".
 */
const GREETING = /\b(hi|hey|hello|yo|sup|howdy|howdy there|how are you|how(?: s)? it going|good (morning|afternoon|evening))\b/
/**
 * Continuations and acknowledgements. These carry no topic, so falling through
 * to the context summary makes the coach look like it restarted the
 * conversation — a bare "proceed" after a diet question would be answered with
 * the no-logs welcome instead. Anchored at both ends on purpose: an
 * acknowledgement is only topicless if it is the *whole* message, and `^ok\b`
 * would otherwise swallow "ok and what about protein?".
 */
const CONTINUATION = /^(ok(ay)?|k|kk|sure|yes|yeah|yep|thanks|thank you|ta|cheers|proceed|go on|go ahead|continue|next|and|why|really|hmm+|cool|nice|great|perfect|done)[?.!]*$/
/** `diet|dite` also catches the common "dite" typo, which the context-only
    coach answered as a progress question. */
const NUTRITION = /\b(diet|dite|diets|nutrition|nutritional|meal|meals|macros?|calorie|calories|protein|carbs?|fats?|eat|eating|food|keto|supplement|bulk|bulking|cut|cutting|lean)\b/
const HEALTH = /\b(injur\w*|pain|hurt|hurts|aching|sore|swelling|bleeding|dizzy|dizziness|numb\w*|tingl\w*|doctor|medical|physio\w*|hernia|tear|strain|sprain)\b/

function normalise(message: string): string {
  return message.toLowerCase().replace(/[^a-z0-9\s?]/g, ' ').replace(/\s+/g, ' ').trim()
}

function greetingReply(context: CoachContext): string {
  const logged = context.workoutCount > 0
  const summary = logged
    ? `You have ${context.workoutCount} logged workout(s) and ${context.totalSets} sets behind you, ` +
      `${describeWeight(context)}.`
    : 'You have not logged a workout yet, so the shortest session in the library is the place to start.'

  return (
    `Hello, ${context.userName}. ${summary} ` +
    'Ask me about your training, your diet plan, or how your week is going — ' +
    'I answer from your logged sessions, volume and weight trend.'
  )
}

function nutritionReply(context: CoachContext): string {
  const weight = context.latestWeightKg
  // Protein is the one target that is worth stating as a number, and it needs a
  // bodyweight to be meaningful.
  const protein =
    weight === null
      ? 'Record your bodyweight on the progress page and I can turn this into a real gram target.'
      : `At ${weight} kg that is ${Math.round(weight * 1.8)} g of protein a day as a starting point, ` +
        `spread across three or four meals rather than one.`

  const goalAdvice =
    context.goal === 'cut'
      ? 'For a cut, hold protein fixed and trim 200–300 kcal, mostly from carbohydrates around training.'
      : context.goal === 'build'
        ? 'For a build, add 200–300 kcal and keep protein the same — the surplus should come from carbs and fats, not more protein.'
        : 'Keeping bodyweight steady, your calorie target sits near maintenance — watch the weekly weight trend and adjust from there.'

  return (
    `On nutrition: ${protein} ${goalAdvice} ` +
    'The app has full diet plans on the Nutrition page, broken down from breakfast through dinner with every swap listed, so start there and use this to adjust the numbers.'
  )
}

function healthReply(context: CoachContext): string {
  return (
    'Stop there — pain and injury are not something I should coach you through. ' +
    'A sharp pain, swelling, numbness or loss of strength needs a doctor or a physiotherapist ' +
    'before you train again, and I am not able to diagnose anything. ' +
    `In the meantime, ${context.userName}, drop the movement that hurts and keep training the rest.`
  )
}

function continuationReply(context: CoachContext): string {
  return (
    `I am not sure what you would like me to go on with, ${context.userName}. ` +
    'Ask about your training, your diet plan, or how your week is going, and I will take it from there.'
  )
}

function buildIntentReply(message: string, context: CoachContext): string | null {
  const text = normalise(message)
  // Safety outranks every other topic: an injury question must never be
  // answered with a training or nutrition suggestion, however the rest reads.
  if (HEALTH.test(text)) return healthReply(context)
  // Nutrition outranks greeting: GREETING is un-anchored, so "hi, how much
  // protein?" carries a greeting keyword and would otherwise answer the
  // pleasantry and drop the actual question.
  if (NUTRITION.test(text)) return nutritionReply(context)
  if (GREETING.test(text)) return greetingReply(context)
  // Checked after health and nutrition so a real question that merely opens
  // with an acknowledgement still reaches its topic. CONTINUATION is anchored
  // at both ends, so "ok and what about protein?" cannot be swallowed here.
  if (CONTINUATION.test(text)) return continuationReply(context)
  return null
}

export class SimulatedCoachProvider implements CoachProvider {
  async reply(input: CoachReplyInput): Promise<CoachReply> {
    // The message is what the user actually asked. Reading only the context
    // made every question return the same paragraph, which reads as a broken
    // coach rather than a limited one.
    const text = buildIntentReply(input.message, input.context) ?? buildContextReply(input.context)
    return { text, degraded: true }
  }
}
