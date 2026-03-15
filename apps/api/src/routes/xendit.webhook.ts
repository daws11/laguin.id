import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'
import { getXenditWebhookToken, verifyXenditWebhookToken } from '../lib/xendit'
import { getOrCreateSettings } from '../lib/settings'
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

    // Log the webhook (extract orderId from upsell externalId if needed)
    const logOrderId = typeof externalId === 'string' && externalId.includes('__upsell__')
      ? externalId.split('__upsell__')[0]
      : externalId
    try {
      await prisma.xenditWebhookLog.create({
        data: {
          orderId: logOrderId || null,
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

    // Check if this is an upsell payment (externalId contains __upsell__)
    const upsellSeparator = '__upsell__'
    if (typeof externalId === 'string' && externalId.includes(upsellSeparator)) {
      const [orderId, upsellItemId] = externalId.split(upsellSeparator)
      if (!orderId || !upsellItemId) {
        return reply.code(400).send({ error: 'Invalid upsell external_id format' })
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          upsellItems: true,
          themeSlug: true,
          deliveryScheduledAt: true,
          generationCompletedAt: true,
        },
      })
      if (!order) {
        app.log.warn({ orderId, upsellItemId }, 'Xendit upsell webhook: order not found')
        return reply.code(404).send({ error: 'Order not found' })
      }

      if (status === 'PAID' || status === 'SETTLED') {
        // Check if upsell already purchased
        const existingUpsells: any[] = Array.isArray(order.upsellItems) ? (order.upsellItems as any[]) : []
        if (existingUpsells.some((u: any) => u?.id === upsellItemId)) {
          return { ok: true, message: 'Upsell already processed' }
        }

        // Resolve the upsell item from theme/global config
        let upsellItem: any = null
        if (order.themeSlug) {
          const theme = await prisma.theme.findUnique({ where: { slug: order.themeSlug }, select: { settings: true } })
          if (theme?.settings && typeof theme.settings === 'object') {
            const items = (theme.settings as any)?.upsell?.items
            if (Array.isArray(items)) {
              upsellItem = items.find((i: any) => i?.id === upsellItemId)
            }
          }
        }
        if (!upsellItem) {
          const settings = await getOrCreateSettings()
          const psc = (settings.publicSiteConfig && typeof settings.publicSiteConfig === 'object' ? settings.publicSiteConfig : {}) as any
          const items = psc?.upsell?.items
          if (Array.isArray(items)) {
            upsellItem = items.find((i: any) => i?.id === upsellItemId)
          }
        }

        if (!upsellItem) {
          app.log.warn({ orderId, upsellItemId }, 'Upsell item not found in config')
          // Still add it with minimal info
          upsellItem = { id: upsellItemId, title: 'Unknown upsell', price: paidAmount ?? 0, action: 'none' }
        }

        // Append to order's upsellItems
        const updatedUpsells = [...existingUpsells, upsellItem]
        const updateData: any = { upsellItems: updatedUpsells }

        // Handle express_delivery action: recalculate deliveryScheduledAt
        if (upsellItem.action === 'express_delivery') {
          const deliveryTimeMinutes = upsellItem.actionConfig?.deliveryTimeMinutes ?? 0
          if (order.status === 'completed' && order.generationCompletedAt) {
            // Order already completed generation — update deliveryScheduledAt directly
            if (deliveryTimeMinutes === 0) {
              updateData.deliveryScheduledAt = order.generationCompletedAt
              updateData.deliveryStatus = 'delivery_pending'
            } else {
              updateData.deliveryScheduledAt = new Date(
                order.generationCompletedAt.getTime() + deliveryTimeMinutes * 60 * 1000,
              )
            }
          }
          // If still processing, generation.ts will read upsellItems at completion time
        }

        await prisma.order.update({ where: { id: orderId }, data: updateData })

        await addOrderEvent({
          orderId,
          type: 'upsell_purchased',
          message: `Upsell purchased: ${upsellItem.title ?? upsellItemId} (Rp ${paidAmount ?? 0})`,
          data: {
            upsellItemId,
            xenditInvoiceId,
            paidAmount,
            action: upsellItem.action,
          } as any,
        })

        app.log.info({ orderId, upsellItemId }, 'Upsell payment processed')
        return { ok: true }
      }

      // For EXPIRED or other statuses, just acknowledge
      if (status === 'EXPIRED') {
        await addOrderEvent({
          orderId,
          type: 'upsell_invoice_expired',
          message: `Upsell invoice expired: ${upsellItemId}`,
        })
      }

      return { ok: true, message: `Upsell status ${status} acknowledged` }
    }

    // Regular order payment flow
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
