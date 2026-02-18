import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'
import { getXenditWebhookToken, verifyXenditWebhookToken } from '../lib/xendit'
import { triggerGenerationInBackground } from '../pipeline/triggerGeneration'

export const xenditWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.post('/xendit/callback', async (req, reply) => {
    const callbackToken = req.headers['x-callback-token'] as string | undefined
    const storedToken = await getXenditWebhookToken()

    if (storedToken) {
      if (!callbackToken || !verifyXenditWebhookToken(callbackToken, storedToken)) {
        app.log.warn('Xendit webhook: missing or invalid callback token')
        return reply.code(401).send({ error: 'Invalid callback token' })
      }
    }

    const body = req.body as any
    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'Invalid body' })
    }

    const externalId = body.external_id
    const status = body.status
    const paidAmount = body.paid_amount
    const paymentMethod = body.payment_method
    const paymentChannel = body.payment_channel
    const xenditInvoiceId = body.id

    app.log.info({ externalId, status, xenditInvoiceId }, 'Xendit webhook received')

    // Log the webhook
    try {
      await prisma.xenditWebhookLog.create({
        data: {
          orderId: externalId || null,
          xenditId: xenditInvoiceId || null,
          status: status || null,
          amount: paidAmount ? parseFloat(paidAmount.toString()) : null,
          payload: body,
        }
      })
    } catch (e) {
      app.log.error(e, 'Failed to log Xendit webhook')
    }

    if (!externalId) {
      return reply.code(400).send({ error: 'Missing external_id' })
    }

    const order = await prisma.order.findUnique({ where: { id: externalId } })
    if (!order) {
      app.log.warn({ externalId }, 'Xendit webhook: order not found')
      return reply.code(404).send({ error: 'Order not found' })
    }

    if (status === 'PAID' || status === 'SETTLED') {
      if (order.paymentStatus === 'paid') {
        return { ok: true, message: 'Already processed' }
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          status: 'processing',
          confirmedAt: order.confirmedAt ?? new Date(),
          deliveryStatus: 'delivery_pending',
          errorMessage: null,
        },
      })

      await addOrderEvent({
        orderId: order.id,
        type: 'xendit_payment_received',
        message: `Payment received via ${paymentChannel ?? paymentMethod ?? 'Xendit'}. Amount: ${paidAmount ?? 0}`,
        data: {
          xenditInvoiceId,
          paidAmount,
          paymentMethod,
          paymentChannel,
          paidAt: body.paid_at,
        } as any,
      })

      await addOrderEvent({
        orderId: order.id,
        type: 'order_confirmed',
        message: 'Order auto-confirmed after Xendit payment.',
      })

      app.log.info({ orderId: order.id }, 'Order confirmed via Xendit payment')

      triggerGenerationInBackground(order.id, app.log)

      return { ok: true }
    }

    if (status === 'EXPIRED') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'failed',
          errorMessage: 'Invoice pembayaran sudah kedaluwarsa.',
        },
      })

      await addOrderEvent({
        orderId: order.id,
        type: 'xendit_payment_expired',
        message: 'Xendit invoice expired.',
      })

      return { ok: true }
    }

    return { ok: true, message: `Status ${status} acknowledged` }
  })
}
