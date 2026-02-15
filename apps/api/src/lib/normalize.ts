export function normalizeEmail(email: string | null | undefined) {
  return (email ?? '').trim().toLowerCase()
}

export function digitsOnly(v: string) {
  return String(v ?? '').replace(/\D/g, '')
}

/**
 * Normalizes Indonesian WhatsApp numbers into canonical digits-only format: 62xxxxxxxxxx
 * Accepts variants like: +62..., 62..., 0..., 8...
 */
export function normalizeWhatsappNumber(raw: string) {
  const d = digitsOnly(raw)
  if (!d) return ''

  // Already in 62xxxxxxxxxx format
  if (d.startsWith('62')) return d

  // Local leading 0 → drop and prefix 62
  if (d.startsWith('0')) return `62${d.replace(/^0+/, '')}`

  // Bare local (e.g. 8123...) → prefix 62
  if (d.startsWith('8')) return `62${d}`

  // Fallback: keep digits as-is (best effort)
  return d
}

