import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'

const BCRYPT_COST = 12
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const SESSION_COOKIE = 'fitness_session'

export type SessionUser = {
  id: string
  email: string
  name: string
  goal: string | null
  subscriptionTier: string
  /** Null unless the account has been through Stripe checkout at least once. */
  stripeCustomerId: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(
  userId: string,
  expiresAt: Date = new Date(Date.now() + SESSION_TTL_MS),
): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await prisma.session.create({ data: { token, userId, expiresAt } })
  return token
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) return null

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    goal: session.user.goal,
    subscriptionTier: session.user.subscriptionTier,
    stripeCustomerId: session.user.stripeCustomerId,
  }
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } })
}

export function setSessionCookie(res: NextApiResponse, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`,
  )
}

export function clearSessionCookie(res: NextApiResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  )
}

export async function getCurrentUser(req: NextApiRequest): Promise<SessionUser | null> {
  const token = req.cookies?.[SESSION_COOKIE]
  if (typeof token !== 'string' || token.length === 0) return null
  return getSessionUser(token)
}
