import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import signupHandler from '@/pages/api/auth/signup'
import loginHandler from '@/pages/api/auth/login'
import meHandler from '@/pages/api/auth/me'
import { prisma } from '@/lib/db'

const email = 'signup@test.local'

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email } })
})

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email } })
})

describe('POST /api/auth/signup', () => {
  it('creates a user and returns 200', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { email, password: 'password123', name: 'Sam' },
    })
    await signupHandler(req, res)
    expect(res._getStatusCode()).toBe(200)
    const users = await prisma.user.count({ where: { email } })
    expect(users).toBe(1)
  })

  it('never returns the password hash', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { email, password: 'password123', name: 'Sam' },
    })
    await signupHandler(req, res)
    const body = JSON.stringify(res._getJSONData())
    expect(body).not.toContain('$2')
    expect(body).not.toContain('passwordHash')
  })

  it('rejects a duplicate email with 409', async () => {
    const first = createMocks({ method: 'POST', body: { email, password: 'password123', name: 'Sam' } })
    await signupHandler(first.req, first.res)
    const second = createMocks({ method: 'POST', body: { email, password: 'password123', name: 'Sam' } })
    await signupHandler(second.req, second.res)
    expect(second.res._getStatusCode()).toBe(409)
  })

  it('rejects a short password with 400', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { email, password: 'short', name: 'Sam' } })
    await signupHandler(req, res)
    expect(res._getStatusCode()).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('rejects wrong credentials with 401', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { email, password: 'nope' } })
    await loginHandler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('returns 401 without a session cookie', async () => {
    const { req, res } = createMocks({ method: 'GET' })
    await meHandler(req, res)
    expect(res._getStatusCode()).toBe(401)
  })
})
