import { getOrCreateSettings } from '../lib/settings'
import { MockWhatsAppProvider } from './mockProvider'
import { YCloudWhatsAppProvider } from './ycloudProvider'
import type { WhatsAppProvider } from './types'

export async function getWhatsAppProvider(): Promise<WhatsAppProvider> {
  const settings = await getOrCreateSettings()
  switch (settings.whatsappProvider) {
    case 'mock':
      return new MockWhatsAppProvider()
    case 'ycloud':
      return new YCloudWhatsAppProvider()
    default:
      return new MockWhatsAppProvider()
  }
}

