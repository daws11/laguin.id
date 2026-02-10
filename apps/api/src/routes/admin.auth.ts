import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const LoginBodySchema = z.object({
  password: z.string().min(1),
})

export const adminAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (req, reply) => {
    const parsed = LoginBodySchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body' })

    const expected = process.env.ADMIN_PASSWORD
    if (!expected) {
      return reply.code(500).send({ error: 'admin_password_not_configured' })
    }

    if (parsed.data.password !== expected) {
      return reply.code(401).send({ error: 'invalid_credentials' })
    }

    const token = await reply.jwtSign({ role: 'admin' }, { expiresIn: '12h' })
    return { token }
  })
}

