import { describe, it, expect } from 'vitest'
import { ok, fail } from '@/lib/http'

describe('response envelope', () => {
  it('wraps success data', () => {
    expect(ok({ id: 1 })).toEqual({ ok: true, data: { id: 1 } })
  })

  it('wraps errors with a code and message', () => {
    expect(fail('NOT_FOUND', 'Workout not found')).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Workout not found' },
    })
  })

  it('never leaks a stack trace', () => {
    const body = JSON.stringify(fail('INTERNAL', 'Something broke'))
    expect(body).not.toContain('at ')
    expect(body).not.toContain('.ts')
  })
})
