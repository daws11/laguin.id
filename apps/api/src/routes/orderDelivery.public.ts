import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import path from 'node:path'
import { Prisma } from '@prisma/client'

import { prisma } from '../lib/prisma'
import { getOrCreateSettings } from '../lib/settings'
import { normalizeWhatsappNumber } from '../lib/normalize'
import { addOrderEvent } from '../lib/events'
import { uploadBuffer } from '../lib/objectStorage'
import { triggerGenerationInBackground } from '../pipeline/triggerGeneration'
import { createXenditInvoice } from '../lib/xendit'

const ParamsSchema = z.object({ id: z.string().min(1) })
const VerifySchema = z.object({ phone: z.string().min(4) })
const RegenerationSchema = z.object({
  phone: z.string().optional(),
  revisionType: z.enum(['describe', 'lyrics', 'new_story']),
  description: z.string().max(2000).optional(),
  newLyrics: z.string().max(10000).optional(),
  musicStyle: z.string().max(100).optional(),
  voiceStyle: z.string().max(100).optional(),
})

const DEFAULT_MAX_REGENERATIONS = 2

async function getMaxRegenerations(themeSlug: string | null): Promise<number> {
  if (themeSlug) {
    const theme = await prisma.theme.findUnique({ where: { slug: themeSlug }, select: { settings: true } })
    if (theme?.settings && typeof theme.settings === 'object') {
      const cd = (theme.settings as any)?.creationDelivery
      if (cd && typeof cd === 'object' && typeof cd.maxRegenerations === 'number') {
        return cd.maxRegenerations
      }
    }
  }
  return DEFAULT_MAX_REGENERATIONS
}

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
        confirmedAt: true,
        deliveryScheduledAt: true,
        themeSlug: true,
        upsellItems: true,
      },
    })

    if (!order) return reply.code(404).send({ error: 'not_found' })

    const payload = (order.inputPayload && typeof order.inputPayload === 'object' ? order.inputPayload : {}) as Record<string, any>

    const settings = await getOrCreateSettings()
    const psc = (settings.publicSiteConfig && typeof settings.publicSiteConfig === 'object' ? settings.publicSiteConfig : {}) as Record<string, any>
    const deliveryPageConfig = psc.deliveryPage ?? {}

    // Resolve theme-level settings for processing page
    let themeConfig: Record<string, any> = {}
    if (order.themeSlug) {
      const theme = await prisma.theme.findUnique({ where: { slug: order.themeSlug }, select: { settings: true } })
      if (theme?.settings && typeof theme.settings === 'object') {
        themeConfig = theme.settings as Record<string, any>
      }
    }

    const cd = themeConfig?.creationDelivery && typeof themeConfig.creationDelivery === 'object' ? themeConfig.creationDelivery : psc?.creationDelivery ?? {}
    const deliveryDelayHours = typeof cd?.deliveryDelayHours === 'number' ? cd.deliveryDelayHours : (settings.deliveryDelayHours ?? 24)

    // Order processing page config (theme-level overrides global)
    const oppRaw = themeConfig?.orderProcessingPage ?? psc?.orderProcessingPage ?? {}
    const orderProcessingPage = {
      headline: typeof oppRaw?.headline === 'string' ? oppRaw.headline : 'Lagu Anda Sedang Dibuat!',
      subtitle: typeof oppRaw?.subtitle === 'string' ? oppRaw.subtitle : 'Tim kami sedang membuat lagu spesial untuk Anda',
      countdownLabel: typeof oppRaw?.countdownLabel === 'string' ? oppRaw.countdownLabel : 'Estimasi selesai dalam',
      bottomText: typeof oppRaw?.bottomText === 'string' ? oppRaw.bottomText : 'Kami akan mengirimkan notifikasi via WhatsApp ketika lagu Anda sudah siap.',
      upsellItemIds: Array.isArray(oppRaw?.upsellItemIds) ? oppRaw.upsellItemIds.filter((id: any) => typeof id === 'string') : (typeof oppRaw?.upsellItemId === 'string' && oppRaw.upsellItemId ? [oppRaw.upsellItemId] : []),
      imageUrl: typeof oppRaw?.imageUrl === 'string' ? oppRaw.imageUrl : '',
    }

    // Resolve upsell item details for processing page
    let processingUpsellItems: Record<string, any>[] = []
    if (orderProcessingPage.upsellItemIds.length > 0) {
      const upsellConfig = themeConfig?.upsell ?? psc?.upsell ?? {}
      const upsellItems = Array.isArray(upsellConfig?.items) ? upsellConfig.items : []
      processingUpsellItems = orderProcessingPage.upsellItemIds
        .map((id: string) => upsellItems.find((item: any) => item?.id === id))
        .filter(Boolean)
        .map((found: any) => ({
          id: found.id,
          icon: found.icon ?? '',
          title: found.title ?? '',
          headline: found.headline ?? '',
          description: found.description ?? '',
          price: found.price ?? 0,
          priceLabel: found.priceLabel ?? '',
          ctaText: found.ctaText ?? '',
          action: found.action ?? 'none',
          actionConfig: found.actionConfig ?? null,
        }))
    }

    // Check which upsells were already purchased
    const purchasedUpsells: any[] = Array.isArray(order.upsellItems) ? (order.upsellItems as any[]) : []

    return {
      id: order.id,
      status: order.status,
      recipientName: payload.recipientName ?? payload.recipient ?? '',
      createdAt: order.createdAt,
      config: deliveryPageConfig,
      confirmedAt: order.confirmedAt,
      deliveryScheduledAt: order.deliveryScheduledAt,
      deliveryDelayHours,
      orderProcessingPage,
      processingUpsellItems,
      purchasedUpsells,
    }
  })

  app.get('/public/order/:id/content', async (req, reply) => {
    const params = ParamsSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const o = await prisma.order.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        inputPayload: true,
        lyricsText: true,
        trackUrl: true,
        trackMetadata: true,
        regenerationCount: true,
        themeSlug: true,
        testimonialVideos: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!o) return reply.code(404).send({ error: 'not_found' })

    const maxRegens = await getMaxRegenerations(o.themeSlug)
    const payload = (o.inputPayload && typeof o.inputPayload === 'object' ? o.inputPayload : {}) as Record<string, any>
    const meta = (o.trackMetadata && typeof o.trackMetadata === 'object' ? o.trackMetadata : {}) as Record<string, any>
    const kieTracks: string[] = Array.isArray(meta.tracks) ? meta.tracks.filter(Boolean) : o.trackUrl ? [o.trackUrl] : []
    const storedTracks: string[] = Array.isArray(meta.storedTracks) ? meta.storedTracks.filter(Boolean) : []
    const tracks = storedTracks.length > 0 ? storedTracks : kieTracks

    return {
      orders: [{
        id: o.id,
        status: o.status,
        recipientName: payload.recipientName ?? payload.recipient ?? '',
        createdAt: o.createdAt,
        tracks,
        lyricsText: o.lyricsText ?? null,
        regenerationCount: o.regenerationCount,
        maxRegenerations: maxRegens,
        hasTestimonial: o.testimonialVideos.length > 0,
        testimonialStatus: o.testimonialVideos[0]?.status ?? null,
        revisionSubmittedAt: payload.revisionSubmittedAt ?? null,
      }],
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
        themeSlug: true,
        testimonialVideos: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const orders = await Promise.all(allOrders.map(async (o) => {
      const payload = (o.inputPayload && typeof o.inputPayload === 'object' ? o.inputPayload : {}) as Record<string, any>
      const meta = (o.trackMetadata && typeof o.trackMetadata === 'object' ? o.trackMetadata : {}) as Record<string, any>

      const kieTracks: string[] = Array.isArray(meta.tracks) ? meta.tracks.filter(Boolean) : o.trackUrl ? [o.trackUrl] : []
      const storedTracks: string[] = Array.isArray(meta.storedTracks) ? meta.storedTracks.filter(Boolean) : []
      const tracks = storedTracks.length > 0 ? storedTracks : kieTracks
      const maxRegens = await getMaxRegenerations(o.themeSlug)

      return {
        id: o.id,
        status: o.status,
        recipientName: payload.recipientName ?? payload.recipient ?? '',
        createdAt: o.createdAt,
        tracks,
        lyricsText: o.lyricsText ?? null,
        regenerationCount: o.regenerationCount,
        maxRegenerations: maxRegens,
        hasTestimonial: o.testimonialVideos.length > 0,
        testimonialStatus: o.testimonialVideos[0]?.status ?? null,
      }
    }))

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

    const order = await prisma.order.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        status: true,
        regenerationCount: true,
        inputPayload: true,
        lyricsText: true,
        themeSlug: true,
      },
    })

    if (!order) return reply.code(404).send({ error: 'not_found' })
    if (order.status !== 'completed') {
      return reply.code(400).send({ error: 'order_not_completed' })
    }
    const maxRegens = await getMaxRegenerations(order.themeSlug)
    if (order.regenerationCount >= maxRegens) {
      return reply.code(400).send({ error: 'max_regenerations_reached' })
    }

    const currentPayload = (order.inputPayload && typeof order.inputPayload === 'object' ? order.inputPayload : {}) as Record<string, any>
    const updatedPayload = { ...currentPayload }
    updatedPayload.revisionSubmittedAt = new Date().toISOString()

    // Build revision history entry
    const revisionEntry: Record<string, any> = {
      revisionNumber: order.regenerationCount + 1,
      type: body.data.revisionType,
      submittedAt: updatedPayload.revisionSubmittedAt,
    }
    if (body.data.description) revisionEntry.description = body.data.description
    if (body.data.newLyrics) revisionEntry.hasNewLyrics = true
    if (body.data.musicStyle && body.data.musicStyle !== 'keep') revisionEntry.musicStyle = body.data.musicStyle
    if (body.data.voiceStyle && body.data.voiceStyle !== 'keep') revisionEntry.voiceStyle = body.data.voiceStyle

    const existingHistory = Array.isArray(updatedPayload.revisionHistory) ? updatedPayload.revisionHistory : []
    updatedPayload.revisionHistory = [...existingHistory, revisionEntry]

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
        trackMetadata: Prisma.DbNull,
        generationStartedAt: null,
        generationCompletedAt: null,
        moodDescription: (body.data.revisionType === 'describe' || body.data.revisionType === 'new_story')
          ? null
          : undefined,
        ...((body.data.revisionType === 'describe' || body.data.revisionType === 'new_story') ? { lyricsText: null } : {}),
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
      maxRegenerations: maxRegens,
    }
  })

  app.post('/public/order/:id/upsell-purchase', async (req, reply) => {
    const params = ParamsSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const body = z.object({ upsellItemId: z.string().min(1) }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_body' })

    const order = await prisma.order.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        status: true,
        themeSlug: true,
        upsellItems: true,
        customer: { select: { email: true } },
      },
    })

    if (!order) return reply.code(404).send({ error: 'not_found' })
    if (order.status !== 'processing' && order.status !== 'completed') {
      return reply.code(400).send({ error: 'order_not_eligible' })
    }

    // Check if already purchased this upsell
    const existingUpsells: any[] = Array.isArray(order.upsellItems) ? (order.upsellItems as any[]) : []
    if (existingUpsells.some((u: any) => u?.id === body.data.upsellItemId)) {
      return reply.code(400).send({ error: 'already_purchased' })
    }

    // Resolve upsell item from theme config
    let themeConfig: Record<string, any> = {}
    if (order.themeSlug) {
      const theme = await prisma.theme.findUnique({ where: { slug: order.themeSlug }, select: { settings: true } })
      if (theme?.settings && typeof theme.settings === 'object') {
        themeConfig = theme.settings as Record<string, any>
      }
    }
    if (!Object.keys(themeConfig).length) {
      const settings = await getOrCreateSettings()
      const psc = (settings.publicSiteConfig && typeof settings.publicSiteConfig === 'object' ? settings.publicSiteConfig : {}) as Record<string, any>
      themeConfig = psc
    }

    const upsellConfig = themeConfig?.upsell ?? {}
    const catalogItems = Array.isArray(upsellConfig?.items) ? upsellConfig.items : []
    const upsellItem = catalogItems.find((item: any) => item?.id === body.data.upsellItemId)
    if (!upsellItem) {
      return reply.code(404).send({ error: 'upsell_item_not_found' })
    }

    const amount = typeof upsellItem.price === 'number' ? upsellItem.price : 0
    if (amount <= 0) {
      return reply.code(400).send({ error: 'invalid_upsell_price' })
    }

    // Build the externalId with upsell separator
    const externalId = `${order.id}__upsell__${body.data.upsellItemId}`

    const settings = await getOrCreateSettings()
    const siteUrl = (settings as any).siteUrl ?? ''
    const successUrl = siteUrl ? `${siteUrl}/order/${order.id}` : undefined
    const failureUrl = successUrl

    const invoice = await createXenditInvoice({
      externalId,
      amount,
      payerEmail: order.customer?.email ?? undefined,
      description: `Upsell: ${upsellItem.title ?? 'Add-on'}`,
      successRedirectUrl: successUrl,
      failureRedirectUrl: failureUrl,
    })

    await addOrderEvent({
      orderId: order.id,
      type: 'upsell_invoice_created',
      message: `Upsell invoice created: ${upsellItem.title ?? 'Add-on'} (Rp ${amount})`,
      data: { upsellItemId: body.data.upsellItemId, xenditInvoiceId: invoice.id, amount } as any,
    })

    return { invoiceUrl: invoice.invoice_url }
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
