import crypto from 'node:crypto'

type MetaCapiEventName = 'PageView' | 'ViewContent' | 'InitiateCheckout' | 'Lead' | 'CompleteRegistration' | 'Purchase'

function envBool(v: string | undefined) {
  const s = (v ?? '').trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on'
}

function normalizeForHash(v: string | undefined | null) {
  const s = (v ?? '').trim().toLowerCase()
  return s || null
}

function sha256Hex(v: string) {
  return crypto.createHash('sha256').update(v).digest('hex')
}

function parseCookieHeader(cookieHeader: string | undefined) {
  const out: Record<string, string> = {}
  const raw = (cookieHeader ?? '').trim()
  if (!raw) return out
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.split('=')
    const key = (k ?? '').trim()
    if (!key) continue
    out[key] = rest.join('=').trim()
  }
  return out
}

function getEventSourceUrl(req: any) {
  const referer = String(req?.headers?.referer ?? '').trim()
  if (referer) return referer
  const origin = String(req?.headers?.origin ?? '').trim()
  // If no referer, at least give Meta the site origin.
  return origin || undefined
}

export function isMetaCapiEnabled() {
  return envBool(process.env.META_CAPI_ENABLED)
}

export function getMetaPixelId() {
  return (process.env.META_PIXEL_ID ?? '').trim()
}

export function getMetaCapiAccessToken() {
  return (process.env.META_CAPI_ACCESS_TOKEN ?? '').trim()
}

export async function sendMetaCapiEvent(params: {
  req: any
  eventName: MetaCapiEventName
  eventId?: string
  email?: string | null
  phone?: string | null
  externalId?: string | null
  customData?: Record<string, any>
}) {
  if (!isMetaCapiEnabled()) return

  const pixelId = getMetaPixelId()
  const accessToken = getMetaCapiAccessToken()
  if (!pixelId || !accessToken) return

  const { req, eventName, eventId, email, phone, externalId, customData } = params

  const emailNorm = normalizeForHash(email)
  const phoneNorm = normalizeForHash(phone)
  const externalIdNorm = normalizeForHash(externalId)

  const cookies = parseCookieHeader(req?.headers?.cookie)
  const fbp = (cookies?._fbp ?? '').trim() || undefined
  const fbc = (cookies?._fbc ?? '').trim() || undefined

  // Fastify exposes req.ip, but fall back to forwarded-for.
  const ip =
    (typeof req?.ip === 'string' && req.ip.trim()) ||
    String(req?.headers?.['x-forwarded-for'] ?? '')
      .split(',')[0]
      ?.trim() ||
    undefined

  const ua = String(req?.headers?.['user-agent'] ?? '').trim() || undefined

  const body = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: getEventSourceUrl(req),
        user_data: {
          em: emailNorm ? [sha256Hex(emailNorm)] : undefined,
          ph: phoneNorm ? [sha256Hex(phoneNorm)] : undefined,
          external_id: externalIdNorm ? [sha256Hex(externalIdNorm)] : undefined,
          client_ip_address: ip,
          client_user_agent: ua,
          fbp,
          fbc,
        },
        custom_data: customData,
      },
    ],
    // Optional: allows validating events in Events Manager without impacting production reporting
    test_event_code: (process.env.META_CAPI_TEST_EVENT_CODE ?? '').trim() || undefined,
  }

  const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3500)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      req?.log?.warn?.({ status: res.status, text }, 'meta_capi_failed')
    }
  } catch (e: any) {
    req?.log?.warn?.({ err: e?.message ?? String(e) }, 'meta_capi_error')
  } finally {
    clearTimeout(timeout)
  }
}

