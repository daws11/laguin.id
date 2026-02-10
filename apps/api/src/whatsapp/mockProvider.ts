import type { WhatsAppProvider, WhatsAppSendInput, WhatsAppSendResult } from './types'
import { addOrderEvent } from '../lib/events'

export class MockWhatsAppProvider implements WhatsAppProvider {
  name = 'mock'

  async send(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    // This provider is side-effect-free: it only logs to order_events if orderId is embedded.
    // Real providers (Meta/Twilio/etc) can be plugged in later behind this interface.
    const orderId = (input as any).orderId as string | undefined
    if (orderId) {
      await addOrderEvent({
        orderId,
        type: 'whatsapp_mock_send',
        message: `Mock send to ${input.to}`,
        data: { message: input.message, mediaUrl: input.mediaUrl },
      })
    }
    return { ok: true, provider: this.name, providerMessageId: `mock-${Date.now()}` }
  }
}

