import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import {
  hashPassword,
  verifyPassword,
  createSession,
  getSessionUser,
  revokeSession,
  getCurrentUser,
  setSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE,
} from '@/lib/auth'

let userId: string

beforeEach(async () => {
  const user = await prisma.user.create({
    data: { email: `auth-${Date.now()}@test.local`, passwordHash: 'x', name: 'Auth' },
  })
  userId = user.id
})

afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: userId } })
})

describe('password hashing', () => {
  it('produces a hash that verifies', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash).not.toContain('correct horse')
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false)
  })

  it('salts, so the same password hashes differently each time', async () => {
    const a = await hashPassword('same')
    const b = await hashPassword('same')
    expect(a).not.toBe(b)
  })
})

describe('sessions', () => {
  it('creates a session and resolves it back to the user', async () => {
    const token = await createSession(userId)
    const user = await getSessionUser(token)
    expect(user?.id).toBe(userId)
  })

  it('rejects an unknown token', async () => {
    expect(await getSessionUser('not-a-real-token')).toBeNull()
  })

  it('rejects an expired session', async () => {
    const token = await createSession(userId, new Date(Date.now() - 1000))
    expect(await getSessionUser(token)).toBeNull()
  })

  it('revocation invalidates the token immediately', async () => {
    const token = await createSession(userId)
    await revokeSession(token)
    expect(await getSessionUser(token)).toBeNull()
  })
})

describe('cookie helpers', () => {
  function mockRes() {
    const headers: Record<string, string> = {}
    return {
      res: { setHeader: (k: string, v: string) => { headers[k] = v } } as never,
      headers,
    }
  }

  it('sets an HttpOnly, SameSite cookie without Secure outside production', async () => {
    // Next types process.env.NODE_ENV as read-only, so the value is swapped
    // through vi.stubEnv rather than assigned directly.
    vi.stubEnv('NODE_ENV', 'test')
    try {
      const { res, headers } = mockRes()
      const token = await createSession(userId)
      setSessionCookie(res, token)

      const cookie = headers['Set-Cookie']!
      expect(cookie).toContain(`${SESSION_COOKIE}=${token}`)
      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('SameSite=Lax')
      expect(cookie).not.toContain('Secure')
    } finally {
      vi.unstubAllEnvs()
      await prisma.user.deleteMany({ where: { id: userId } })
    }
  })

  it('marks the cookie Secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const { res, headers } = mockRes()
      setSessionCookie(res, 'tok')
      expect(headers['Set-Cookie']).toContain('Secure')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('clears the cookie by expiring it immediately', () => {
    const { res, headers } = mockRes()
    clearSessionCookie(res)

    const cookie = headers['Set-Cookie']!
    expect(cookie).toContain(`${SESSION_COOKIE}=;`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Max-Age=0')
  })
})

describe('getCurrentUser', () => {
  it('returns the session user for a valid cookie', async () => {
    const token = await createSession(userId)
    const user = await getCurrentUser({ cookies: { [SESSION_COOKIE]: token } } as never)
    expect(user?.id).toBe(userId)
  })

  it('returns null when no cookie is present', async () => {
    expect(await getCurrentUser({ cookies: {} } as never)).toBeNull()
  })

  it('returns null for an empty cookie value', async () => {
    expect(await getCurrentUser({ cookies: { [SESSION_COOKIE]: '' } } as never)).toBeNull()
  })

  it('returns null for a non-string cookie value', async () => {
    expect(await getCurrentUser({ cookies: { [SESSION_COOKIE]: ['a', 'b'] } } as never)).toBeNull()
  })
})
