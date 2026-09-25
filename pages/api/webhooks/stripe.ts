import type { NextApiRequest, NextApiResponse } from 'next'
import { fail } from '@/lib/http'
import { prisma } from '@/lib/db'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString('utf8')
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function getStripeSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Use POST'))

  const secret = getStripeSecret()
  if (!secret) {
    return res.status(400).json(fail('WEBHOOK_SECRET_MISSING', 'Webhook verification is not configured'))
  }

  const signature = req.headers['stripe-signature']
  if (typeof signature !== 'string') {
    return res.status(400).json(fail('MISSING_SIGNATURE', 'No Stripe signature header'))
  }

  const rawBody = await readRawBody(req)

  let event
  try {
    const Stripe = (await import('stripe')).default
    const client = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')
    event = client.webhooks.constructEvent(rawBody, signature, secret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return res.status(400).json(fail('INVALID_SIGNATURE', 'Webhook signature verification failed'))
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.userId
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionTier: 'premium' },
      })
    }
  }

  return res.status(200).json({ received: true })
}