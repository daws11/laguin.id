import { addOrderEvent } from '../lib/events'
import { getOrCreateSettings, maybeDecrypt } from '../lib/settings'
import type { WhatsAppProvider, WhatsAppSendInput, WhatsAppSendResult } from './types'

type YCloudConfig = {
  apiKey: string
  from: string
  templateName: string
  templateLangCode: string
}

function getYCloudConfigFromSettings(settings: any): YCloudConfig {
  const cfg = (settings?.whatsappConfig && typeof settings.whatsappConfig === 'object' ? settings.whatsappConfig : null) ?? {}
  const ycloud = (cfg as any).ycloud ?? {}

  const apiKey = maybeDecrypt(ycloud.apiKeyEnc) ?? maybeDecrypt(ycloud.apiKey) ?? null
  const from = typeof ycloud.from === 'string' ? ycloud.from : null
  const templateName = typeof ycloud.templateName === 'string' ? ycloud.templateName : null
  const templateLangCode = typeof ycloud.templateLangCode === 'string' ? ycloud.templateLangCode : null

  if (!apiKey) throw new Error('Missing YCloud apiKey (set ycloudApiKey in Admin Settings)')
  if (!from) throw new Error('Missing YCloud from (set ycloudFrom in Admin Settings)')
  if (!templateName) throw new Error('Missing YCloud templateName (set ycloudTemplateName in Admin Settings)')
  if (!templateLangCode) throw new Error('Missing YCloud templateLangCode (set ycloudTemplateLangCode in Admin Settings)')

  return { apiKey, from, templateName, templateLangCode }
}

export class YCloudWhatsAppProvider implements WhatsAppProvider {
  name = 'ycloud'

  async send(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    // In this app, `input.message` is expected to be the track URL (link).
    const trackUrl = input.message
    if (!trackUrl || trackUrl.trim().length === 0) return { ok: false, provider: this.name, error: 'missing_track_url' }

    const settings = await getOrCreateSettings()
    const cfg = getYCloudConfigFromSettings(settings as any)

    const payload = {
      from: cfg.from,
      to: input.to,
      type: 'template',
      template: {
        name: cfg.templateName,
        language: { code: cfg.templateLangCode },
        // Simplest template: BODY has 1 text variable (the link).
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: trackUrl }],
          },
        ],
      },
      // Helpful for reconciliation in YCloud dashboard/webhooks.
      externalId: `order:${(input as any).orderId ?? ''}`,
    }

    const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': cfg.apiKey,
      },
      body: JSON.stringify(payload),
    })

    const json = (await res.json().catch(() => null)) as any
    if (!res.ok) {
      const msg = `ycloud_send_failed (${res.status}): ${JSON.stringify(json)}`
      const orderId = (input as any).orderId as string | undefined
      if (orderId) {
        await addOrderEvent({ orderId, type: 'ycloud_send_failed', message: msg, data: json as any })
      }
      return { ok: false, provider: this.name, error: msg }
    }

    return { ok: true, provider: this.name, providerMessageId: typeof json?.id === 'string' ? json.id : undefined }
  }
}

