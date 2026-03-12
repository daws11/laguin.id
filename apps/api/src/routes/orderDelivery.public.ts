import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'
import { getOrCreateSettings } from '../lib/settings'
import { normalizeWhatsappNumber } from '../lib/normalize'

const ParamsSchema = z.object({ id: z.string().min(1) })
const VerifySchema = z.object({ phone: z.string().min(4) })

const verifyAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = verifyAttempts.get(key)
  if (!entry || now > entry.resetAt) {
    verifyAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}

export const orderDeliveryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/public/order/:id/status', async (req, reply) => {
    const params = ParamsSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const order = await prisma.order.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        inputPayload: true,
      },
    })

    if (!order) return reply.code(404).send({ error: 'not_found' })

    const ip = (order.inputPayload && typeof order.inputPayload === 'object' ? order.inputPayload : {}) as Record<string, any>

    const settings = await getOrCreateSettings()
    const psc = (settings.publicSiteConfig && typeof settings.publicSiteConfig === 'object' ? settings.publicSiteConfig : {}) as Record<string, any>
    const deliveryPageConfig = psc.deliveryPage ?? {}

    return {
      id: order.id,
      status: order.status,
      recipientName: ip.recipientName ?? ip.recipient ?? '',
      createdAt: order.createdAt,
      config: deliveryPageConfig,
    }
  })

  app.post('/public/order/:id/verify', async (req, reply) => {
    const params = ParamsSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const ip = req.ip ?? 'unknown'
    const rateLimitKey = `${ip}:${params.data.id}`
    if (!checkRateLimit(rateLimitKey)) {
      return reply.code(429).send({ error: 'too_many_attempts' })
    }

    const body = VerifySchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_body' })

    const order = await prisma.order.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        inputPayload: true,
        lyricsText: true,
        trackUrl: true,
        trackMetadata: true,
        customer: { select: { whatsappNumber: true } },
      },
    })

    if (!order) return reply.code(404).send({ error: 'not_found' })

    const customerPhone = order.customer?.whatsappNumber ?? ''
    const inputPhone = normalizeWhatsappNumber(body.data.phone)

    if (!customerPhone || !inputPhone || customerPhone !== inputPhone) {
      return reply.code(403).send({ error: 'phone_mismatch' })
    }

    const ip = (order.inputPayload && typeof order.inputPayload === 'object' ? order.inputPayload : {}) as Record<string, any>
    const meta = (order.trackMetadata && typeof order.trackMetadata === 'object' ? order.trackMetadata : {}) as Record<string, any>

    const kieTracks: string[] = Array.isArray(meta.tracks) ? meta.tracks.filter(Boolean) : order.trackUrl ? [order.trackUrl] : []
    const storedTracks: string[] = Array.isArray(meta.storedTracks) ? meta.storedTracks.filter(Boolean) : []
    const tracks = storedTracks.length > 0 ? storedTracks : kieTracks

    return {
      id: order.id,
      status: order.status,
      recipientName: ip.recipientName ?? ip.recipient ?? '',
      createdAt: order.createdAt,
      tracks,
      lyricsText: order.lyricsText ?? null,
    }
  })
}
