import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getOrCreateSettings } from '../lib/settings'

const QuerySchema = z.object({
  theme: z.string().optional(),
})

export const publicSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/public/settings', async (req) => {
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
    
    return {
      publicSiteConfig: themeSettings ?? s.publicSiteConfig ?? null,
      emailOtpEnabled: s.emailOtpEnabled ?? true,
      agreementEnabled: s.agreementEnabled ?? false,
      instantEnabled: s.instantEnabled ?? true,
      deliveryDelayHours: s.deliveryDelayHours ?? 24,
      manualConfirmationEnabled: (s as any).manualConfirmationEnabled ?? false,
      defaultThemeSlug: s.defaultThemeSlug ?? null,
      showThemesInFooter: s.showThemesInFooter ?? false,
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
