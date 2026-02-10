export type WhatsAppSendInput = {
  to: string
  message: string
  mediaUrl?: string
}

export type WhatsAppSendResult = {
  ok: boolean
  provider: string
  providerMessageId?: string
  error?: string
}

export interface WhatsAppProvider {
  name: string
  send(input: WhatsAppSendInput): Promise<WhatsAppSendResult>
}

