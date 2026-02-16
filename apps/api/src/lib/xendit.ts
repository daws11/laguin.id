import { getOrCreateSettings, maybeDecrypt } from './settings'

type CreateInvoiceParams = {
  externalId: string
  amount: number
  payerEmail?: string | null
  description: string
  successRedirectUrl?: string
  failureRedirectUrl?: string
}

type XenditInvoiceResponse = {
  id: string
  external_id: string
  invoice_url: string
  status: string
  amount: number
}

export async function getXenditSecretKey(): Promise<string | null> {
  const settings = await getOrCreateSettings()
  return maybeDecrypt((settings as any).xenditSecretKeyEnc) ?? null
}

export async function getXenditWebhookToken(): Promise<string | null> {
  const settings = await getOrCreateSettings()
  return (settings as any).xenditWebhookToken ?? null
}

export async function createXenditInvoice(params: CreateInvoiceParams): Promise<XenditInvoiceResponse> {
  const secretKey = await getXenditSecretKey()
  if (!secretKey) {
    throw new Error('Xendit secret key is not configured')
  }

  const authHeader = Buffer.from(secretKey + ':').toString('base64')

  const body: Record<string, unknown> = {
    external_id: params.externalId,
    amount: params.amount,
    description: params.description,
    currency: 'IDR',
    invoice_duration: 86400,
  }
  if (params.payerEmail) body.payer_email = params.payerEmail
  if (params.successRedirectUrl) body.success_redirect_url = params.successRedirectUrl
  if (params.failureRedirectUrl) body.failure_redirect_url = params.failureRedirectUrl

  const response = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authHeader}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Xendit API error (${response.status}): ${errorBody}`)
  }

  return response.json() as Promise<XenditInvoiceResponse>
}

export function verifyXenditWebhookToken(headerToken: string, storedToken: string): boolean {
  if (!storedToken || !headerToken) return false
  return headerToken === storedToken
}
