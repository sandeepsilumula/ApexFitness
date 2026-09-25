import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { createMocks } from 'node-mocks-http'
import chatHandler from '@/pages/api/ai/chat'
import { prisma } from '@/lib/db'
import { createSession, SESSION_COOKIE } from '@/lib/auth'

// The misconfiguration case must not wait on a real network round trip to
// api.anthropic.com: the SDK always fails here, so the failure is reproduced
// locally and instantly. Tests without a key use the simulated provider,
// which never touches this mock.
vi.mock('@anthropic-ai/sdk', () => {
  function Anthropic() {
    return {
      messages: {
        create: vi.fn(async () => {
          throw new Error('401 invalid x-api-key')
        }),
      },
    }
  }
  return { default: Anthropic }
})

const FREE_EMAIL = 'chat-free@test.local'
const PREMIUM_EMAIL = 'chat-premium@test.local'

const dummyPasswordHash = '$2b$12$abcdefghijklmnopqrstuv'

let premiumUserId = ''

async function purgeFixtures(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { in: [FREE_EMAIL, PREMIUM_EMAIL] } } })
}

beforeEach(async () => {
  await purgeFixtures()
  await prisma.user.create({
    data: { email: FREE_EMAIL, passwordHash: dummyPasswordHash, name: 'Free Fay' },
  })
  const premium = await prisma.user.create({
    data: {
      email: PREMIUM_EMAIL,
      passwordHash: dummyPasswordHash,
      name: 'Premium Pia',
      subscriptionTier: 'premium',
    },
  })
  premiumUserId = premium.id
})

afterEach(async () => {
  // The misconfiguration test sets a bogus key; leaving it set would flip later
  // tests onto the live provider.
  delete process.env.ANTHROPIC_API_KEY
})

afterAll(async () => {
  await purgeFixtures()
})

async function sessionCookieFor(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } })
  return createSession(user.id)
}

async function ask(message: string, email = PREMIUM_EMAIL) {
  const token = await sessionCookieFor(email)
  const { req, res } = createMocks({
    method: 'POST',
    cookies: { [SESSION_COOKIE]: token },
    body: { message },
  })
  await chatHandler(req, res)
  return res
}

describe('POST /api/ai/chat', () => {
  it('rejects an anonymous request with 401', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { message: 'How do I start?' } })
    await chatHandler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })

  it('rejects a free user with 403 PREMIUM_REQUIRED', async () => {
    const res = await ask('How do I start?', FREE_EMAIL)
    expect(res._getStatusCode()).toBe(403)
    const body = res._getJSONData() as { error: { code: string } }
    expect(body.error.code).toBe('PREMIUM_REQUIRED')
  })

  it('persists both the user message and the assistant reply', async () => {
    const res = await ask('How should I structure my week?')
    expect(res._getStatusCode()).toBe(200)

    const body = res._getJSONData() as { ok: boolean; data: { reply: string } }
    expect(body.ok).toBe(true)
    expect(body.data.reply.length).toBeGreaterThan(0)

    const stored = await prisma.coachMessage.findMany({
      where: { userId: premiumUserId },
      orderBy: { createdAt: 'asc' },
    })
    expect(stored).toHaveLength(2)
    expect(stored[0]?.role).toBe('user')
    expect(stored[0]?.content).toBe('How should I structure my week?')
    expect(stored[1]?.role).toBe('assistant')
    expect(stored[1]?.content).toBe(body.data.reply)
  })

  it('returns a reply even when the live provider is misconfigured', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-definitely-not-a-valid-key'
    const res = await ask('What should I do this week?')

    expect(res._getStatusCode()).toBe(200)
    const body = res._getJSONData() as { ok: boolean; data: { reply: string; degraded: boolean } }
    expect(body.ok).toBe(true)
    expect(body.data.reply.length).toBeGreaterThan(0)
  })

  it('flags a fallback reply as degraded so the UI can label it', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await ask('What should I do this week?')

    const body = res._getJSONData() as { data: { degraded: boolean } }
    expect(body.data.degraded).toBe(true)
  })

  it('gives two different questions two different answers', async () => {
    const first = await ask('hi')
    const second = await ask('need a diet plan')

    const a = (first._getJSONData() as { data: { reply: string } }).data.reply
    const b = (second._getJSONData() as { data: { reply: string } }).data.reply
    expect(a).not.toBe(b)
  })

  it('rejects an empty message with 400', async () => {
    const res = await ask('')
    expect(res._getStatusCode()).toBe(400)
  })

  it('rejects a non-POST method with 405', async () => {
    const token = await sessionCookieFor(PREMIUM_EMAIL)
    const { req, res } = createMocks({ method: 'GET', cookies: { [SESSION_COOKIE]: token } })
    await chatHandler(req, res)
    expect(res._getStatusCode()).toBe(405)
  })

  it('replays prior turns as history', async () => {
    await ask('First question about cutting')
    await ask('Follow-up about protein')

    const stored = await prisma.coachMessage.findMany({
      where: { userId: premiumUserId },
      orderBy: { createdAt: 'asc' },
    })
    expect(stored).toHaveLength(4)
    expect(stored.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
  })

  it('never accepts a userId from the request body', async () => {
    const other = await prisma.user.create({
      data: { email: 'chat-intruder@test.local', passwordHash: dummyPasswordHash, name: 'Ida' },
    })
    try {
      const token = await sessionCookieFor(PREMIUM_EMAIL)
      const { req, res } = createMocks({
        method: 'POST',
        cookies: { [SESSION_COOKIE]: token },
        body: { message: 'Hello', userId: other.id },
      })
      await chatHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(await prisma.coachMessage.count({ where: { userId: other.id } })).toBe(0)
      expect(await prisma.coachMessage.count({ where: { userId: premiumUserId } })).toBe(2)
    } finally {
      await prisma.user.delete({ where: { id: other.id } })
    }
  })
})
