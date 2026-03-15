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
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
  sortField: z.enum(['createdAt', 'status', 'customer', 'deliveryStatus']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

const ParamsIdSchema = z.object({ id: z.string().min(1) })

function buildSearchWhere(search: string | undefined) {
  if (!search || !search.trim()) return {}
  const s = search.trim()
  return {
    OR: [
      { id: { contains: s, mode: 'insensitive' as const } },
      { customer: { name: { contains: s, mode: 'insensitive' as const } } },
      { customer: { whatsappNumber: { contains: s } } },
    ],
  }
}

export const adminOrderRoutes: FastifyPluginAsync = async (app) => {
  app.get('/orders', async (req, reply) => {
    const q = ListQuerySchema.safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'invalid_query' })

    const { page, pageSize, sortField, sortDir, search, status, deliveryStatus, themeSlug } = q.data

    const searchWhere = buildSearchWhere(search)

    // Where clause without status filter — used for per-status counts
    const baseWhere: any = {
      ...(deliveryStatus ? { deliveryStatus } : {}),
      ...(themeSlug ? { themeSlug } : {}),
      ...searchWhere,
    }

    // Full where clause including status filter
    const fullWhere: any = {
      ...baseWhere,
      ...(status ? { status } : {}),
    }

    // Sort order
    const orderBy: any =
      sortField === 'customer'
        ? { customer: { name: sortDir } }
        : sortField === 'status'
        ? [{ status: sortDir }, { createdAt: 'desc' }]
        : sortField === 'deliveryStatus'
        ? [{ deliveryStatus: sortDir }, { createdAt: 'desc' }]
        : { createdAt: sortDir }

    const [orders, total, statusGroups, themes] = await Promise.all([
      prisma.order.findMany({
        where: fullWhere,
        orderBy,
        include: { customer: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where: fullWhere }),
      prisma.order.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.theme.findMany({ select: { slug: true, settings: true } }),
    ])

    // Build slug → paymentAmount map from theme settings
    const themePaymentMap: Record<string, number> = {}
    for (const th of themes) {
      const s = th.settings as any
      const amt = s?.creationDelivery?.paymentAmount
      if (typeof amt === 'number' && Number.isFinite(amt)) {
        themePaymentMap[th.slug] = amt
      }
    }

    const statusCounts: Record<string, number> = { all: 0 }
    for (const g of statusGroups) {
      statusCounts[g.status] = g._count._all
      statusCounts.all += g._count._all
    }

    return {
      orders: orders.map((o) => {
        // Compute total amount: base price - discount + upsells
        // Use stored basePrice if available; fall back to theme lookup for legacy orders
        const basePrice = typeof o.basePrice === 'number' ? o.basePrice : (o.themeSlug ? (themePaymentMap[o.themeSlug] ?? 497000) : 497000)
        const discount = typeof o.discountAmount === 'number' ? o.discountAmount : 0
        const upsellItems = Array.isArray(o.upsellItems) ? o.upsellItems as any[] : []
        const upsellTotal = upsellItems.reduce((sum: number, item: any) => sum + (typeof item?.price === 'number' ? item.price : 0), 0)
        const totalAmount = Math.max(0, basePrice - discount) + upsellTotal

        return {
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
          totalAmount,
        }
      }),
      total,
      page,
      pageSize,
      statusCounts,
    }
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
    musicPreferences: z.record(z.string(), z.unknown()).optional(),
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
      const incomingPrefs = { ...body.data.musicPreferences }
      if (typeof incomingPrefs.voiceStyle === 'string') {
        incomingPrefs.voiceStyle = incomingPrefs.voiceStyle.toLowerCase()
      }
      updatedPayload.musicPreferences = { ...existingPrefs, ...incomingPrefs }
      editedFields.push('musicPreferences')
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { inputPayload: updatedPayload as Prisma.InputJsonValue },
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

  app.post('/orders/bulk-resend-whatsapp', async (req, reply) => {
    const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', message: 'Provide an array of order IDs (max 100).' })

    let sent = 0
    let failed = 0
    for (const id of parsed.data.ids) {
      try {
        const order = await prisma.order.findUnique({ where: { id } })
        if (!order) { failed++; continue }
        await addOrderEvent({ orderId: id, type: 'admin_resend_whatsapp', message: 'Admin bulk resend WhatsApp reminder.' })
        try {
          await sendWhatsAppReminderForOrder(id, { force: true })
        } catch {
          // continue regardless
        }
        // Always mark as delivered — admin intent is to deliver to the customer
        await prisma.order.update({
          where: { id },
          data: { deliveryStatus: 'delivered', deliveredAt: new Date() },
        })
        sent++
      } catch {
        failed++
      }
    }

    return { ok: true, sent, failed }
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

  app.post('/orders/:id/add-revisions', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const bodySchema = z.object({ count: z.coerce.number().int().min(1).max(50) })
    const body = bodySchema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_body' })

    const order = await prisma.order.findUnique({ where: { id: params.data.id } })
    if (!order) return reply.code(404).send({ error: 'not_found' })

    await prisma.order.update({
      where: { id: order.id },
      data: { additionalRevisions: { increment: body.data.count } },
    })
    await addOrderEvent({
      orderId: order.id,
      type: 'admin_add_revisions',
      message: `Admin added ${body.data.count} additional revision${body.data.count > 1 ? 's' : ''}.`,
    })

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

    await addOrderEvent({ orderId: order.id, type: 'admin_resend_whatsapp', message: 'Admin triggered resend WhatsApp reminder.' })
    let result: any = null
    try {
      result = await sendWhatsAppReminderForOrder(order.id, { force: true })
    } catch (err: any) {
      result = { ok: false, error: err?.message }
    }
    // Always mark as delivered — admin intent is to deliver to the customer
    await prisma.order.update({
      where: { id: order.id },
      data: { deliveryStatus: 'delivered', deliveredAt: new Date() },
    })
    return { ok: true, orderId: order.id, result }
  })

  const ExportQuerySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    themeSlug: z.string().optional(),
    tzOffset: z.coerce.number().int().min(-840).max(840).optional(),
  })

  app.post('/orders/export-stories', async (req, reply) => {
    const parsed = ExportQuerySchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_query' })
    const query = parsed.data

    const params: Record<string, string | number> = {}
    if (query.from) params.from = query.from
    if (query.to) params.to = query.to
    if (query.themeSlug) params.themeSlug = query.themeSlug
    if (query.tzOffset !== undefined) params.tzOffset = query.tzOffset

    const job = await prisma.exportJob.create({
      data: {
        type: 'stories',
        params,
      },
    })

    return { jobId: job.id }
  })

  app.get('/orders/export-jobs/:id', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const job = await prisma.exportJob.findUnique({ where: { id: params.data.id } })
    if (!job) return reply.code(404).send({ error: 'not_found' })

    const isExpired = job.expiresAt && job.expiresAt < new Date()
    const effectiveStatus = isExpired && job.status === 'done' ? 'failed' : job.status
    const effectiveError = isExpired && job.status === 'done' ? 'Export file has expired.' : (job.error ?? null)

    return {
      id: job.id,
      status: effectiveStatus,
      error: effectiveError,
      createdAt: job.createdAt,
      downloadUrl: effectiveStatus === 'done' && job.fileKey
        ? `/api/admin/orders/export-jobs/${job.id}/download`
        : null,
    }
  })

  app.get('/orders/export-jobs/:id/download', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const job = await prisma.exportJob.findUnique({ where: { id: params.data.id } })
    if (!job) return reply.code(404).send({ error: 'not_found' })
    if (job.status !== 'done' || !job.fileKey) return reply.code(400).send({ error: 'not_ready' })
    if (job.expiresAt && job.expiresAt < new Date()) return reply.code(410).send({ error: 'file_expired' })

    const { downloadBuffer } = await import('../lib/objectStorage')
    const file = await downloadBuffer(job.fileKey)
    if (!file) return reply.code(410).send({ error: 'file_expired' })

    const jobParams = (job.params && typeof job.params === 'object' ? job.params : {}) as Record<string, string>
    const filename = `stories_${jobParams.from ?? 'all'}_to_${jobParams.to ?? 'now'}.csv`

    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(file.buffer)
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

  app.delete('/testimonial-videos/:id', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const video = await prisma.testimonialVideo.findUnique({ where: { id: params.data.id } })
    if (!video) return reply.code(404).send({ error: 'not_found' })

    await prisma.testimonialVideo.delete({ where: { id: params.data.id } })

    return { ok: true }
  })
}

