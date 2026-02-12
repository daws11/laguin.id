import type { FastifyPluginAsync } from 'fastify'
import { OrderInputSchema } from 'shared'
import { z } from 'zod'

import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'
import { getOrCreateSettings } from '../lib/settings'
import { normalizeEmail, normalizeWhatsappNumber } from '../lib/normalize'
import { sendMetaCapiEvent } from '../lib/metaCapi'

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
    const emailLower = normalizeEmail(input.email)
    const whatsappNumber = normalizeWhatsappNumber(input.whatsappNumber)

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
      if (verification.email !== emailLower) {
        return reply.code(400).send({ error: 'Email tidak cocok dengan OTP verifikasi.' })
      }
      if (!verification.verifiedAt) {
        return reply.code(400).send({ error: 'Email belum terverifikasi. Masukkan OTP yang benar.' })
      }
      if (verification.expiresAt.getTime() < Date.now()) {
        return reply.code(400).send({ error: 'OTP sudah kadaluarsa. Kirim ulang kode verifikasi.' })
      }
    }

    // Lifetime one-time registration:
    // - WhatsApp number may only register once
    // - Email may only register once (case-insensitive)
    if (!whatsappNumber) {
      return reply.code(400).send({ error: 'Nomor WhatsApp tidak valid.' })
    }
    if (!emailLower) {
      return reply.code(400).send({ error: 'Email tidak valid.' })
    }

    const existingByWhatsapp = await prisma.customer.findUnique({
      where: { whatsappNumber },
      select: { id: true },
    })
    if (existingByWhatsapp) {
      return reply
        .code(409)
        .send({ error: 'Nomor WhatsApp sudah terdaftar. Setiap nomor WhatsApp hanya bisa mendaftar sekali.' })
    }

    const existingByEmail = await prisma.customer.findFirst({
      where: { emailLower },
      select: { id: true },
    })
    if (existingByEmail) {
      return reply.code(409).send({ error: 'Email sudah terdaftar. Setiap email hanya bisa mendaftar sekali.' })
    }

    const normalizedInput = {
      ...input,
      email: input.email.trim(),
      whatsappNumber,
    }

    let customer: { id: string }
    try {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          whatsappNumber,
          email: normalizedInput.email,
          emailLower,
        },
        select: { id: true },
      })
    } catch (e: any) {
      // Race-safety: if two requests pass the checks concurrently.
      if (e?.code === 'P2002') {
        return reply.code(409).send({ error: 'Email atau nomor WhatsApp sudah terdaftar.' })
      }
      throw e
    }

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        inputPayload: normalizedInput,
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

    // Meta Conversions API (server-side): treat a created draft as a Lead.
    // Do not block response on analytics.
    void sendMetaCapiEvent({
      req,
      eventName: 'Lead',
      eventId: `order_created:${order.id}`,
      email: normalizedInput.email,
      phone: whatsappNumber,
      externalId: customer.id,
      customData: {
        order_id: order.id,
        value: 0,
        currency: 'IDR',
      },
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

    // Meta Conversions API (server-side): confirm ~= Purchase for this flow (value is free).
    void sendMetaCapiEvent({
      req,
      eventName: 'Purchase',
      eventId: `order_confirmed:${updated.id}`,
      // We need email/phone; fetch minimal details (non-blocking, best-effort).
      // If this fails, we still send the response.
      ...(await (async () => {
        try {
          const full = await prisma.order.findUnique({
            where: { id: updated.id },
            include: { customer: true },
          })
          const email = (full?.customer?.email ?? null) as string | null
          const phone = (full?.customer?.whatsappNumber ?? null) as string | null
          const externalId = (full?.customer?.id ?? null) as string | null
          return { email, phone, externalId }
        } catch {
          return { email: null, phone: null, externalId: null }
        }
      })()),
      customData: {
        order_id: updated.id,
        value: 0,
        currency: 'IDR',
      },
    })

    return { ok: true, orderId: updated.id, status: updated.status }
  })
}

