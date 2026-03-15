import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { verifyPassword } from '../lib/password'

const LoginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export const adminAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (req, reply) => {
    const parsed = LoginBodySchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body' })

    const user = await prisma.adminUser.findUnique({
      where: { username: parsed.data.username },
    })
    if (!user) return reply.code(401).send({ error: 'invalid_credentials' })

    const valid = await verifyPassword(parsed.data.password, user.passwordHash)
    if (!valid) return reply.code(401).send({ error: 'invalid_credentials' })

    const token = await reply.jwtSign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      },
      { expiresIn: '12h' },
    )
    return { token }
  })

  app.get('/me', async (req, reply) => {
    try {
      await req.jwtVerify()
    } catch {
      return reply.code(401).send({ error: 'unauthorized' })
    }
    const { userId, username, role, permissions } = (req as any).user
    return { userId, username, role, permissions }
  })
}
