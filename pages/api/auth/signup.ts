import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import { signupSchema } from '@/lib/validation/schemas'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth'
import { ok, fail } from '@/lib/http'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use POST'))

  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json(fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input'))
  }

  const { email, password, name } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) return res.status(409).json(fail('EMAIL_TAKEN', 'That email is already registered'))

  const user = await prisma.user.create({
    data: { email: normalizedEmail, name, passwordHash: await hashPassword(password) },
  })

  const token = await createSession(user.id)
  setSessionCookie(res, token)

  return res.status(200).json(ok({ id: user.id, email: user.email, name: user.name }))
}
