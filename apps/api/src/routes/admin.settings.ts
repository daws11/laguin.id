import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'
import { encryptString } from '../lib/crypto'
import { getOrCreateSettings, maybeDecrypt } from '../lib/settings'

const UpdateSchema = z.object({
  instantEnabled: z.boolean().optional(),
  deliveryDelayHours: z.number().int().min(0).optional(),
  paymentsEnabled: z.boolean().optional(),
  emailOtpEnabled: z.boolean().optional(),
  agreementEnabled: z.boolean().optional(),
  manualConfirmationEnabled: z.boolean().optional(),
  whatsappProvider: z.string().min(1).optional(),
  whatsappConfig: z.unknown().optional(),
  publicSiteConfig: z.unknown().optional(),
  defaultThemeSlug: z.string().optional().nullable(),
  showThemesInFooter: z.boolean().optional(),

  metaPixelId: z.string().optional().nullable(),
  metaPixelWishlistId: z.string().optional().nullable(),
  metaPixelStep1Script: z.string().optional().nullable(),
  metaPixelStep4Script: z.string().optional().nullable(),
  metaPixelConfirmScript: z.string().optional().nullable(),

  openaiApiKey: z.string().min(1).optional(),
  openaiModel: z.string().optional().nullable(),
  kaiAiApiKey: z.string().min(1).optional(),

  xenditSecretKey: z.string().min(1).optional(),
  xenditWebhookToken: z.string().optional().nullable(),
  allowMultipleOrdersPerWhatsapp: z.boolean().optional(),

  // YCloud WhatsApp gateway settings (stored inside Settings.whatsappConfig.ycloud)
  ycloudFrom: z.string().min(1).optional(),
  ycloudTemplateName: z.string().min(1).optional(),
  ycloudTemplateLangCode: z.string().min(1).optional(),
  ycloudApiKey: z.string().min(1).optional(),

  // Email settings
  emailProvider: z.enum(['smtp', 'resend']).optional(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().min(1).optional(),
  smtpFrom: z.string().optional().nullable(),
  resendApiKey: z.string().min(1).optional(),
  resendFrom: z.string().optional().nullable(),
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
      emailOtpEnabled: s.emailOtpEnabled ?? true,
      agreementEnabled: s.agreementEnabled ?? false,
      manualConfirmationEnabled: (s as any).manualConfirmationEnabled ?? false,
      whatsappProvider: s.whatsappProvider,
      whatsappConfig: s.whatsappConfig,
      publicSiteConfig: (s as any).publicSiteConfig ?? null,
      hasOpenaiKey: Boolean(maybeDecrypt(s.openaiApiKeyEnc)),
      openaiModel: s.openaiModel ?? null,
      hasKaiAiKey: Boolean(maybeDecrypt(s.kaiAiApiKeyEnc)),
      ycloudFrom: typeof ycloud.from === 'string' ? ycloud.from : null,
      ycloudTemplateName: typeof ycloud.templateName === 'string' ? ycloud.templateName : null,
      ycloudTemplateLangCode: typeof ycloud.templateLangCode === 'string' ? ycloud.templateLangCode : null,
      hasYcloudKey: Boolean(maybeDecrypt(ycloud.apiKeyEnc ?? ycloud.apiKey)),
      defaultThemeSlug: s.defaultThemeSlug ?? null,
      showThemesInFooter: s.showThemesInFooter ?? false,
      metaPixelId: s.metaPixelId ?? null,
      metaPixelWishlistId: s.metaPixelWishlistId ?? null,
      metaPixelStep1Script: (s as any).metaPixelStep1Script ?? null,
      metaPixelStep4Script: (s as any).metaPixelStep4Script ?? null,
      metaPixelConfirmScript: (s as any).metaPixelConfirmScript ?? null,
      hasXenditKey: Boolean(maybeDecrypt((s as any).xenditSecretKeyEnc)),
      xenditWebhookToken: (s as any).xenditWebhookToken ?? null,
      allowMultipleOrdersPerWhatsapp: (s as any).allowMultipleOrdersPerWhatsapp ?? false,
      kieAiCallbackUrl: process.env.KIE_AI_CALLBACK_URL || null,

      emailProvider: (s as any).emailProvider ?? 'smtp',
      smtpHost: (s as any).smtpHost ?? null,
      smtpPort: (s as any).smtpPort ?? null,
      smtpSecure: (s as any).smtpSecure ?? false,
      smtpUser: (s as any).smtpUser ?? null,
      hasSmtpPass: Boolean(maybeDecrypt((s as any).smtpPassEnc)),
      smtpFrom: (s as any).smtpFrom ?? null,
      hasResendKey: Boolean(maybeDecrypt((s as any).resendApiKeyEnc)),
      resendFrom: (s as any).resendFrom ?? null,
    }
  })

  app.get('/xendit/webhook-logs', async () => {
    const logs = await prisma.xenditWebhookLog.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 20,
      include: {
        order: {
          select: {
            inputPayload: true,
            customer: {
              select: { name: true }
            }
          }
        }
      }
    })
    return { logs }
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
      emailOtpEnabled: parsed.data.emailOtpEnabled,
      agreementEnabled: parsed.data.agreementEnabled,
      manualConfirmationEnabled: parsed.data.manualConfirmationEnabled,
      whatsappProvider: parsed.data.whatsappProvider,
      whatsappConfig: mergedWhatsappConfig,
      publicSiteConfig: parsed.data.publicSiteConfig,
      defaultThemeSlug: parsed.data.defaultThemeSlug,
      showThemesInFooter: parsed.data.showThemesInFooter,
      metaPixelId: parsed.data.metaPixelId,
      metaPixelWishlistId: parsed.data.metaPixelWishlistId,
      metaPixelStep1Script: parsed.data.metaPixelStep1Script,
      metaPixelStep4Script: parsed.data.metaPixelStep4Script,
      metaPixelConfirmScript: parsed.data.metaPixelConfirmScript,
      allowMultipleOrdersPerWhatsapp: parsed.data.allowMultipleOrdersPerWhatsapp,
    }

    if (parsed.data.openaiModel !== undefined) data.openaiModel = parsed.data.openaiModel
    if (parsed.data.openaiApiKey) data.openaiApiKeyEnc = encryptString(parsed.data.openaiApiKey)
    if (parsed.data.kaiAiApiKey) data.kaiAiApiKeyEnc = encryptString(parsed.data.kaiAiApiKey)
    if (parsed.data.xenditSecretKey) data.xenditSecretKeyEnc = encryptString(parsed.data.xenditSecretKey)
    if (parsed.data.xenditWebhookToken !== undefined) data.xenditWebhookToken = parsed.data.xenditWebhookToken

    if (parsed.data.emailProvider !== undefined) data.emailProvider = parsed.data.emailProvider
    if (parsed.data.smtpHost !== undefined) data.smtpHost = parsed.data.smtpHost
    if (parsed.data.smtpPort !== undefined) data.smtpPort = parsed.data.smtpPort
    if (parsed.data.smtpSecure !== undefined) data.smtpSecure = parsed.data.smtpSecure
    if (parsed.data.smtpUser !== undefined) data.smtpUser = parsed.data.smtpUser
    if (parsed.data.smtpPass) data.smtpPassEnc = encryptString(parsed.data.smtpPass)
    if (parsed.data.smtpFrom !== undefined) data.smtpFrom = parsed.data.smtpFrom
    if (parsed.data.resendApiKey) data.resendApiKeyEnc = encryptString(parsed.data.resendApiKey)
    if (parsed.data.resendFrom !== undefined) data.resendFrom = parsed.data.resendFrom

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
      emailOtpEnabled: updated.emailOtpEnabled ?? true,
      agreementEnabled: updated.agreementEnabled ?? false,
      manualConfirmationEnabled: (updated as any).manualConfirmationEnabled ?? false,
      whatsappProvider: updated.whatsappProvider,
      whatsappConfig: updated.whatsappConfig,
      publicSiteConfig: (updated as any).publicSiteConfig ?? null,
      hasOpenaiKey: Boolean(maybeDecrypt(updated.openaiApiKeyEnc)),
      openaiModel: updated.openaiModel ?? null,
      hasKaiAiKey: Boolean(maybeDecrypt(updated.kaiAiApiKeyEnc)),
      ycloudFrom: typeof ycloud.from === 'string' ? ycloud.from : null,
      ycloudTemplateName: typeof ycloud.templateName === 'string' ? ycloud.templateName : null,
      ycloudTemplateLangCode: typeof ycloud.templateLangCode === 'string' ? ycloud.templateLangCode : null,
      hasYcloudKey: Boolean(maybeDecrypt(ycloud.apiKeyEnc ?? ycloud.apiKey)),
      defaultThemeSlug: updated.defaultThemeSlug ?? null,
      showThemesInFooter: updated.showThemesInFooter ?? false,
      metaPixelId: updated.metaPixelId ?? null,
      metaPixelWishlistId: updated.metaPixelWishlistId ?? null,
      metaPixelStep1Script: (updated as any).metaPixelStep1Script ?? null,
      metaPixelStep4Script: (updated as any).metaPixelStep4Script ?? null,
      metaPixelConfirmScript: (updated as any).metaPixelConfirmScript ?? null,
      allowMultipleOrdersPerWhatsapp: (updated as any).allowMultipleOrdersPerWhatsapp ?? false,
      kieAiCallbackUrl: process.env.KIE_AI_CALLBACK_URL || null,

      emailProvider: (updated as any).emailProvider ?? 'smtp',
      smtpHost: (updated as any).smtpHost ?? null,
      smtpPort: (updated as any).smtpPort ?? null,
      smtpSecure: (updated as any).smtpSecure ?? false,
      smtpUser: (updated as any).smtpUser ?? null,
      hasSmtpPass: Boolean(maybeDecrypt((updated as any).smtpPassEnc)),
      smtpFrom: (updated as any).smtpFrom ?? null,
      hasResendKey: Boolean(maybeDecrypt((updated as any).resendApiKeyEnc)),
      resendFrom: (updated as any).resendFrom ?? null,
    }
  })
}

