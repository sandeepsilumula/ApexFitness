import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import { loginSchema } from '@/lib/validation/schemas'
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth'
import { ok, fail } from '@/lib/http'

// Identical for "no such user" and "wrong password" so this endpoint cannot be
// used to enumerate which emails are registered.
const INVALID_CREDENTIALS = 'Invalid email or password'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use POST'))

  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json(fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input'))
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json(fail('INVALID_CREDENTIALS', INVALID_CREDENTIALS))
  }

  const token = await createSession(user.id)
  setSessionCookie(res, token)

  return res
    .status(200)
    .json(ok({ id: user.id, email: user.email, name: user.name, subscriptionTier: user.subscriptionTier }))
}
