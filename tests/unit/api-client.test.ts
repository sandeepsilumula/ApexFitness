import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/lib/http'

type MockedFetch = ReturnType<typeof vi.fn>

global.fetch = vi.fn() as unknown as typeof fetch

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as Promise<Response>
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('apiFetch', () => {
  it('unwraps a success envelope', async () => {
    ;(global.fetch as MockedFetch).mockResolvedValue(jsonResponse({ ok: true, data: { id: 7 } }))
    await expect(apiFetch('/api/workouts')).resolves.toEqual({ id: 7 })
  })

  it('throws ApiError with the server message on failure', async () => {
    ;(global.fetch as MockedFetch).mockResolvedValue(jsonResponse({ ok: false, error: { code: 'PREMIUM_REQUIRED', message: 'Upgrade to continue' } }, 403))
    await expect(apiFetch('/api/ai/chat')).rejects.toThrow('Upgrade to continue')
  })

  it('throws on a non-2xx response even without a valid envelope', async () => {
    ;(global.fetch as MockedFetch).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response)
    await expect(apiFetch('/api/workouts')).rejects.toThrow()
  })

  it('maps a transport failure to a NETWORK ApiError with status 0', async () => {
    ;(global.fetch as MockedFetch).mockRejectedValue(new Error('socket hang up'))

    const error = await apiFetch('/api/workouts').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('NETWORK')
    expect((error as ApiError).status).toBe(0)
    expect((error as ApiError).message).toBe('Could not reach the server')
  })

  it('maps an unparseable body to a BAD_RESPONSE ApiError', async () => {
    ;(global.fetch as MockedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    } as Response)

    const error = await apiFetch('/api/workouts').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('BAD_RESPONSE')
    expect((error as ApiError).status).toBe(200)
  })

  it('falls back to UNKNOWN when a failing envelope carries no error details', async () => {
    ;(global.fetch as MockedFetch).mockResolvedValue(jsonResponse({ ok: false }, 500))

    const error = await apiFetch('/api/workouts').catch((e: unknown) => e)

    expect((error as ApiError).code).toBe('UNKNOWN')
    expect((error as ApiError).message).toBe('Something went wrong')
  })

  it('treats a 200 response whose envelope reports failure as an error', async () => {
    ;(global.fetch as MockedFetch).mockResolvedValue(
      jsonResponse({ ok: false, error: { code: 'VALIDATION', message: 'Bad input' } }, 200),
    )

    const error = await apiFetch('/api/workouts', { method: 'POST', body: '{}' }).catch((e: unknown) => e)

    expect((error as ApiError).code).toBe('VALIDATION')
    expect((error as ApiError).message).toBe('Bad input')
  })

  it('merges caller headers over the default content type', async () => {
    ;(global.fetch as MockedFetch).mockResolvedValue(jsonResponse({ ok: true, data: null }))

    await apiFetch('/api/workouts', { headers: { 'Content-Type': 'text/plain', 'X-Trace': 'abc' } })

    const init = (global.fetch as MockedFetch).mock.calls[0][1] as RequestInit
    expect(init.headers).toMatchObject({ 'Content-Type': 'text/plain', 'X-Trace': 'abc' })
  })
})
