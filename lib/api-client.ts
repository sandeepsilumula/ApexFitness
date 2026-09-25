import { ApiError } from '@/lib/http'

export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError('NETWORK', 'Could not reach the server', 0)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ApiError('BAD_RESPONSE', 'Unexpected server response', response.status)
  }

  if (!response.ok || (body as any)?.ok === false) {
    const err = (body as any)?.error
    throw new ApiError(
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Something went wrong',
      response.status,
    )
  }

  return (body as any).data as T
}