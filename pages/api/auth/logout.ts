import type { NextApiRequest, NextApiResponse } from 'next'
import { SESSION_COOKIE, revokeSession, clearSessionCookie } from '@/lib/auth'
import { ok, fail } from '@/lib/http'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use POST'))

  const token = req.cookies?.[SESSION_COOKIE]
  if (typeof token === 'string' && token.length > 0) {
    await revokeSession(token)
  }

  clearSessionCookie(res)
  return res.status(200).json(ok({ loggedOut: true }))
}
