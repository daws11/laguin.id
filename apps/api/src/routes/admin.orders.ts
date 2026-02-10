import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'
import { deliverCompletedOrder, sendSongEmailForOrder, sendWhatsAppReminderForOrder } from '../delivery/deliver'

const ListQuerySchema = z.object({
  status: z.enum(['created', 'processing', 'completed', 'failed']).optional(),
  deliveryStatus: z.enum(['delivery_pending', 'delivery_scheduled', 'delivered', 'delivery_failed']).optional(),
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
      },
    })
    if (!order) return reply.code(404).send({ error: 'not_found' })
    return order
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

    if (order.deliveryStatus !== 'delivery_failed') {
      return reply.code(400).send({ error: 'invalid_state', message: `deliveryStatus=${order.deliveryStatus}` })
    }
    if (order.status !== 'completed') {
      return reply.code(400).send({ error: 'invalid_state', message: `status=${order.status}` })
    }
    if (!order.trackUrl) {
      return reply.code(400).send({ error: 'invalid_state', message: 'Missing trackUrl' })
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        // make it eligible for worker if immediate send fails and schedules retry
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
    if (order.status !== 'completed') return reply.code(400).send({ error: 'invalid_state', message: `status=${order.status}` })
    if (order.deliveryStatus === 'delivered') return reply.code(400).send({ error: 'invalid_state', message: 'already_delivered' })

    await prisma.order.update({
      where: { id: order.id },
      data: { deliveryStatus: 'delivery_pending', deliveryScheduledAt: new Date(), deliveredAt: null },
    })
    await addOrderEvent({ orderId: order.id, type: 'admin_resend_email', message: 'Admin triggered resend email.' })
    const result = await sendSongEmailForOrder(order.id, { force: true })
    return { ok: true, orderId: order.id, result }
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
}

