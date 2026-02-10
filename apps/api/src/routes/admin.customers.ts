import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'

const ParamsIdSchema = z.object({ id: z.string().min(1) })

export const adminCustomerRoutes: FastifyPluginAsync = async (app) => {
  app.get('/customers', async () => {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { orders: true } },
        orders: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, deliveryStatus: true } },
      },
      take: 200,
    })

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      whatsappNumber: c.whatsappNumber,
      email: c.email,
      orderCount: c._count.orders,
      latestOrderStatus: c.orders[0]?.status ?? null,
      latestDeliveryStatus: c.orders[0]?.deliveryStatus ?? null,
      createdAt: c.createdAt,
    }))
  })

  app.get('/customers/:id', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const customer = await prisma.customer.findUnique({
      where: { id: params.data.id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { events: { orderBy: { createdAt: 'desc' }, take: 50 } },
          take: 50,
        },
      },
    })
    if (!customer) return reply.code(404).send({ error: 'not_found' })

    return customer
  })
}

