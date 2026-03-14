import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'
import { encryptString } from '../lib/crypto'
import { getOrCreateSettings, maybeDecrypt } from '../lib/settings'
import { invalidateStorageBackend } from '../lib/objectStorage'

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
  metaCapiEnabled: z.boolean().optional(),
  metaCapiAccessToken: z.string().min(1).optional(),
  metaCapiTestEventCode: z.string().optional().nullable(),

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
  ycloudWebhookSecret: z.string().min(1).optional(),
  ycloudLinkMessage: z.string().optional().nullable(),
  ycloudTemplateHasButton: z.boolean().optional().nullable(),

  reminderTemplates: z
    .array(
      z.object({
        label: z.string().min(1),
        delayMinutes: z.number().int().min(1),
        templateName: z.string().min(1),
        templateLangCode: z.string().min(1),
      }),
    )
    .optional(),

  // Site base URL used for WhatsApp delivery links (stored in whatsappConfig.siteUrl)
  siteUrl: z.string().url().optional().nullable(),

  // S3-compatible object storage (Cloudflare R2, AWS S3, MinIO, etc.)
  s3Endpoint: z.string().url().optional().nullable(),
  s3Bucket: z.string().min(1).optional().nullable(),
  s3AccessKey: z.string().min(1).optional(),
  s3SecretKey: z.string().min(1).optional(),
  s3Region: z.string().optional().nullable(),

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
  app.get('/settings/whatsapp/templates', async (_req, reply) => {
    const s = await getOrCreateSettings()
    const cfg = (s.whatsappConfig && typeof s.whatsappConfig === 'object' ? s.whatsappConfig : null) ?? {}
    const ycloud = (cfg as any).ycloud ?? {}
    const apiKey = maybeDecrypt(ycloud.apiKeyEnc ?? ycloud.apiKey)
    if (!apiKey) return reply.code(400).send({ error: 'missing_api_key', message: 'YCloud API key not configured.' })
    try {
      const res = await fetch('https://api.ycloud.com/v2/whatsapp/templates?pageSize=100', {
        headers: { 'X-API-Key': apiKey },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        return reply.code(res.status).send({ error: 'ycloud_error', message: JSON.stringify(body) })
      }
      const json = (await res.json()) as any
      const items = Array.isArray(json?.items) ? json.items : []
      const templates = items.map((t: any) => {
        const components: any[] = Array.isArray(t.components) ? t.components : []
        const buttonsComp = components.find((c: any) => c.type === 'BUTTONS')
        const hasButton = Array.isArray(buttonsComp?.buttons) && buttonsComp.buttons.length > 0
        const bodyComp = components.find((c: any) => c.type === 'BODY')
        return {
          name: t.name,
          language: t.language,
          status: t.status,
          category: t.category,
          hasButton,
          buttons: hasButton ? (buttonsComp.buttons as any[]).map((b: any) => ({ type: b.type, text: b.text })) : [],
          bodyText: bodyComp?.text ?? null,
        }
      })
      return { templates }
    } catch (err: any) {
      return reply.code(500).send({ error: 'fetch_error', message: err?.message ?? 'Unknown error' })
    }
  })

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
      hasYcloudWebhookSecret: Boolean(maybeDecrypt(ycloud.webhookSecretEnc)),
      siteUrl: typeof (cfg as any).siteUrl === 'string' ? (cfg as any).siteUrl : null,
      ycloudLinkMessage: typeof (cfg as any).linkMessage === 'string' ? (cfg as any).linkMessage : null,
      ycloudTemplateHasButton: typeof ycloud.templateHasButton === 'boolean' ? ycloud.templateHasButton : null,
      ycloudWebhookUrl: (() => {
        const secret = maybeDecrypt(ycloud.webhookSecretEnc)
        const base = '/api/ycloud/webhook'
        return secret ? `${base}?token=${encodeURIComponent(secret)}` : base
      })(),
      reminderTemplates: Array.isArray((cfg as any).reminderTemplates) ? (cfg as any).reminderTemplates : [],
      defaultThemeSlug: s.defaultThemeSlug ?? null,
      showThemesInFooter: s.showThemesInFooter ?? false,
      metaPixelId: s.metaPixelId ?? null,
      metaPixelWishlistId: s.metaPixelWishlistId ?? null,
      metaPixelStep1Script: (s as any).metaPixelStep1Script ?? null,
      metaPixelStep4Script: (s as any).metaPixelStep4Script ?? null,
      metaPixelConfirmScript: (s as any).metaPixelConfirmScript ?? null,
      metaCapiEnabled: (s as any).metaCapiEnabled ?? false,
      hasMetaCapiToken: Boolean(maybeDecrypt((s as any).metaCapiAccessTokenEnc)),
      metaCapiTestEventCode: (s as any).metaCapiTestEventCode ?? null,
      hasXenditKey: Boolean(maybeDecrypt((s as any).xenditSecretKeyEnc)),
      xenditWebhookToken: (s as any).xenditWebhookToken ?? null,
      allowMultipleOrdersPerWhatsapp: (s as any).allowMultipleOrdersPerWhatsapp ?? false,
      kieAiCallbackUrl: process.env.KIE_AI_CALLBACK_URL || (() => {
        const siteUrl = (cfg as any).siteUrl
        return typeof siteUrl === 'string' && siteUrl.startsWith('http')
          ? `${siteUrl.replace(/\/+$/, '')}/api/kie/callback`
          : null
      })(),

      s3Endpoint: (s as any).s3Endpoint ?? null,
      s3Bucket: (s as any).s3Bucket ?? null,
      hasS3AccessKey: Boolean(maybeDecrypt((s as any).s3AccessKeyEnc)),
      hasS3SecretKey: Boolean(maybeDecrypt((s as any).s3SecretKeyEnc)),
      s3Region: (s as any).s3Region ?? null,

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
    if (parsed.data.ycloudWebhookSecret) nextYcloud.webhookSecretEnc = encryptString(parsed.data.ycloudWebhookSecret)
    if (parsed.data.ycloudTemplateHasButton !== undefined) nextYcloud.templateHasButton = parsed.data.ycloudTemplateHasButton

    const nextCfg: any = { ...currentCfg, ycloud: nextYcloud }
    if (parsed.data.siteUrl !== undefined) nextCfg.siteUrl = parsed.data.siteUrl ?? null
    if (parsed.data.ycloudLinkMessage !== undefined) nextCfg.linkMessage = parsed.data.ycloudLinkMessage ?? null
    if (parsed.data.reminderTemplates !== undefined) nextCfg.reminderTemplates = parsed.data.reminderTemplates

    const mergedWhatsappConfig =
      parsed.data.whatsappConfig !== undefined
        ? (parsed.data.whatsappConfig as any)
        : nextCfg

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
      metaCapiEnabled: parsed.data.metaCapiEnabled,
      metaCapiTestEventCode: parsed.data.metaCapiTestEventCode,
      allowMultipleOrdersPerWhatsapp: parsed.data.allowMultipleOrdersPerWhatsapp,
    }

    if (parsed.data.openaiModel !== undefined) data.openaiModel = parsed.data.openaiModel
    if (parsed.data.openaiApiKey) data.openaiApiKeyEnc = encryptString(parsed.data.openaiApiKey)
    if (parsed.data.kaiAiApiKey) data.kaiAiApiKeyEnc = encryptString(parsed.data.kaiAiApiKey)
    if (parsed.data.xenditSecretKey) data.xenditSecretKeyEnc = encryptString(parsed.data.xenditSecretKey)
    if (parsed.data.xenditWebhookToken !== undefined) data.xenditWebhookToken = parsed.data.xenditWebhookToken

    // S3 storage
    let s3Changed = false
    if (parsed.data.s3Endpoint !== undefined) { data.s3Endpoint = parsed.data.s3Endpoint; s3Changed = true }
    if (parsed.data.s3Bucket !== undefined) { data.s3Bucket = parsed.data.s3Bucket; s3Changed = true }
    if (parsed.data.s3AccessKey) { data.s3AccessKeyEnc = encryptString(parsed.data.s3AccessKey); s3Changed = true }
    if (parsed.data.s3SecretKey) { data.s3SecretKeyEnc = encryptString(parsed.data.s3SecretKey); s3Changed = true }
    if (parsed.data.s3Region !== undefined) { data.s3Region = parsed.data.s3Region; s3Changed = true }
    if (s3Changed) invalidateStorageBackend()

    if (parsed.data.emailProvider !== undefined) data.emailProvider = parsed.data.emailProvider
    if (parsed.data.smtpHost !== undefined) data.smtpHost = parsed.data.smtpHost
    if (parsed.data.smtpPort !== undefined) data.smtpPort = parsed.data.smtpPort
    if (parsed.data.smtpSecure !== undefined) data.smtpSecure = parsed.data.smtpSecure
    if (parsed.data.smtpUser !== undefined) data.smtpUser = parsed.data.smtpUser
    if (parsed.data.smtpPass) data.smtpPassEnc = encryptString(parsed.data.smtpPass)
    if (parsed.data.smtpFrom !== undefined) data.smtpFrom = parsed.data.smtpFrom
    if (parsed.data.resendApiKey) data.resendApiKeyEnc = encryptString(parsed.data.resendApiKey)
    if (parsed.data.resendFrom !== undefined) data.resendFrom = parsed.data.resendFrom
    if (parsed.data.metaCapiAccessToken) data.metaCapiAccessTokenEnc = encryptString(parsed.data.metaCapiAccessToken)

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
      hasYcloudWebhookSecret: Boolean(maybeDecrypt(ycloud.webhookSecretEnc)),
      siteUrl: typeof (cfg as any).siteUrl === 'string' ? (cfg as any).siteUrl : null,
      ycloudLinkMessage: typeof (cfg as any).linkMessage === 'string' ? (cfg as any).linkMessage : null,
      ycloudTemplateHasButton: typeof ycloud.templateHasButton === 'boolean' ? ycloud.templateHasButton : null,
      ycloudWebhookUrl: (() => {
        const secret = maybeDecrypt(ycloud.webhookSecretEnc)
        const base = '/api/ycloud/webhook'
        return secret ? `${base}?token=${encodeURIComponent(secret)}` : base
      })(),
      reminderTemplates: Array.isArray((cfg as any).reminderTemplates) ? (cfg as any).reminderTemplates : [],
      defaultThemeSlug: updated.defaultThemeSlug ?? null,
      showThemesInFooter: updated.showThemesInFooter ?? false,
      metaPixelId: updated.metaPixelId ?? null,
      metaPixelWishlistId: updated.metaPixelWishlistId ?? null,
      metaPixelStep1Script: (updated as any).metaPixelStep1Script ?? null,
      metaPixelStep4Script: (updated as any).metaPixelStep4Script ?? null,
      metaPixelConfirmScript: (updated as any).metaPixelConfirmScript ?? null,
      metaCapiEnabled: (updated as any).metaCapiEnabled ?? false,
      hasMetaCapiToken: Boolean(maybeDecrypt((updated as any).metaCapiAccessTokenEnc)),
      metaCapiTestEventCode: (updated as any).metaCapiTestEventCode ?? null,
      allowMultipleOrdersPerWhatsapp: (updated as any).allowMultipleOrdersPerWhatsapp ?? false,
      kieAiCallbackUrl: process.env.KIE_AI_CALLBACK_URL || (() => {
        const siteUrl = (cfg as any).siteUrl
        return typeof siteUrl === 'string' && siteUrl.startsWith('http')
          ? `${siteUrl.replace(/\/+$/, '')}/api/kie/callback`
          : null
      })(),

      s3Endpoint: (updated as any).s3Endpoint ?? null,
      s3Bucket: (updated as any).s3Bucket ?? null,
      hasS3AccessKey: Boolean(maybeDecrypt((updated as any).s3AccessKeyEnc)),
      hasS3SecretKey: Boolean(maybeDecrypt((updated as any).s3SecretKeyEnc)),
      s3Region: (updated as any).s3Region ?? null,

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

