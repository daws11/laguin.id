import type { OrderInput } from 'shared'

export const CONFIG_DRAFT_STORAGE_KEY = 'laguin:config_draft:v1'

export type PersistedConfigDraft = {
  v: 1
  draftKey?: string | null
  step: number
  relationship: string
  emailVerificationId: string | null
  formValues: Partial<OrderInput>
  updatedAt: number
}

export function fmtCurrency(amt: number) {
  if (amt === 0) return 'GRATIS'
  if (amt >= 100000 && amt < 1000000) {
    return `Rp ${Math.floor(amt / 1000)}rb`
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amt)
}

export function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    return e.message
  }
  return fallback
}

export function getPersistableFormValues(values: Partial<OrderInput>): Partial<OrderInput> {
  return {
    yourName: values.yourName,
    recipientName: values.recipientName,
    occasion: values.occasion,
    story: values.story,
    musicPreferences: values.musicPreferences,
    whatsappNumber: values.whatsappNumber,
    email: values.email,
    extraNotes: values.extraNotes,
  }
}

export function hasMeaningfulDraft(values: Partial<OrderInput>): boolean {
  const s = (v: unknown) => String(v ?? '').trim()
  return Boolean(
    s(values.recipientName) ||
      s(values.email) ||
      s(values.whatsappNumber) ||
      s(values.story) ||
      s(values.extraNotes)
  )
}

export function generateDraftKey(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''

export function resolveAsset(v: string): string {
  const s = (v ?? '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return apiBase + s
}
