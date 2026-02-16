import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'

const TrackSchema = z.object({
  path: z.string().min(1).max(2048),
  sessionId: z.string().min(1).max(128),
})

export const trackingRoutes: FastifyPluginAsync = async (app) => {
  app.post('/public/track', async (req, reply) => {
    const parsed = TrackSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body' })
    }

    const { path, sessionId } = parsed.data

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
    const existing = await prisma.pageView.findFirst({
      where: {
        sessionId,
        path,
        createdAt: { gte: thirtyMinAgo },
      },
      select: { id: true },
    })

    if (existing) {
      return { ok: true, deduplicated: true }
    }

    await prisma.pageView.create({
      data: { path, sessionId },
    })

    return { ok: true }
  })
}
