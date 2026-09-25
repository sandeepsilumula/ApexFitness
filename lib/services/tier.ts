import { ApiError } from '@/lib/http'
import type { SessionUser } from '@/lib/auth'

export function isPremium(user: Pick<SessionUser, 'subscriptionTier'>): boolean {
  return user.subscriptionTier === 'premium'
}

export function requirePremium(user: Pick<SessionUser, 'subscriptionTier'>): void {
  if (!isPremium(user)) {
    throw new ApiError('PREMIUM_REQUIRED', 'This feature requires a premium subscription', 403)
  }
}

export function canViewWorkout(
  user: Pick<SessionUser, 'subscriptionTier'>,
  workout: { isPremium: boolean },
): boolean {
  return !workout.isPremium || isPremium(user)
}

export function visibleDietPlans<T extends { isPremium: boolean }>(
  user: Pick<SessionUser, 'subscriptionTier'>,
  plans: T[],
): T[] {
  return plans.filter((plan) => !plan.isPremium || isPremium(user))
}
