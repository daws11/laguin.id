import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'

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
}

