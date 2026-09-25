import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/db'

describe('prisma client', () => {
  it('connects and queries User', async () => {
    const count = await prisma.user.count()
    expect(typeof count).toBe('number')
  })

  it('creates and cascades a session', async () => {
    const user = await prisma.user.create({
      data: { email: 'cascade@test.local', passwordHash: 'x', name: 'Cascade' },
    })
    await prisma.session.create({
      data: { token: 'cascade-token', userId: user.id, expiresAt: new Date(Date.now() + 1000) },
    })
    await prisma.user.delete({ where: { id: user.id } })
    const sessions = await prisma.session.count({ where: { userId: user.id } })
    expect(sessions).toBe(0)
  })
})
