import type { FastifyPluginAsync } from 'fastify'

import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'
import { getOrCreateSettings, maybeDecrypt } from '../lib/settings'
import { normalizeWhatsappNumber } from '../lib/normalize'

async function sendYCloudText(apiKey: string, from: string, to: string, body: string) {
  const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ from, to, type: 'text', text: { body } }),
  })
  return res.ok
}

/**
 * Extracts the plain-text content of an incoming YCloud WhatsApp message.
 * YCloud v2 puts message details in body.whatsappInboundMessage (not body.data).
 * Handles: text, button (quick-reply payload), interactive button_reply.
 */
function extractMessageText(body: any): string {
  const data = body?.whatsappInboundMessage ?? body?.data ?? {}
  const type: string = data.type ?? ''

  if (type === 'text') return (data.text?.body ?? '').trim()

  if (type === 'button') {
    return (data.button?.payload ?? data.button?.text ?? '').trim()
  }

  if (type === 'interactive') {
    const interType = data.interactive?.type
    if (interType === 'button_reply') return (data.interactive?.button_reply?.title ?? '').trim()
    if (interType === 'list_reply') return (data.interactive?.list_reply?.title ?? '').trim()
  }

  return ''
}

/**
 * Extracts the WhatsApp context.id from a button reply.
 * This is the wamid of the original template message that contained the button.
 * When present, it lets us precisely match the reply to the correct order.
 */
function extractContextMessageId(body: any): string | null {
  const data = body?.whatsappInboundMessage ?? body?.data ?? {}
  const ctxId = data.context?.id ?? data.context?.messageId ?? null
  return typeof ctxId === 'string' && ctxId.length > 0 ? ctxId : null
}

const LISTEN_NOW_PATTERN = /^(dengarkan sekarang|listen now)$/i

export const ycloudWebhookRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/ycloud/webhook
   *
   * Configure this URL in YCloud dashboard → Webhooks:
   *   https://<your-domain>/api/ycloud/webhook?token=<ycloudWebhookSecret>
   *
   * Two-step song delivery flow:
   *  1. Song completed → send `song_delivery` WhatsApp template (button "Dengarkan Sekarang")
   *     → YCloud returns a message ID; we store it as `providerMessageId` in the
   *       `whatsapp_reminder_sent` event, tying the template send to the exact order.
   *  2. Customer taps the button → YCloud sends the button reply here with `context.id`
   *     = the wamid of the original template message.
   *     → We look up the `whatsapp_reminder_sent` event whose `providerMessageId` matches
   *       that context ID → resolves the exact order, even for customers with multiple orders
   *       and even after admin resends for specific orders.
   *     → Fallback: if context is unavailable, pick the most recently reminded order.
   */
  app.post('/ycloud/webhook', async (req, reply) => {
    const body: any = req.body ?? {}
    const query: any = req.query ?? {}

    const settings = await getOrCreateSettings().catch(() => null)
    const cfg = (settings?.whatsappConfig && typeof settings.whatsappConfig === 'object'
      ? settings.whatsappConfig
      : {}) as any
    const storedSecret = typeof cfg?.ycloud?.webhookSecretEnc === 'string'
      ? maybeDecrypt(cfg.ycloud.webhookSecretEnc)
      : null

    if (storedSecret) {
      const providedToken = typeof query.token === 'string' ? query.token : ''
      if (!providedToken || providedToken !== storedSecret) {
        return reply.code(401).send({ error: 'invalid_token' })
      }
    }

    // Respond 200 immediately so YCloud doesn't retry
    reply.code(200).send({ status: 'received' })

    setImmediate(async () => {
      try {
        const eventType: string = body?.type ?? ''
        if (eventType !== 'whatsapp.inbound_message.received' && eventType !== 'whatsapp_inbound_message') return

        const data = body?.whatsappInboundMessage ?? body?.data ?? {}
        const senderPhone: string = typeof data.from === 'string' ? data.from : ''
        if (!senderPhone) return

        const msgText = extractMessageText(body)
        app.log.info({ senderPhone, msgText }, 'ycloud_webhook: incoming message')

        if (!LISTEN_NOW_PATTERN.test(msgText)) return

        const normalizedSender = normalizeWhatsappNumber(senderPhone)

        const customer = await prisma.customer.findUnique({
          where: { whatsappNumber: normalizedSender },
          select: { id: true, name: true },
        })

        if (!customer) {
          app.log.warn({ senderPhone, normalizedSender }, 'ycloud_webhook: no customer found for sender')
          return
        }

        // ── Primary path: match via WhatsApp context.id ─────────────────────────────
        // When a customer taps a quick-reply button, YCloud includes context.id in the
        // inbound message — the wamid of the original template message. We stored that
        // wamid as `providerMessageId` in the whatsapp_reminder_sent event when we sent
        // the template. This gives us a precise, per-send mapping to the correct order,
        // so resending for a specific order always produces the right link.
        const contextMsgId = extractContextMessageId(body)
        app.log.info({ contextMsgId }, 'ycloud_webhook: button reply context')

        let order: { id: string; [key: string]: any } | null = null

        if (contextMsgId) {
          const reminderEvent = await prisma.orderEvent.findFirst({
            where: {
              type: 'whatsapp_reminder_sent',
              // Match the providerMessageId stored in the event data
              data: { path: ['providerMessageId'], equals: contextMsgId },
              // Scope to this customer's orders for safety
              order: { customerId: customer.id },
            },
            select: { orderId: true },
          })

          if (reminderEvent) {
            order = await prisma.order.findUnique({ where: { id: reminderEvent.orderId } })
            app.log.info({ orderId: order?.id, contextMsgId }, 'ycloud_webhook: matched order via context message ID')
          } else {
            app.log.warn({ contextMsgId, customerId: customer.id }, 'ycloud_webhook: context ID not found in reminder events, falling back')
          }
        }

        // ── Fallback: most-recently-reminded order ───────────────────────────────────
        // Used when the button reply doesn't include a context ID (older WA flows,
        // or when the message ID wasn't captured at send time).
        if (!order) {
          const remindedOrders = await prisma.order.findMany({
            where: {
              customerId: customer.id,
              status: 'completed',
              events: { some: { type: 'whatsapp_reminder_sent' } },
            },
            include: {
              events: {
                where: { type: 'whatsapp_reminder_sent' },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { createdAt: true },
              },
            },
          })

          if (!remindedOrders.length) {
            app.log.info({ customerId: customer.id }, 'ycloud_webhook: no reminded orders found for customer')
            return
          }

          remindedOrders.sort((a, b) => {
            const aTime = a.events[0]?.createdAt?.getTime() ?? 0
            const bTime = b.events[0]?.createdAt?.getTime() ?? 0
            return bTime - aTime
          })
          order = remindedOrders[0]
          app.log.info({ orderId: order.id }, 'ycloud_webhook: matched order via most-recent-reminder fallback')
        }

        if (!order) {
          app.log.info({ customerId: customer.id }, 'ycloud_webhook: could not resolve order for customer')
          return
        }

        const ycloud = (cfg?.ycloud ?? {}) as any
        const apiKey = maybeDecrypt(ycloud.apiKeyEnc) ?? maybeDecrypt(ycloud.apiKey) ?? null
        const fromNumber = typeof ycloud.from === 'string' ? ycloud.from : null

        if (!apiKey || !fromNumber) {
          app.log.error('ycloud_webhook: missing apiKey or from number in settings')
          return
        }

        const siteUrl = (typeof cfg?.siteUrl === 'string' && cfg.siteUrl.trim())
          ? cfg.siteUrl.trim().replace(/\/$/, '')
          : (process.env.APP_BASE_URL ?? '').replace(/\/$/, '')

        const deliveryUrl = siteUrl
          ? `${siteUrl}/order/${order.id}`
          : `https://laguin.id/order/${order.id}`

        const customerName = customer.name ?? 'Kamu'
        const DEFAULT_LINK_MESSAGE =
          `Silakan klik tautan di bawah ini untuk mengakses hasilnya:\n🔗  {link}\n\nSelamat menikmati karya spesial ini! Semoga sesuai dengan harapan dan memberikan kesan yang mendalam. ✨`
        const rawTemplate =
          typeof cfg?.linkMessage === 'string' && cfg.linkMessage.trim()
            ? cfg.linkMessage.trim()
            : DEFAULT_LINK_MESSAGE
        const message = rawTemplate
          .replace(/\{link\}/g, deliveryUrl)
          .replace(/\{name\}/g, customerName)

        const ok = await sendYCloudText(apiKey, fromNumber, senderPhone, message)

        if (ok) {
          await addOrderEvent({
            orderId: order.id,
            type: 'whatsapp_link_sent',
            message: `Sent delivery link to ${senderPhone}`,
            data: { to: senderPhone, deliveryUrl, contextMsgId } as any,
          })
          await prisma.order.update({
            where: { id: order.id },
            data: { deliveryStatus: 'delivered', deliveredAt: new Date() },
          })
          app.log.info({ orderId: order.id, to: senderPhone }, 'ycloud_webhook: delivery link sent, order marked delivered')
        } else {
          app.log.error({ orderId: order.id, to: senderPhone }, 'ycloud_webhook: failed to send link')
        }
      } catch (e: any) {
        app.log.error({ error: e?.message }, 'ycloud_webhook: processing error')
      }
    })

    return
  })
}
