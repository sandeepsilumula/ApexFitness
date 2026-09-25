import type { NextApiRequest, NextApiResponse } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { ok, fail } from '@/lib/http'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use GET'))

  const user = await getCurrentUser(req)
  if (!user) return res.status(401).json(fail('UNAUTHORIZED', 'Not signed in'))

  return res.status(200).json(ok(user))
}
