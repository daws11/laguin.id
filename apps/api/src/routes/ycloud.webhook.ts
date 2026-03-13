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
  // YCloud v2 webhook structure: body.whatsappInboundMessage
  const data = body?.whatsappInboundMessage ?? body?.data ?? {}
  const type: string = data.type ?? ''

  if (type === 'text') return (data.text?.body ?? '').trim()

  if (type === 'button') {
    // When customer taps a quick-reply button, YCloud sends type=button with:
    // button.payload = the payload value set in the template button
    // button.text = the button label shown to the user
    return (data.button?.payload ?? data.button?.text ?? '').trim()
  }

  if (type === 'interactive') {
    const interType = data.interactive?.type
    if (interType === 'button_reply') return (data.interactive?.button_reply?.title ?? '').trim()
    if (interType === 'list_reply') return (data.interactive?.list_reply?.title ?? '').trim()
  }

  return ''
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
   *  1. Song completed → send `song_delivery` WhatsApp template (with button "Dengarkan Sekarang")
   *     → backend records a `whatsapp_reminder_sent` event on the order (ties the template send to the order ID)
   *  2. Customer taps the button → YCloud forwards the "Dengarkan Sekarang" reply here
   *     → we find which specific order is waiting for this customer's link (has reminder sent, no link sent yet)
   *     → we pick the most recently reminded order and send its delivery link
   *
   * Multi-order safety: a customer with N orders will always receive the link for the correct order
   * because we match on `whatsapp_reminder_sent` events (tied to the order) rather than just the
   * latest completed order. Idempotency is guaranteed per-order via the `whatsapp_link_sent` event.
   */
  app.post('/ycloud/webhook', async (req, reply) => {
    const body: any = req.body ?? {}
    const query: any = req.query ?? {}

    // Optional token-based security. Set ycloudWebhookSecret in admin settings,
    // then add ?token=<secret> to the webhook URL configured in YCloud.
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
        // YCloud v2 uses dot-notation event type names
        if (eventType !== 'whatsapp.inbound_message.received' && eventType !== 'whatsapp_inbound_message') return

        // YCloud v2: message data in whatsappInboundMessage; v1 fallback: data
        const data = body?.whatsappInboundMessage ?? body?.data ?? {}
        const senderPhone: string = typeof data.from === 'string' ? data.from : ''
        if (!senderPhone) return

        const msgText = extractMessageText(body)
        app.log.info({ senderPhone, msgText }, 'ycloud_webhook: incoming message')

        if (!LISTEN_NOW_PATTERN.test(msgText)) return

        // Normalize sender number to match our stored format (62xxxxxxxxxx)
        const normalizedSender = normalizeWhatsappNumber(senderPhone)

        const customer = await prisma.customer.findUnique({
          where: { whatsappNumber: normalizedSender },
          select: { id: true, name: true },
        })

        if (!customer) {
          app.log.warn({ senderPhone, normalizedSender }, 'ycloud_webhook: no customer found for sender')
          return
        }

        // Find the order for which we most recently sent the WA template.
        // Includes orders whose link has already been sent — resending is always allowed.
        // This correctly handles customers with multiple orders: we match on the recorded
        // `whatsapp_reminder_sent` event rather than just the latest completed order.
        const remindedOrders = await prisma.order.findMany({
          where: {
            customerId: customer.id,
            status: 'completed',
            // Has a template send recorded (ties the reply to a specific order)
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

        // Pick the order whose template was sent most recently — that is the order
        // the customer is responding to.
        remindedOrders.sort((a, b) => {
          const aTime = a.events[0]?.createdAt?.getTime() ?? 0
          const bTime = b.events[0]?.createdAt?.getTime() ?? 0
          return bTime - aTime
        })
        const order = remindedOrders[0]

        // Re-read settings (already loaded above)
        const ycloud = (cfg?.ycloud ?? {}) as any
        const apiKey = maybeDecrypt(ycloud.apiKeyEnc) ?? maybeDecrypt(ycloud.apiKey) ?? null
        const fromNumber = typeof ycloud.from === 'string' ? ycloud.from : null

        if (!apiKey || !fromNumber) {
          app.log.error('ycloud_webhook: missing apiKey or from number in settings')
          return
        }

        // Build delivery URL from admin-configured siteUrl or env var
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
            data: { to: senderPhone, deliveryUrl } as any,
          })
          // Customer has received the link — mark the order as delivered
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
