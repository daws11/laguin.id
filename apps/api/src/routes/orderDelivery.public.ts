import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import path from 'node:path'

import { prisma } from '../lib/prisma'
import { getOrCreateSettings } from '../lib/settings'
import { normalizeWhatsappNumber } from '../lib/normalize'
import { addOrderEvent } from '../lib/events'
import { uploadBuffer } from '../lib/objectStorage'
import { triggerGenerationInBackground } from '../pipeline/triggerGeneration'

const ParamsSchema = z.object({ id: z.string().min(1) })
const VerifySchema = z.object({ phone: z.string().min(4) })
const RegenerationSchema = z.object({
  phone: z.string().min(4),
  revisionType: z.enum(['describe', 'lyrics', 'new_story']),
  description: z.string().max(2000).optional(),
  newLyrics: z.string().max(10000).optional(),
  musicStyle: z.string().max(100).optional(),
  voiceStyle: z.string().max(100).optional(),
})

const MAX_REGENERATIONS = 2

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

async function verifyOrderPhone(orderId: string, phone: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customer: { select: { id: true, whatsappNumber: true } },
    },
  })
  if (!order) return null

  const customerPhone = order.customer?.whatsappNumber ?? ''
  const inputPhone = normalizeWhatsappNumber(phone)
  if (!customerPhone || !inputPhone || customerPhone !== inputPhone) return null

  return order
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

    const payload = (order.inputPayload && typeof order.inputPayload === 'object' ? order.inputPayload : {}) as Record<string, any>

    const settings = await getOrCreateSettings()
    const psc = (settings.publicSiteConfig && typeof settings.publicSiteConfig === 'object' ? settings.publicSiteConfig : {}) as Record<string, any>
    const deliveryPageConfig = psc.deliveryPage ?? {}

    return {
      id: order.id,
      status: order.status,
      recipientName: payload.recipientName ?? payload.recipient ?? '',
      createdAt: order.createdAt,
      config: deliveryPageConfig,
    }
  })

  app.post('/public/order/:id/verify', async (req, reply) => {
    const params = ParamsSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const clientIp = req.ip ?? 'unknown'
    const rateLimitKey = `${clientIp}:${params.data.id}`
    if (!checkRateLimit(rateLimitKey)) {
      return reply.code(429).send({ error: 'too_many_attempts' })
    }

    const body = VerifySchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_body' })

    const verified = await verifyOrderPhone(params.data.id, body.data.phone)
    if (!verified) return reply.code(403).send({ error: 'phone_mismatch' })

    const allOrders = await prisma.order.findMany({
      where: { customerId: verified.customer!.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        inputPayload: true,
        lyricsText: true,
        trackUrl: true,
        trackMetadata: true,
        regenerationCount: true,
        testimonialVideos: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const orders = allOrders.map((o) => {
      const payload = (o.inputPayload && typeof o.inputPayload === 'object' ? o.inputPayload : {}) as Record<string, any>
      const meta = (o.trackMetadata && typeof o.trackMetadata === 'object' ? o.trackMetadata : {}) as Record<string, any>

      const kieTracks: string[] = Array.isArray(meta.tracks) ? meta.tracks.filter(Boolean) : o.trackUrl ? [o.trackUrl] : []
      const storedTracks: string[] = Array.isArray(meta.storedTracks) ? meta.storedTracks.filter(Boolean) : []
      const tracks = storedTracks.length > 0 ? storedTracks : kieTracks

      return {
        id: o.id,
        status: o.status,
        recipientName: payload.recipientName ?? payload.recipient ?? '',
        createdAt: o.createdAt,
        tracks,
        lyricsText: o.lyricsText ?? null,
        regenerationCount: o.regenerationCount,
        maxRegenerations: MAX_REGENERATIONS,
        hasTestimonial: o.testimonialVideos.length > 0,
        testimonialStatus: o.testimonialVideos[0]?.status ?? null,
      }
    })

    return { orders }
  })

  app.post('/public/order/:id/regenerate', async (req, reply) => {
    const params = ParamsSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const clientIp = req.ip ?? 'unknown'
    const rateLimitKey = `${clientIp}:regen:${params.data.id}`
    if (!checkRateLimit(rateLimitKey)) {
      return reply.code(429).send({ error: 'too_many_attempts' })
    }

    const body = RegenerationSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_body', details: body.error.flatten() })

    const verified = await verifyOrderPhone(params.data.id, body.data.phone)
    if (!verified) return reply.code(403).send({ error: 'phone_mismatch' })

    const order = await prisma.order.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        status: true,
        regenerationCount: true,
        inputPayload: true,
        lyricsText: true,
      },
    })

    if (!order) return reply.code(404).send({ error: 'not_found' })
    if (order.status !== 'completed') {
      return reply.code(400).send({ error: 'order_not_completed' })
    }
    if (order.regenerationCount >= MAX_REGENERATIONS) {
      return reply.code(400).send({ error: 'max_regenerations_reached' })
    }

    const currentPayload = (order.inputPayload && typeof order.inputPayload === 'object' ? order.inputPayload : {}) as Record<string, any>
    const updatedPayload = { ...currentPayload }

    if (body.data.revisionType === 'describe' && body.data.description) {
      updatedPayload.revisionDescription = body.data.description
    } else {
      delete updatedPayload.revisionDescription
    }

    if (body.data.musicStyle && body.data.musicStyle !== 'keep') {
      updatedPayload.musicPreferences = {
        ...(updatedPayload.musicPreferences ?? {}),
        genre: body.data.musicStyle,
      }
    }
    if (body.data.voiceStyle && body.data.voiceStyle !== 'keep') {
      updatedPayload.musicPreferences = {
        ...(updatedPayload.musicPreferences ?? {}),
        voiceStyle: body.data.voiceStyle.toLowerCase(),
      }
    }

    let newLyrics: string | null = null
    if (body.data.revisionType === 'lyrics' && body.data.newLyrics) {
      newLyrics = body.data.newLyrics
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'processing',
        regenerationCount: { increment: 1 },
        inputPayload: updatedPayload,
        ...(newLyrics ? { lyricsText: newLyrics } : {}),
        trackUrl: null,
        trackMetadata: null,
        generationStartedAt: null,
        generationCompletedAt: null,
        moodDescription: (body.data.revisionType === 'describe' || body.data.revisionType === 'new_story')
          ? null
          : undefined,
        ...(body.data.revisionType === 'new_story' ? { lyricsText: null } : {}),
      },
    })

    await addOrderEvent({
      orderId: order.id,
      type: 'regeneration_requested',
      message: `Revision #${order.regenerationCount + 1}: ${body.data.revisionType}`,
      data: {
        revisionType: body.data.revisionType,
        description: body.data.description,
        musicStyle: body.data.musicStyle,
        voiceStyle: body.data.voiceStyle,
        hasNewLyrics: !!body.data.newLyrics,
      } as any,
    })

    triggerGenerationInBackground(order.id, req.log as any)

    return {
      ok: true,
      regenerationCount: order.regenerationCount + 1,
      maxRegenerations: MAX_REGENERATIONS,
    }
  })

  app.post('/public/order/:id/testimonial', async (req, reply) => {
    const params = ParamsSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const clientIp = req.ip ?? 'unknown'
    const rateLimitKey = `${clientIp}:testi:${params.data.id}`
    if (!checkRateLimit(rateLimitKey)) {
      return reply.code(429).send({ error: 'too_many_attempts' })
    }

    const data = await (req as any).file?.()
    if (!data) return reply.code(400).send({ error: 'missing_file' })

    const phoneField = data.fields?.phone
    const phone = typeof phoneField?.value === 'string' ? phoneField.value : null
    if (!phone || phone.length < 4) {
      return reply.code(400).send({ error: 'missing_phone' })
    }

    const verified = await verifyOrderPhone(params.data.id, phone)
    if (!verified) return reply.code(403).send({ error: 'phone_mismatch' })

    const existing = await prisma.testimonialVideo.findFirst({
      where: { orderId: params.data.id },
    })
    if (existing) {
      return reply.code(400).send({ error: 'testimonial_already_uploaded' })
    }

    const mime = typeof data.mimetype === 'string' ? data.mimetype : ''
    if (!mime.startsWith('video/')) {
      return reply.code(400).send({ error: 'invalid_file_type' })
    }

    const ext = path.extname(data.filename ?? '').toLowerCase() || '.mp4'
    const stamp = Date.now()
    const rand = Math.random().toString(16).slice(2, 10)
    const filename = `${stamp}-${rand}${ext}`
    const objectKey = `testimonials/${params.data.id}/${filename}`

    const buf = await data.toBuffer()
    if (buf.length > 100 * 1024 * 1024) {
      return reply.code(400).send({ error: 'file_too_large' })
    }

    const publicPath = await uploadBuffer(objectKey, buf, mime || 'video/mp4')

    const video = await prisma.testimonialVideo.create({
      data: {
        orderId: params.data.id,
        videoUrl: publicPath,
        status: 'pending',
      },
    })

    await addOrderEvent({
      orderId: params.data.id,
      type: 'testimonial_uploaded',
      message: 'Customer uploaded a testimonial video',
      data: { videoId: video.id, videoUrl: publicPath } as any,
    })

    return { ok: true, videoId: video.id, status: 'pending' }
  })
}
