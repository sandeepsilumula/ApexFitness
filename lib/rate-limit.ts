interface Options {
  limit: number
  windowMs: number
}

interface Bucket {
  count: number
  resetAt: number
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>()

  constructor(private readonly options: Options) {}

  check(key: string): boolean {
    const now = Date.now()
    const existing = this.buckets.get(key)

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.options.windowMs })
      return true
    }

    if (existing.count >= this.options.limit) return false

    existing.count += 1
    return true
  }
}
