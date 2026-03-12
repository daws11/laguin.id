import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'
import { deliverCompletedOrder, sendSongEmailForOrder, sendWhatsAppReminderForOrder } from '../delivery/deliver'
import { triggerGenerationInBackground } from '../pipeline/triggerGeneration'
import { completeOrder } from '../pipeline/generation'

const ListQuerySchema = z.object({
  status: z.enum(['created', 'processing', 'completed', 'failed']).optional(),
  deliveryStatus: z.enum(['delivery_pending', 'delivery_scheduled', 'delivered', 'delivery_failed']).optional(),
  themeSlug: z.string().optional(),
})

const ParamsIdSchema = z.object({ id: z.string().min(1) })

export const adminOrderRoutes: FastifyPluginAsync = async (app) => {
  app.get('/orders', async (req, reply) => {
    const q = ListQuerySchema.safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'invalid_query' })

    const orders = await prisma.order.findMany({
      where: {
        status: q.data.status,
        deliveryStatus: q.data.deliveryStatus,
        themeSlug: q.data.themeSlug,
      },
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
      take: 200,
    })

    return orders.map((o) => ({
      id: o.id,
      customer: {
        id: o.customer.id,
        name: o.customer.name,
        whatsappNumber: o.customer.whatsappNumber,
      },
      status: o.status,
      deliveryStatus: o.deliveryStatus,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
      confirmedAt: o.confirmedAt,
      generationCompletedAt: o.generationCompletedAt,
      deliveryScheduledAt: o.deliveryScheduledAt,
      deliveredAt: o.deliveredAt,
      trackUrl: o.trackUrl,
      errorMessage: o.errorMessage,
      themeSlug: o.themeSlug ?? null,
      regenerationCount: o.regenerationCount,
    }))
  })

  app.get('/orders/:id', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const order = await prisma.order.findUnique({
      where: { id: params.data.id },
      include: {
        customer: true,
        events: { orderBy: { createdAt: 'desc' }, take: 200 },
        testimonialVideos: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!order) return reply.code(404).send({ error: 'not_found' })
    return order
  })

  const UpdateInputSchema = z.object({
    recipientName: z.string().min(1).max(200).optional(),
    yourName: z.string().max(200).optional(),
    occasion: z.string().max(200).optional(),
    story: z.string().min(1).max(10000).optional(),
    musicPreferences: z.record(z.unknown()).optional(),
  }).refine(data => Object.keys(data).length > 0, { message: 'At least one field required' })

  app.post('/orders/:id/update-input', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const body = UpdateInputSchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_body' })

    const order = await prisma.order.findUnique({ where: { id: params.data.id } })
    if (!order) return reply.code(404).send({ error: 'not_found' })

    const existingPayload = (order.inputPayload && typeof order.inputPayload === 'object') ? order.inputPayload as Record<string, unknown> : {}
    const updatedPayload = { ...existingPayload }

    const editedFields: string[] = []
    if (body.data.recipientName !== undefined) { updatedPayload.recipientName = body.data.recipientName; editedFields.push('recipientName') }
    if (body.data.yourName !== undefined) { updatedPayload.yourName = body.data.yourName; editedFields.push('yourName') }
    if (body.data.occasion !== undefined) { updatedPayload.occasion = body.data.occasion; editedFields.push('occasion') }
    if (body.data.story !== undefined) { updatedPayload.story = body.data.story; editedFields.push('story') }
    if (body.data.musicPreferences !== undefined) {
      const existingPrefs = (typeof existingPayload.musicPreferences === 'object' && existingPayload.musicPreferences) ? existingPayload.musicPreferences as Record<string, unknown> : {}
      updatedPayload.musicPreferences = { ...existingPrefs, ...body.data.musicPreferences }
      editedFields.push('musicPreferences')
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { inputPayload: updatedPayload },
    })

    if (body.data.recipientName !== undefined && order.customerId) {
      await prisma.customer.update({
        where: { id: order.customerId },
        data: { name: body.data.recipientName },
      }).catch(() => {})
    }

    await addOrderEvent({
      orderId: order.id,
      type: 'input_edited',
      message: `Edited by admin: ${editedFields.join(', ')}`,
    })

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { customer: true, events: { orderBy: { createdAt: 'desc' }, take: 200 } },
    })

    return updated
  })

  app.post('/orders/:id/retry', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const order = await prisma.order.findUnique({ where: { id: params.data.id } })
    if (!order) return reply.code(404).send({ error: 'not_found' })

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'processing',
        deliveryStatus: 'delivery_pending',
        paymentStatus: order.paymentStatus, // keep as-is
        lyricsText: null,
        moodDescription: null,
        trackUrl: null,
        trackMetadata: Prisma.DbNull,
        generationStartedAt: null,
        generationCompletedAt: null,
        deliveryScheduledAt: null,
        deliveredAt: null,
        errorMessage: null,
        confirmedAt: order.confirmedAt ?? new Date(),
      },
    })

    await addOrderEvent({ orderId: updated.id, type: 'admin_retry', message: 'Retry triggered by admin.' })

    triggerGenerationInBackground(updated.id, app.log)

    return { ok: true, orderId: updated.id }
  })

  app.post('/orders/:id/approve', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const order = await prisma.order.findUnique({ where: { id: params.data.id } })
    if (!order) return reply.code(404).send({ error: 'not_found' })

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'completed',
        deliveryStatus: 'delivery_pending', // Ready for delivery worker
        errorMessage: null,
      },
    })

    await addOrderEvent({ 
      orderId: updated.id, 
      type: 'admin_approved', 
      message: 'Order approved by admin. Status set to completed.' 
    })
    
    return { ok: true, orderId: updated.id, status: updated.status }
  })

  app.post('/orders/:id/resend-delivery', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const order = await prisma.order.findUnique({
      where: { id: params.data.id },
      include: { customer: true },
    })
    if (!order) return reply.code(404).send({ error: 'not_found' })

    if (!order.trackUrl) {
      return reply.code(400).send({ error: 'invalid_state', message: 'Missing trackUrl' })
    }
    if (order.status === 'processing' && order.trackUrl) {
      await completeOrder(order.id, { skipTrackCheck: true })
    } else if (order.status !== 'completed') {
      return reply.code(400).send({ error: 'invalid_state', message: `status=${order.status}` })
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryStatus: 'delivery_pending',
        deliveryScheduledAt: new Date(),
        deliveredAt: null,
      },
    })
    await addOrderEvent({
      orderId: order.id,
      type: 'admin_resend_delivery',
      message: 'Admin triggered resend: email + WhatsApp reminder.',
    })

    const result = await deliverCompletedOrder(order.id, { forceEmail: true, forceWhatsApp: true })
    return { ok: true, orderId: order.id, result }
  })

  app.post('/orders/:id/resend-email', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const order = await prisma.order.findUnique({ where: { id: params.data.id } })
    if (!order) return reply.code(404).send({ error: 'not_found' })
    if (!order.trackUrl) return reply.code(400).send({ error: 'invalid_state', message: 'No song URL available yet' })

    if (order.status === 'processing' && order.trackUrl) {
      await completeOrder(order.id, { skipTrackCheck: true })
    } else if (order.status !== 'completed') {
      return reply.code(400).send({ error: 'invalid_state', message: `status=${order.status}` })
    }
    if (order.deliveryStatus === 'delivered') return reply.code(400).send({ error: 'invalid_state', message: 'already_delivered' })

    await prisma.order.update({
      where: { id: order.id },
      data: { deliveryStatus: 'delivery_pending', deliveryScheduledAt: new Date(), deliveredAt: null },
    })
    await addOrderEvent({ orderId: order.id, type: 'admin_resend_email', message: 'Admin triggered resend email.' })
    const result = await sendSongEmailForOrder(order.id, { force: true })
    return { ok: true, orderId: order.id, result }
  })

  app.post('/orders/bulk-delete', async (req, reply) => {
    const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', message: 'Provide an array of order IDs (max 100).' })

    await prisma.orderEvent.deleteMany({ where: { orderId: { in: parsed.data.ids } } })
    const result = await prisma.order.deleteMany({ where: { id: { in: parsed.data.ids } } })

    return { ok: true, deleted: result.count }
  })

  app.post('/orders/bulk-clear-tracks', async (req, reply) => {
    const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', message: 'Provide an array of order IDs (max 100).' })

    const { deleteStoredTracks } = await import('../lib/trackStorage')

    const orders = await prisma.order.findMany({
      where: { id: { in: parsed.data.ids } },
      select: { id: true, trackMetadata: true },
    })

    let totalDeleted = 0
    for (const order of orders) {
      const meta: any = order.trackMetadata && typeof order.trackMetadata === 'object' ? order.trackMetadata : {}
      const storedTracks: string[] = Array.isArray(meta?.storedTracks) ? meta.storedTracks.filter(Boolean) : []
      if (storedTracks.length > 0) {
        const count = await deleteStoredTracks(order.id, storedTracks)
        totalDeleted += count
        const { storedTracks: _removed, ...restMeta } = meta
        await prisma.order.update({
          where: { id: order.id },
          data: { trackMetadata: restMeta as any },
        })
      }
    }

    return { ok: true, cleared: totalDeleted, ordersProcessed: orders.length }
  })

  app.post('/orders/:id/mark-delivered', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const order = await prisma.order.findUnique({ where: { id: params.data.id } })
    if (!order) return reply.code(404).send({ error: 'not_found' })
    if (order.deliveryStatus === 'delivered') return reply.code(400).send({ error: 'already_delivered' })

    await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryStatus: 'delivered',
        deliveredAt: new Date(),
      },
    })
    await addOrderEvent({ orderId: order.id, type: 'admin_mark_delivered', message: 'Manually marked as delivered by admin.' })

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { customer: true, events: { orderBy: { createdAt: 'desc' }, take: 200 } },
    })
    return updated
  })

  app.post('/orders/:id/resend-whatsapp', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const order = await prisma.order.findUnique({ where: { id: params.data.id } })
    if (!order) return reply.code(404).send({ error: 'not_found' })
    if (order.status !== 'completed') return reply.code(400).send({ error: 'invalid_state', message: `status=${order.status}` })
    if (order.deliveryStatus === 'delivered') return reply.code(400).send({ error: 'invalid_state', message: 'already_delivered' })

    await prisma.order.update({
      where: { id: order.id },
      data: { deliveryStatus: 'delivery_pending', deliveryScheduledAt: new Date(), deliveredAt: null },
    })
    await addOrderEvent({ orderId: order.id, type: 'admin_resend_whatsapp', message: 'Admin triggered resend WhatsApp reminder.' })
    const result = await sendWhatsAppReminderForOrder(order.id, { force: true })
    return { ok: true, orderId: order.id, result }
  })

  const ExportQuerySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    themeSlug: z.string().optional(),
    tzOffset: z.coerce.number().int().min(-840).max(840).optional(),
  })

  app.get('/orders/export-stories', async (req, reply) => {
    const parsed = ExportQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_query' })
    const query = parsed.data

    const offsetMs = (query.tzOffset ?? 0) * 60 * 1000

    const now = new Date()
    const defaultFrom = new Date(now)
    defaultFrom.setDate(defaultFrom.getDate() - 7)
    defaultFrom.setHours(0, 0, 0, 0)

    const fromDate = query.from ? new Date(new Date(query.from + 'T00:00:00.000Z').getTime() + offsetMs) : defaultFrom
    const toDate = query.to ? new Date(new Date(query.to + 'T23:59:59.999Z').getTime() + offsetMs) : now

    const where: Prisma.OrderWhereInput = {
      createdAt: { gte: fromDate, lte: toDate },
      ...(query.themeSlug ? { themeSlug: query.themeSlug } : {}),
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
      select: {
        id: true,
        createdAt: true,
        themeSlug: true,
        inputPayload: true,
        status: true,
        customer: { select: { name: true, email: true, whatsappNumber: true } },
      },
    })

    function sanitize(val: string): string {
      let s = val
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
      if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"'
      }
      return s
    }

    const header = ['Order ID', 'Created At', 'Theme', 'Customer Name', 'Email', 'WhatsApp', 'Status', 'Recipient', 'Relationship', 'Story']
    const rows = orders.map(o => {
      const ip = (o.inputPayload && typeof o.inputPayload === 'object' ? o.inputPayload : {}) as Record<string, any>
      return [
        o.id,
        o.createdAt.toISOString(),
        o.themeSlug ?? '',
        o.customer?.name ?? '',
        o.customer?.email ?? '',
        o.customer?.whatsappNumber ?? '',
        o.status,
        ip.recipientName ?? ip.recipient ?? '',
        ip.relationship ?? '',
        ip.story ?? '',
      ].map(v => sanitize(String(v)))
    })

    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\r\n')

    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="stories_${query.from ?? 'all'}_to_${query.to ?? 'now'}.csv"`)
      .send(csv)
  })

  app.get('/testimonial-videos', async (_req, reply) => {
    const videos = await prisma.testimonialVideo.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        order: {
          select: {
            id: true,
            inputPayload: true,
            customer: { select: { name: true, whatsappNumber: true } },
          },
        },
      },
    })

    return videos.map((v) => {
      const ip = (v.order.inputPayload && typeof v.order.inputPayload === 'object' ? v.order.inputPayload : {}) as Record<string, any>
      return {
        id: v.id,
        orderId: v.orderId,
        videoUrl: v.videoUrl,
        status: v.status,
        createdAt: v.createdAt,
        customerName: v.order.customer?.name ?? '',
        customerPhone: v.order.customer?.whatsappNumber ?? '',
        recipientName: ip.recipientName ?? ip.recipient ?? '',
      }
    })
  })

  app.post('/testimonial-videos/:id/approve', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const video = await prisma.testimonialVideo.findUnique({ where: { id: params.data.id } })
    if (!video) return reply.code(404).send({ error: 'not_found' })

    await prisma.testimonialVideo.update({
      where: { id: params.data.id },
      data: { status: 'approved' },
    })

    return { ok: true }
  })

  app.post('/testimonial-videos/:id/reject', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const video = await prisma.testimonialVideo.findUnique({ where: { id: params.data.id } })
    if (!video) return reply.code(404).send({ error: 'not_found' })

    await prisma.testimonialVideo.update({
      where: { id: params.data.id },
      data: { status: 'rejected' },
    })

    return { ok: true }
  })
}

