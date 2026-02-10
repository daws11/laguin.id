import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'
import { encryptString } from '../lib/crypto'
import { getOrCreateSettings, maybeDecrypt } from '../lib/settings'

const UpdateSchema = z.object({
  instantEnabled: z.boolean().optional(),
  deliveryDelayHours: z.number().int().min(0).optional(),
  paymentsEnabled: z.boolean().optional(),
  whatsappProvider: z.string().min(1).optional(),
  whatsappConfig: z.unknown().optional(),
  publicSiteConfig: z.unknown().optional(),

  openaiApiKey: z.string().min(1).optional(),
  kaiAiApiKey: z.string().min(1).optional(),

  // YCloud WhatsApp gateway settings (stored inside Settings.whatsappConfig.ycloud)
  ycloudFrom: z.string().min(1).optional(),
  ycloudTemplateName: z.string().min(1).optional(),
  ycloudTemplateLangCode: z.string().min(1).optional(),
  ycloudApiKey: z.string().min(1).optional(),
})

export const adminSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/settings', async () => {
    const s = await getOrCreateSettings()
    const cfg = (s.whatsappConfig && typeof s.whatsappConfig === 'object' ? s.whatsappConfig : null) ?? {}
    const ycloud = (cfg as any).ycloud ?? {}
    return {
      id: s.id,
      instantEnabled: s.instantEnabled,
      deliveryDelayHours: s.deliveryDelayHours,
      paymentsEnabled: s.paymentsEnabled,
      whatsappProvider: s.whatsappProvider,
      whatsappConfig: s.whatsappConfig,
      publicSiteConfig: (s as any).publicSiteConfig ?? null,
      hasOpenaiKey: Boolean(maybeDecrypt(s.openaiApiKeyEnc)),
      hasKaiAiKey: Boolean(maybeDecrypt(s.kaiAiApiKeyEnc)),
      ycloudFrom: typeof ycloud.from === 'string' ? ycloud.from : null,
      ycloudTemplateName: typeof ycloud.templateName === 'string' ? ycloud.templateName : null,
      ycloudTemplateLangCode: typeof ycloud.templateLangCode === 'string' ? ycloud.templateLangCode : null,
      hasYcloudKey: Boolean(maybeDecrypt(ycloud.apiKeyEnc ?? ycloud.apiKey)),
    }
  })

  app.put('/settings', async (req, reply) => {
    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })

    const s = await getOrCreateSettings()

    const currentCfg = (s.whatsappConfig && typeof s.whatsappConfig === 'object' ? s.whatsappConfig : null) ?? {}
    const currentYcloud = (currentCfg as any).ycloud ?? {}
    const nextYcloud: any = { ...currentYcloud }
    if (parsed.data.ycloudFrom) nextYcloud.from = parsed.data.ycloudFrom
    if (parsed.data.ycloudTemplateName) nextYcloud.templateName = parsed.data.ycloudTemplateName
    if (parsed.data.ycloudTemplateLangCode) nextYcloud.templateLangCode = parsed.data.ycloudTemplateLangCode
    if (parsed.data.ycloudApiKey) nextYcloud.apiKeyEnc = encryptString(parsed.data.ycloudApiKey)

    const mergedWhatsappConfig =
      parsed.data.whatsappConfig !== undefined
        ? (parsed.data.whatsappConfig as any)
        : ({
            ...currentCfg,
            ycloud: nextYcloud,
          } as any)

    const data: any = {
      instantEnabled: parsed.data.instantEnabled,
      deliveryDelayHours: parsed.data.deliveryDelayHours,
      paymentsEnabled: parsed.data.paymentsEnabled,
      whatsappProvider: parsed.data.whatsappProvider,
      whatsappConfig: mergedWhatsappConfig,
      publicSiteConfig: parsed.data.publicSiteConfig,
    }

    if (parsed.data.openaiApiKey) data.openaiApiKeyEnc = encryptString(parsed.data.openaiApiKey)
    if (parsed.data.kaiAiApiKey) data.kaiAiApiKeyEnc = encryptString(parsed.data.kaiAiApiKey)

    const updated = await prisma.settings.update({
      where: { id: s.id },
      data,
    })

    const cfg = (updated.whatsappConfig && typeof updated.whatsappConfig === 'object' ? updated.whatsappConfig : null) ?? {}
    const ycloud = (cfg as any).ycloud ?? {}
    return {
      id: updated.id,
      instantEnabled: updated.instantEnabled,
      deliveryDelayHours: updated.deliveryDelayHours,
      paymentsEnabled: updated.paymentsEnabled,
      whatsappProvider: updated.whatsappProvider,
      whatsappConfig: updated.whatsappConfig,
      publicSiteConfig: (updated as any).publicSiteConfig ?? null,
      hasOpenaiKey: Boolean(maybeDecrypt(updated.openaiApiKeyEnc)),
      hasKaiAiKey: Boolean(maybeDecrypt(updated.kaiAiApiKeyEnc)),
      ycloudFrom: typeof ycloud.from === 'string' ? ycloud.from : null,
      ycloudTemplateName: typeof ycloud.templateName === 'string' ? ycloud.templateName : null,
      ycloudTemplateLangCode: typeof ycloud.templateLangCode === 'string' ? ycloud.templateLangCode : null,
      hasYcloudKey: Boolean(maybeDecrypt(ycloud.apiKeyEnc ?? ycloud.apiKey)),
    }
  })
}

