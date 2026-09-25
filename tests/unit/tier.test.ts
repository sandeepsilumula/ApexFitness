import { describe, it, expect } from 'vitest'
import { isPremium, canViewWorkout, visibleDietPlans } from '@/lib/services/tier'

const free = { id: '1', email: 'f@t.local', name: 'F', goal: null, subscriptionTier: 'free' }
const premium = { ...free, id: '2', subscriptionTier: 'premium' }

describe('tier gating', () => {
  it('identifies premium users', () => {
    expect(isPremium(free)).toBe(false)
    expect(isPremium(premium)).toBe(true)
  })

  it('lets a free user view a free workout but not a premium one', () => {
    expect(canViewWorkout(free, { isPremium: false })).toBe(true)
    expect(canViewWorkout(free, { isPremium: true })).toBe(false)
  })

  it('lets a premium user view both', () => {
    expect(canViewWorkout(premium, { isPremium: true })).toBe(true)
  })

  it('hides premium plans from free users but keeps them visible to premium users', () => {
    const plans = [
      { id: '1', isPremium: false },
      { id: '2', isPremium: true },
      { id: '3', isPremium: true },
    ]
    expect(visibleDietPlans(free, plans).map((p) => p.id)).toEqual(['1'])
    expect(visibleDietPlans(premium, plans).map((p) => p.id)).toEqual(['1', '2', '3'])
  })
})
