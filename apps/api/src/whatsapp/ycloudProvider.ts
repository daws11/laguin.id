import { addOrderEvent } from '../lib/events'
import { getOrCreateSettings, maybeDecrypt } from '../lib/settings'
import type { WhatsAppProvider, WhatsAppSendInput, WhatsAppSendResult } from './types'

type YCloudConfig = {
  apiKey: string
  from: string
  templateName: string
  templateLangCode: string
  templateHasButton: boolean | null
}

function getYCloudConfigFromSettings(settings: any): YCloudConfig {
  const cfg = (settings?.whatsappConfig && typeof settings.whatsappConfig === 'object' ? settings.whatsappConfig : null) ?? {}
  const ycloud = (cfg as any).ycloud ?? {}

  const apiKey = maybeDecrypt(ycloud.apiKeyEnc) ?? maybeDecrypt(ycloud.apiKey) ?? null
  const from = typeof ycloud.from === 'string' ? ycloud.from : null
  const templateName = typeof ycloud.templateName === 'string' ? ycloud.templateName : null
  const templateLangCode = typeof ycloud.templateLangCode === 'string' ? ycloud.templateLangCode : null
  const templateHasButton = typeof ycloud.templateHasButton === 'boolean' ? ycloud.templateHasButton : null

  if (!apiKey) throw new Error('Missing YCloud apiKey (set ycloudApiKey in Admin Settings)')
  if (!from) throw new Error('Missing YCloud from (set ycloudFrom in Admin Settings)')
  if (!templateName) throw new Error('Missing YCloud templateName (set ycloudTemplateName in Admin Settings)')
  if (!templateLangCode) throw new Error('Missing YCloud templateLangCode (set ycloudTemplateLangCode in Admin Settings)')

  return { apiKey, from, templateName, templateLangCode, templateHasButton }
}

export class YCloudWhatsAppProvider implements WhatsAppProvider {
  name = 'ycloud'

  async send(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    // templateHasButton=true  → send template with NO body variables; webhook reply delivers the link
    // templateHasButton=false → send template WITH link as body variable {1}
    // templateHasButton=null  → legacy: use body variable only when input.message is non-empty
    const message = input.message ?? ''
    const trackUrl = message.trim()

    const settings = await getOrCreateSettings()
    const cfg = getYCloudConfigFromSettings(settings as any)

    let components: object[] = []
    if (cfg.templateHasButton === true) {
      // Button template: no body variables — the webhook handles sending the link
      components = []
    } else if (cfg.templateHasButton === false) {
      // Direct-link template: inject link as body variable {1} if available
      if (trackUrl.length > 0) {
        components = [{ type: 'body', parameters: [{ type: 'text', text: trackUrl }] }]
      }
    } else {
      // Legacy (null): inject if message provided
      if (trackUrl.length > 0) {
        components = [{ type: 'body', parameters: [{ type: 'text', text: trackUrl }] }]
      }
    }

    const payload = {
      from: cfg.from,
      to: input.to,
      type: 'template',
      template: {
        name: cfg.templateName,
        language: { code: cfg.templateLangCode },
        ...(components.length > 0 ? { components } : {}),
      },
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
