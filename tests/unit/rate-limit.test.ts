import { describe, it, expect } from 'vitest'
import { RateLimiter } from '@/lib/rate-limit'

describe('RateLimiter', () => {
  it('allows requests up to the limit then blocks', () => {
    const rl = new RateLimiter({ limit: 3, windowMs: 60_000 })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(false)
  })

  it('tracks keys independently', () => {
    const rl = new RateLimiter({ limit: 1, windowMs: 60_000 })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('b')).toBe(true)
    expect(rl.check('a')).toBe(false)
  })

  it('allows again once the window has passed', () => {
    const rl = new RateLimiter({ limit: 1, windowMs: 1 })
    expect(rl.check('a')).toBe(true)
    return new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
      expect(rl.check('a')).toBe(true)
    })
  })
})
