import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getOrCreateSettings, maybeDecrypt } from '../lib/settings'

const QuerySchema = z.object({
  theme: z.string().optional(),
})

export const publicSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/public/settings', async (req, reply) => {
    reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    const parsed = QuerySchema.safeParse(req.query)
    const themeSlug = parsed.success ? parsed.data.theme : undefined
    
    const s = await getOrCreateSettings()
    
    let themeSettings: any = null
    if (themeSlug) {
      const theme = await prisma.theme.findUnique({ where: { slug: themeSlug } })
      if (theme && theme.isActive) {
        themeSettings = theme.settings
      }
    }
    
    const cd = themeSettings?.creationDelivery && typeof themeSettings.creationDelivery === 'object' ? themeSettings.creationDelivery as any : null

    return {
      publicSiteConfig: themeSettings ?? s.publicSiteConfig ?? null,
      emailOtpEnabled: cd ? (cd.emailOtpEnabled ?? true) : (s.emailOtpEnabled ?? true),
      whatsappEnabled: cd ? (cd.whatsappEnabled ?? true) : true,
      agreementEnabled: cd ? (cd.agreementEnabled ?? false) : (s.agreementEnabled ?? false),
      instantEnabled: cd ? (cd.instantEnabled ?? true) : (s.instantEnabled ?? true),
      deliveryDelayHours: cd ? (cd.deliveryDelayHours ?? 24) : (s.deliveryDelayHours ?? 24),
      manualConfirmationEnabled: cd ? (cd.manualConfirmationEnabled ?? false) : ((s as any).manualConfirmationEnabled ?? false),
      originalAmount: cd ? (cd.originalAmount ?? 497000) : 497000,
      paymentAmount: cd ? (cd.paymentAmount ?? 497000) : 497000,
      xenditEnabled: Boolean(maybeDecrypt((s as any).xenditSecretKeyEnc)),
      defaultThemeSlug: s.defaultThemeSlug ?? null,
      showThemesInFooter: s.showThemesInFooter ?? false,
      metaPixelId: s.metaPixelId ?? null,
      metaPixelWishlistId: s.metaPixelWishlistId ?? null,
      metaPixelStep1Script: (s as any).metaPixelStep1Script ?? null,
      metaPixelStep4Script: (s as any).metaPixelStep4Script ?? null,
      metaPixelConfirmScript: (s as any).metaPixelConfirmScript ?? null,
    }
  })
  
  app.get('/public/themes', async () => {
    const themes = await prisma.theme.findMany({
      where: { isActive: true },
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    })
    return { themes }
  })
}
