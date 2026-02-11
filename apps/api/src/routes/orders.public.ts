import type { FastifyPluginAsync } from 'fastify'
import { OrderInputSchema } from 'shared'
import { z } from 'zod'

import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'
import { getOrCreateSettings } from '../lib/settings'

const ParamsSchema = z.object({ id: z.string().min(1) })

export const publicOrdersRoutes: FastifyPluginAsync = async (app) => {
  app.post('/orders/draft', async (req, reply) => {
    const parsed = OrderInputSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      })
    }

    const input = parsed.data
    const customerName = input.yourName ?? input.recipientName

    const settings = await getOrCreateSettings()
    const emailOtpEnabled = settings.emailOtpEnabled ?? true
    const agreementEnabled = settings.agreementEnabled ?? false

    if (agreementEnabled && !(input as { agreementAccepted?: boolean }).agreementAccepted) {
      return reply.code(400).send({ error: 'Centang persetujuan untuk melanjutkan.' })
    }

    if (emailOtpEnabled) {
      // Enforce that email has been verified (OTP) before creating draft order.
      const verificationId = input.emailVerificationId
      if (!verificationId) {
        return reply.code(400).send({ error: 'Email belum terverifikasi. Kirim OTP dulu.' })
      }
      const verification = await prisma.emailVerification.findUnique({
        where: { id: verificationId },
      })
      if (!verification) {
        return reply.code(400).send({ error: 'Email belum terverifikasi. Kirim OTP dulu.' })
      }
      if (verification.email.toLowerCase() !== input.email.toLowerCase()) {
        return reply.code(400).send({ error: 'Email tidak cocok dengan OTP verifikasi.' })
      }
      if (!verification.verifiedAt) {
        return reply.code(400).send({ error: 'Email belum terverifikasi. Masukkan OTP yang benar.' })
      }
      if (verification.expiresAt.getTime() < Date.now()) {
        return reply.code(400).send({ error: 'OTP sudah kadaluarsa. Kirim ulang kode verifikasi.' })
      }
    }

    const customer = await prisma.customer.upsert({
      where: { whatsappNumber: input.whatsappNumber },
      create: {
        name: customerName,
        whatsappNumber: input.whatsappNumber,
        email: input.email,
      },
      update: {
        name: customerName,
        email: input.email,
      },
    })

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        inputPayload: input,
        status: 'created',
        deliveryStatus: 'delivery_pending',
        paymentStatus: 'free',
      },
    })

    await addOrderEvent({
      orderId: order.id,
      type: 'order_created',
      message: 'Order draft created from configurator.',
    })

    return { orderId: order.id }
  })

  app.get('/orders/:id', async (req, reply) => {
    const paramsParsed = ParamsSchema.safeParse(req.params)
    if (!paramsParsed.success) return reply.code(400).send({ error: 'invalid_params' })

    const order = await prisma.order.findUnique({
      where: { id: paramsParsed.data.id },
      include: {
        customer: true,
      },
    })
    if (!order) return reply.code(404).send({ error: 'not_found' })

    return {
      id: order.id,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      paymentStatus: order.paymentStatus,
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        whatsappNumber: order.customer.whatsappNumber,
      },
      inputPayload: order.inputPayload,
      lyricsText: order.lyricsText,
      moodDescription: order.moodDescription,
      trackUrl: order.trackUrl,
      confirmedAt: order.confirmedAt,
      generationCompletedAt: order.generationCompletedAt,
      deliveryScheduledAt: order.deliveryScheduledAt,
      deliveredAt: order.deliveredAt,
      errorMessage: order.errorMessage,
    }
  })

  app.post('/orders/:id/confirm', async (req, reply) => {
    const paramsParsed = ParamsSchema.safeParse(req.params)
    if (!paramsParsed.success) return reply.code(400).send({ error: 'invalid_params' })

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: paramsParsed.data.id } })
      if (!order) return null

      if (order.status === 'completed') return order
      if (order.status === 'failed') {
        // allow manual retry via admin; public confirm should not override failed state
        return order
      }

      const next = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'processing',
          confirmedAt: order.confirmedAt ?? new Date(),
          deliveryStatus: 'delivery_pending',
          errorMessage: null,
        },
      })
      return next
    })

    if (!updated) return reply.code(404).send({ error: 'not_found' })

    await addOrderEvent({
      orderId: updated.id,
      type: 'order_confirmed',
      message: 'Order confirmed from checkout.',
    })

    return { ok: true, orderId: updated.id, status: updated.status }
  })
}

