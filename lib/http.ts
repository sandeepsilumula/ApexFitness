export type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

export function ok<T>(data: T): Envelope<T> {
  return { ok: true, data }
}

export function fail(code: string, message: string): Envelope<never> {
  return { ok: false, error: { code, message } }
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
