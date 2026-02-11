import type { FastifyPluginAsync } from 'fastify'

import { getOrCreateSettings } from '../lib/settings'

export const publicSettingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/public/settings', async () => {
    const s = await getOrCreateSettings()
    return {
      publicSiteConfig: s.publicSiteConfig ?? null,
      emailOtpEnabled: s.emailOtpEnabled ?? true,
      agreementEnabled: s.agreementEnabled ?? false,
      instantEnabled: s.instantEnabled ?? true,
      deliveryDelayHours: s.deliveryDelayHours ?? 24,
    }
  })
}

