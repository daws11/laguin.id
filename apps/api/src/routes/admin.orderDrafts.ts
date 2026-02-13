import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'

const ParamsSchema = z.object({ id: z.string().min(1) })

export const adminOrderDraftRoutes: FastifyPluginAsync = async (app) => {
  app.get('/order-drafts/:id', async (req, reply) => {
    const params = ParamsSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const rec = await prisma.orderDraft.findUnique({
      where: { id: params.data.id },
      select: {
        id: true,
        step: true,
        relationship: true,
        formValues: true,
        whatsappNumber: true,
        emailLower: true,
        emailVerificationId: true,
        convertedOrderId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!rec) return reply.code(404).send({ error: 'not_found' })

    const fv = (rec.formValues ?? {}) as any
    const nameRaw = String(fv?.recipientName ?? fv?.yourName ?? '').trim()
    const emailRaw = String(fv?.email ?? '').trim()
    const whatsappRaw = String(fv?.whatsappNumber ?? rec.whatsappNumber ?? '').trim()

    return {
      kind: 'draft',
      id: rec.id,
      name: nameRaw || emailRaw || whatsappRaw || 'Draft registration',
      step: rec.step ?? 0,
      relationship: rec.relationship,
      whatsappNumber: whatsappRaw || null,
      email: emailRaw || rec.emailLower || null,
      emailVerificationId: rec.emailVerificationId,
      convertedOrderId: rec.convertedOrderId,
      formValues: rec.formValues,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
    }
  })
}

