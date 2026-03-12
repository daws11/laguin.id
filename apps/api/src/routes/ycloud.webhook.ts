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
 * Handles: text, button (quick-reply payload), interactive button_reply.
 */
function extractMessageText(body: any): string {
  const data = body?.data ?? {}
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
   *  2. Customer taps the button → YCloud forwards the "Dengarkan Sekarang" reply here
   *     → we reply with the delivery page link
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
        if (eventType !== 'whatsapp_inbound_message') return

        const data = body?.data ?? {}
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

        // Get latest completed order for this customer
        const order = await prisma.order.findFirst({
          where: { customerId: customer.id, status: 'completed' },
          orderBy: { createdAt: 'desc' },
        })

        if (!order) {
          app.log.info({ customerId: customer.id }, 'ycloud_webhook: no completed order for customer')
          return
        }

        // Idempotency — only send the link once per order
        const alreadySent = await prisma.orderEvent.findFirst({
          where: { orderId: order.id, type: 'whatsapp_link_sent' },
          select: { id: true },
        })
        if (alreadySent) {
          app.log.info({ orderId: order.id }, 'ycloud_webhook: link already sent, skipping')
          return
        }

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
        const message = `🎵 Halo, ${customerName}!\n\nIni link lagu spesial Anda:\n\n${deliveryUrl}\n\nSelamat menikmati! 🎶`

        const ok = await sendYCloudText(apiKey, fromNumber, senderPhone, message)

        if (ok) {
          await addOrderEvent({
            orderId: order.id,
            type: 'whatsapp_link_sent',
            message: `Sent delivery link to ${senderPhone}`,
            data: { to: senderPhone, deliveryUrl } as any,
          })
          app.log.info({ orderId: order.id, to: senderPhone }, 'ycloud_webhook: delivery link sent')
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
