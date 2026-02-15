import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Controller, useForm, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { OrderInputSchema, type OrderInput } from 'shared'
import { apiGet, apiPost } from '@/lib/http'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { SelectionChip } from '@/components/ui/selection-chip' // Adjust import path if needed
import { VibeCard } from '@/components/ui/vibe-card' // Adjust import path
import { PromptChip } from '@/components/ui/prompt-chip' // Adjust import path
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import {
  Heart,
  Music,
  PenLine,
  ShieldCheck,
  Clock,
  ChevronLeft,
  Timer,
  Sparkles,
  Zap,
  PartyPopper,
  Mail,
  Loader2,
  Check,
  Megaphone,
  ChevronDown
} from 'lucide-react'

type PersistedConfigDraft = {
  v: 1
  draftKey?: string | null
  step: number
  relationship: string
  emailVerificationId: string | null
  formValues: Partial<OrderInput>
  updatedAt: number
}

const CONFIG_DRAFT_STORAGE_KEY = 'laguin:config_draft:v1'

export function ConfigRoute() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isHydrated, setIsHydrated] = useState(false)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [relationship, setRelationship] = useState('Pasangan')
  const storyTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [instantEnabled, setInstantEnabled] = useState<boolean | null>(null)
  const [deliveryDelayHours, setDeliveryDelayHours] = useState<number | null>(null)
  const [manualConfirmationEnabled, setManualConfirmationEnabled] = useState(false)
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false)

  // Countdown timer logic to match LandingRoute
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0 })

  const deliveryEta = useMemo(() => {
    if (instantEnabled) {
      return { label: '10–30 menit', sentenceLower: 'dalam 10–30 menit', short: '10–30 menit' }
    }
    const hRaw = deliveryDelayHours
    const h = typeof hRaw === 'number' && Number.isFinite(hRaw) && hRaw > 0 ? hRaw : 24
    const hText = Number.isInteger(h) ? String(h) : String(h)
    return { label: `Dalam ${hText} jam`, sentenceLower: `dalam ${hText} jam`, short: `${hText} jam` }
  }, [deliveryDelayHours, instantEnabled])

  useEffect(() => {
    // Target date: February 14, 2026 (or next Feb 14)
    // Adjust year dynamically to always point to next Valentine's
    const now = new Date()
    let targetYear = now.getFullYear()
    // If today is past Feb 14, target next year
    if (now.getMonth() > 1 || (now.getMonth() === 1 && now.getDate() > 14)) {
      targetYear++
    }
    const targetDate = new Date(`${targetYear}-02-14T00:00:00`)

    const updateTimer = () => {
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0 })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      setTimeLeft({ days, hours, mins })
    }

    updateTimer() // Initial call
    const timer = setInterval(updateTimer, 60000) // Update every minute is enough for this view
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    apiGet<{
      emailOtpEnabled?: boolean
      agreementEnabled?: boolean
      publicSiteConfig?: unknown
      instantEnabled?: boolean
      deliveryDelayHours?: number
      manualConfirmationEnabled?: boolean
    }>('/api/public/settings')
      .then((res) => {
        if (cancelled) return
        setEmailOtpEnabled(res?.emailOtpEnabled ?? true)
        setAgreementEnabled(res?.agreementEnabled ?? false)
        setInstantEnabled(typeof res?.instantEnabled === 'boolean' ? res.instantEnabled : null)
        setDeliveryDelayHours(typeof res?.deliveryDelayHours === 'number' ? res.deliveryDelayHours : null)
        setManualConfirmationEnabled(Boolean(res?.manualConfirmationEnabled))
        
        // Resolve hero video URL
        type PublicSiteConfigMaybe = { landing?: { heroMedia?: { videoUrl?: unknown } } }
        const publicSiteConfig = res?.publicSiteConfig
        const landing =
          publicSiteConfig && typeof publicSiteConfig === 'object'
            ? (publicSiteConfig as PublicSiteConfigMaybe).landing
            : undefined
        const heroMedia = landing?.heroMedia
        const rawVideoUrl = heroMedia?.videoUrl
        if (typeof rawVideoUrl === 'string' && rawVideoUrl.trim()) {
           const s = rawVideoUrl.trim()
           const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''
           const resolved = /^https?:\/\//i.test(s) ? s : apiBase + s
           setHeroVideoUrl(resolved)
        }

        setSettingsLoaded(true)
      })
      .catch(() => {
        if (!cancelled) {
          setEmailOtpEnabled(true)
          setSettingsLoaded(true)
        }
      })
    return () => { cancelled = true }
  }, [])

  // Email verification (OTP) state for checkout step
  const [emailOtpEnabled, setEmailOtpEnabled] = useState(true)
  const [agreementEnabled, setAgreementEnabled] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [agreementAccepted, setAgreementAccepted] = useState(true)
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null)
  const [emailVerificationId, setEmailVerificationId] = useState<string | null>(null)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', ''])
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [resendCooldownSec, setResendCooldownSec] = useState(0)

  // Server-side draft persistence (best-effort).
  const [draftKey, setDraftKey] = useState<string | null>(null)
  const draftKeyRef = useRef<string | null>(null)
  useEffect(() => {
    draftKeyRef.current = draftKey
  }, [draftKey])

  const DEFAULT_ORDER_INPUT: OrderInput = {
    yourName: undefined,
    recipientName: '',
    occasion: '',
    story: '',
    musicPreferences: {
      genre: 'Pop Ballad',
      mood: '',
      vibe: '',
      tempo: '',
      voiceStyle: 'Surprise me',
      language: 'Indonesian',
    },
    whatsappNumber: '',
    email: undefined,
    emailVerificationId: undefined,
    extraNotes: '',
  }

  const getErrorMessage = (e: unknown, fallback: string): string => {
    if (e instanceof Error && e.message) return e.message
    if (typeof e === 'string') return e
    if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
      return e.message
    }
    return fallback
  }

  const form = useForm<OrderInput>({
    // NOTE: keep build stable across Zod typings changes between deps.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(OrderInputSchema as any),
    mode: 'onTouched',
    defaultValues: DEFAULT_ORDER_INPUT,
  })

  const { watch, setValue, register, formState: { errors } } = form
  const recipientName = watch('recipientName')
  const genre = watch('musicPreferences.genre')
  const language = watch('musicPreferences.language')
  const storyText = watch('story') ?? ''
  const email = (watch('email') ?? '').trim()
  const hasEnteredOtp = otpDigits.some((d) => Boolean(d))
  const storyRegister = register('story')

  const didHydrateDraftRef = useRef(false)
  const suppressOtpResetOnceRef = useRef(false)

  function generateDraftKey() {
    const uuid = globalThis.crypto?.randomUUID?.()
    if (uuid) return uuid
    // Fallback: long-enough opaque token (best-effort).
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
  }

  function getOrCreateDraftKey() {
    if (draftKeyRef.current) return draftKeyRef.current
    const next = generateDraftKey()
    draftKeyRef.current = next
    setDraftKey(next)
    return next
  }

  const getPersistableFormValues = (values: Partial<OrderInput>): Partial<OrderInput> => ({
    yourName: values.yourName,
    recipientName: values.recipientName,
    occasion: values.occasion,
    story: values.story,
    musicPreferences: values.musicPreferences,
    whatsappNumber: values.whatsappNumber,
    email: values.email,
    extraNotes: values.extraNotes,
  })

  const hasMeaningfulDraft = (values: Partial<OrderInput>) => {
    const s = (v: unknown) => String(v ?? '').trim()
    return Boolean(
      s(values.recipientName) ||
        s(values.email) ||
        s(values.whatsappNumber) ||
        s(values.story) ||
        s(values.extraNotes)
    )
  }

  const serverDraftSyncTimerRef = useRef<number | null>(null)
  const lastServerDraftSyncJsonRef = useRef<string>('')

  const scheduleServerDraftSync = (values: Partial<OrderInput>) => {
    if (!didHydrateDraftRef.current) return
    if (!hasMeaningfulDraft(values) && step <= 0) return

    const key = getOrCreateDraftKey()
    const formValues = getPersistableFormValues(values)
    const payload = {
      draftKey: key,
      step,
      relationship,
      emailVerificationId,
      formValues,
    }
    const json = JSON.stringify(payload)
    if (json === lastServerDraftSyncJsonRef.current) return

    if (serverDraftSyncTimerRef.current) {
      window.clearTimeout(serverDraftSyncTimerRef.current)
    }
    serverDraftSyncTimerRef.current = window.setTimeout(() => {
      void apiPost('/api/order-drafts/upsert', payload)
        .then(() => {
          lastServerDraftSyncJsonRef.current = json
        })
        .catch(() => {
          // Best-effort only (offline / server error / rate limit)
        })
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (serverDraftSyncTimerRef.current) window.clearTimeout(serverDraftSyncTimerRef.current)
    }
  }, [])

  const saveDraft = (values: Partial<OrderInput>) => {
    if (!didHydrateDraftRef.current) return
    try {
      const formValues = getPersistableFormValues(values)
      const key = (hasMeaningfulDraft(values) || step > 0) ? getOrCreateDraftKey() : (draftKeyRef.current ?? null)

      const payload: PersistedConfigDraft = {
        v: 1,
        draftKey: key,
        step,
        relationship,
        emailVerificationId,
        formValues,
        updatedAt: Date.now(),
      }

      window.localStorage.setItem(CONFIG_DRAFT_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Best-effort only (private mode / quota exceeded / JSON issues)
    }

    // Best-effort server persistence.
    scheduleServerDraftSync(values)
  }

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(CONFIG_DRAFT_STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  // Hydrate draft on first mount so user can continue after closing tab/browser.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CONFIG_DRAFT_STORAGE_KEY)
      let parsed: Partial<PersistedConfigDraft> = {}
      
      if (raw) {
        try {
           const p = JSON.parse(raw)
           if (p && p.v === 1) parsed = p
        } catch {
           // ignore invalid json
        }
      }

      const savedStep = Number.isFinite(parsed.step) ? Math.max(0, Math.min(4, parsed.step as number)) : 0
      
      // Prefer URL step if available and valid
      const urlStepParam = searchParams.get('step')
      let initialStep = savedStep
      if (urlStepParam !== null) {
         const s = Number(urlStepParam)
         if (!isNaN(s) && s >= 0 && s <= 4) {
            initialStep = s
         }
      }

      const nextRelationship = typeof parsed.relationship === 'string' && parsed.relationship ? parsed.relationship : 'Pasangan'
      const nextEmailVerificationId = typeof parsed.emailVerificationId === 'string' ? parsed.emailVerificationId : null
      const nextDraftKey = typeof parsed.draftKey === 'string' && parsed.draftKey ? parsed.draftKey : null

      const fv = (parsed.formValues ?? {}) as Partial<OrderInput>
      const merged: OrderInput = {
        ...DEFAULT_ORDER_INPUT,
        ...fv,
        musicPreferences: {
          ...DEFAULT_ORDER_INPUT.musicPreferences,
          ...(fv.musicPreferences ?? {}),
          voiceStyle: fv.musicPreferences?.voiceStyle || DEFAULT_ORDER_INPUT.musicPreferences.voiceStyle,
        },
        emailVerificationId: DEFAULT_ORDER_INPUT.emailVerificationId,
      }

      setStep(initialStep)
      setRelationship(nextRelationship)
      setEmailVerificationId(nextEmailVerificationId)
      if (nextDraftKey) {
        draftKeyRef.current = nextDraftKey
        setDraftKey(nextDraftKey)
      } else {
        // Backfill draftKey for older local drafts (v1 without draftKey).
        const created = generateDraftKey()
        draftKeyRef.current = created
        setDraftKey(created)
      }
      suppressOtpResetOnceRef.current = true
      form.reset(merged)
    } catch {
      // ignore and continue with defaults
    } finally {
      didHydrateDraftRef.current = true
      setIsHydrated(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If we have a persisted `emailVerificationId`, re-check it server-side so refresh doesn't force OTP again.
  // Validity is bounded by the OTP record expiry (e.g. 10 minutes).
  useEffect(() => {
    if (!didHydrateDraftRef.current) return
    if (!settingsLoaded || !emailOtpEnabled) return
    if (!emailVerificationId) return
    if (!email) return

    let cancelled = false
    type StatusRes = { ok: true; verified: boolean; expired: boolean; email: string; expiresAt: string }

    apiGet<StatusRes>(`/api/email-verification/status/${encodeURIComponent(emailVerificationId)}`)
      .then((res) => {
        if (cancelled) return
        const expected = email.trim().toLowerCase()
        const actual = String(res?.email ?? '').trim().toLowerCase()

        if (res?.ok && res.verified && !res.expired && actual === expected) {
          // Email sudah terverifikasi - set state dan form value
          setEmailVerified(true)
          setValue('emailVerificationId', emailVerificationId)
          setOtpError(null)
          // Clear OTP digits karena sudah tidak diperlukan
          setOtpDigits(['', '', '', ''])
          return
        }

        // Not verified (or expired/mismatch) → keep UI in "unverified" state.
        setEmailVerified(false)
        setValue('emailVerificationId', '')

        // If expired/mismatch/not found, clear verification id so user must request a new OTP.
        if (!res?.ok || res.expired || (actual && actual !== expected)) {
          setEmailVerificationId(null)
          setOtpDigits(['', '', '', ''])
          setOtpError(null)
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        // Best-effort only. If the server says it doesn't exist, force re-request.
        const msg = getErrorMessage(e, '')
        if (msg === 'not_found') {
          setEmailVerified(false)
          setValue('emailVerificationId', '')
          setEmailVerificationId(null)
          setOtpDigits(['', '', '', ''])
          setOtpError(null)
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, emailOtpEnabled, emailVerificationId, email])

  // Persist on any form change (best-effort).
  useEffect(() => {
    const sub = form.watch((values) => saveDraft(values as Partial<OrderInput>))
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, step, relationship, emailVerificationId])

  // Persist when non-form state changes (step/relationship/OTP start).
  useEffect(() => {
    const currentUrlStep = searchParams.get('step')
    if (currentUrlStep !== String(step)) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('step', String(step))
        return next
      }, { replace: true })
    }
    saveDraft(form.getValues())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, relationship, emailVerificationId])

  // Derived state for dynamic titles
  const currentRecipient = recipientName || 'the lucky person'

  // Map "yourName" to the name typed in recipientName (per request)
  useEffect(() => {
    const trimmed = (recipientName ?? '').trim()
    // RHF type for setValue expects string here; we intentionally clear to `undefined` when empty
    setValue('yourName', trimmed || undefined)
  }, [recipientName, setValue])

  const storyLen = storyText.trim().length
  const storyQuality =
    storyLen === 0
      ? { label: 'Teruslah mengetik...', pct: 10, color: 'bg-gray-300', text: 'text-gray-500' }
      : storyLen < 80
        ? { label: 'Dikit lagi...', pct: 40, color: 'bg-amber-400', text: 'text-amber-700' }
        : storyLen < 160
          ? { label: 'Mantap!', pct: 75, color: 'bg-green-500', text: 'text-green-600' }
          : { label: 'Sempurna!', pct: 100, color: 'bg-green-600', text: 'text-green-700' }

  const handleNext = async () => {
    // Step 0 = announcement, no validation
    if (step === 0) {
      setStep(1)
      window.scrollTo(0, 0)
      return
    }
    let fieldsToValidate: Path<OrderInput>[] = []
    if (step === 1) fieldsToValidate = ['recipientName']
    if (step === 2) fieldsToValidate = ['musicPreferences.genre', 'musicPreferences.voiceStyle']
    if (step === 3) fieldsToValidate = ['story']

    const isStepValid = await form.trigger(fieldsToValidate)
    if (isStepValid) {
      setStep((prev) => Math.min(prev + 1, 4))
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    const minStep = agreementEnabled ? 0 : 1
    setStep((prev) => Math.max(prev - 1, minStep))
    window.scrollTo(0, 0)
  }

  // Redirect if on step 0 but agreement is disabled
  useEffect(() => {
    if (settingsLoaded && !agreementEnabled && step === 0) {
      setStep(1)
    }
  }, [settingsLoaded, agreementEnabled, step])

  // Reset OTP state if email changes (but not if already verified)
  useEffect(() => {
    if (suppressOtpResetOnceRef.current) {
      suppressOtpResetOnceRef.current = false
      return
    }
    // Jangan reset jika email sudah terverifikasi
    if (emailVerified) {
      return
    }
    setEmailVerified(false)
    setOtpDigits(['', '', '', ''])
    setEmailVerificationId(null)
    setValue('emailVerificationId', '')
    setOtpError(null)
    setResendCooldownSec(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  useEffect(() => {
    if (resendCooldownSec <= 0) return
    const t = window.setInterval(() => {
      setResendCooldownSec((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [resendCooldownSec])

  async function sendEmailOtp() {
    setOtpError(null)
    if (!email) {
      setOtpError('Email wajib diisi.')
      return
    }
    // Ensure email is validated even if the field hasn't been touched yet.
    const emailOk = await form.trigger('email')
    if (!emailOk) {
      setOtpError('Format email tidak valid.')
      return
    }
    if (resendCooldownSec > 0) return
    // UX guard: if user already started entering OTP, they should verify instead of requesting again.
    if (emailVerified || hasEnteredOtp) return

    setOtpSending(true)
    try {
      const res = await apiPost<{ verificationId: string; expiresAt: string }>('/api/email-verification/start', { email })
      setEmailVerificationId(res.verificationId)
      setOtpDigits(['', '', '', ''])
      setEmailVerified(false)
      setValue('emailVerificationId', '')
      setResendCooldownSec(60)
      setOtpError(null) // Clear any previous errors on success
      window.setTimeout(() => otpRefs.current?.[0]?.focus?.(), 50)
    } catch (e: unknown) {
      const errorMsg = getErrorMessage(e, 'Gagal mengirim OTP. Coba lagi.')
      console.error('Send OTP error:', e)
      setOtpError(errorMsg)
    } finally {
      setOtpSending(false)
    }
  }

  async function verifyEmailOtp() {
    setOtpError(null)
    if (!emailVerificationId) {
      setOtpError('Klik "Kirim kode verifikasi" terlebih dulu.')
      return
    }
    const code = otpDigits.join('')
    if (code.length !== 4 || otpDigits.some((d) => !d)) {
      setOtpError('Masukkan 4 digit kode OTP.')
      return
    }
    setOtpVerifying(true)
    try {
      await apiPost<{ ok: true }>('/api/email-verification/verify', { verificationId: emailVerificationId, code })
      setEmailVerified(true)
      setValue('emailVerificationId', emailVerificationId)
      setOtpError(null) // Clear any previous errors on success
    } catch (e: unknown) {
      setEmailVerified(false)
      setValue('emailVerificationId', '')
      const errorMsg = getErrorMessage(e, 'Kode OTP salah / kadaluarsa.')
      console.error('Verify OTP error:', e)
      setOtpError(errorMsg)
    } finally {
      setOtpVerifying(false)
    }
  }

  function handleOtpChange(idx: number, nextRaw: string) {
    const next = (nextRaw ?? '').replace(/\D/g, '').slice(-1)
    setOtpDigits((prev) => {
      const copy = [...prev]
      copy[idx] = next
      return copy
    })
    if (next && idx < 3) {
      window.setTimeout(() => otpRefs.current?.[idx + 1]?.focus?.(), 0)
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (otpDigits[idx]) {
        // clear current digit
        e.preventDefault()
        setOtpDigits((prev) => {
          const copy = [...prev]
          copy[idx] = ''
          return copy
        })
        return
      }
      if (idx > 0) {
        e.preventDefault()
        otpRefs.current?.[idx - 1]?.focus?.()
      }
    }
    if (e.key === 'ArrowLeft' && idx > 0) otpRefs.current?.[idx - 1]?.focus?.()
    if (e.key === 'ArrowRight' && idx < 3) otpRefs.current?.[idx + 1]?.focus?.()
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text') ?? ''
    const digits = text.replace(/\D/g, '').slice(0, 4).split('')
    if (digits.length === 0) return
    e.preventDefault()
    setOtpDigits([digits[0] ?? '', digits[1] ?? '', digits[2] ?? '', digits[3] ?? ''])
    const nextFocus = Math.min(digits.length, 4) - 1
    window.setTimeout(() => otpRefs.current?.[Math.max(0, nextFocus)]?.focus?.(), 0)
  }

  function appendStoryPrompt(prompt: string) {
    const current = storyText ?? ''
    const currentHasMeaningfulText = current.trim().length > 0
    const separator = currentHasMeaningfulText && !current.endsWith('\n') ? '\n' : ''
    const next = `${currentHasMeaningfulText ? current : ''}${separator}${prompt}:\n`

    setValue('story', next, { shouldDirty: true, shouldTouch: true, shouldValidate: true })

    window.setTimeout(() => {
      const el = storyTextareaRef.current
      if (!el) return
      el.focus()
      try {
        const end = el.value.length
        el.setSelectionRange(end, end)
      } catch {
        // ignore (some browsers can throw if textarea isn't focusable yet)
      }
    }, 0)
  }

  const onSubmit = async (data: OrderInput) => {
    if (!manualConfirmationEnabled) {
      if (!data.email) {
        setError('Masukkan alamat email untuk melanjutkan.')
        return
      }
    }
    if (!manualConfirmationEnabled && emailOtpEnabled && (!emailVerified || !data.emailVerificationId)) {
      setError('Verifikasi email dulu sebelum lanjut ke checkout.')
      return
    }
    if (agreementEnabled && !agreementAccepted) {
      setError('Centang persetujuan di atas untuk melanjutkan.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = { ...data, whatsappNumber: data.whatsappNumber }
      if (manualConfirmationEnabled) {
        delete payload.email
        delete payload.emailVerificationId
      } else if (!emailOtpEnabled) {
        delete payload.emailVerificationId
      }
      if (agreementEnabled) (payload as Record<string, unknown>).agreementAccepted = true
      const res = await apiPost<{ orderId: string }>('/api/orders/draft', payload)
      clearDraft()

      if (manualConfirmationEnabled) {
        const adminNumber = '62895370231680'
        const recipient = String(data.recipientName ?? '').trim()
        const occasion = String(data.occasion ?? '').trim()
        const wa = String(data.whatsappNumber ?? '').trim()
        const extraNotes = String(data.extraNotes ?? '').trim()

        const message = [
          'Halo Admin Laguin,',
          '',
          'Saya ingin melakukan konfirmasi pesanan pembuatan lagu.',
          '',
          `Order ID: ${res.orderId}`,
          `Nama penerima: ${recipient || '-'}`,
          `Momen/acara: ${occasion || '-'}`,
          `Nomor WhatsApp saya: ${wa || '-'}`,
          ...(extraNotes ? ['', `Catatan tambahan: ${extraNotes}`] : []),
          '',
          'Mohon dibantu untuk memproses pesanan ini. Terima kasih.',
        ].join('\n')

        const url = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`
        window.location.assign(url)
        return
      }

      navigate(`/checkout?orderId=${encodeURIComponent(res.orderId)}`)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5F7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#E11D48]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF5F7] font-sans text-gray-900 pb-32">
      {/* Top Banner - Hide on mobile if possible or make super compact */}
      <div className="bg-[#E11D48] px-4 py-1.5 text-center text-[9px] sm:text-xs font-bold text-white uppercase tracking-wide hidden sm:block">
        🎁 {timeLeft.days} hari {timeLeft.hours} jam {timeLeft.mins} menit menuju Valentine • Dikirim {deliveryEta.sentenceLower}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-rose-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
          <img src="/logo.png" alt="Laguin - Musikmu Ceritamu" className="h-8 w-auto object-contain" />
          <div className="text-right flex items-center gap-1">
             <span className="text-[10px] text-gray-400 line-through">Rp 497k</span>
             <span className="text-sm font-bold text-[#E11D48]">GRATIS</span>
             <Badge variant="destructive" className="ml-1 text-[9px] px-1 py-0 h-4 min-w-[36px] justify-center">11 sisa</Badge>
          </div>
        </div>
        {/* Progress Bar inside Header - Ultra Compact */}
        <div className="w-full h-0.5 bg-gray-100 flex">
           {[0, 1, 2, 3, 4]
             .filter((i) => agreementEnabled || i > 0)
             .map((i) => (
             <div key={i} className={`flex-1 transition-all duration-500 ${i <= step ? 'bg-[#E11D48]' : 'bg-transparent'}`} />
           ))}
        </div>
        {/* Step Indicator Text - Floating below header if needed, but keeping it minimal for now */}
        {step > 0 && step < 4 && (
          <div className="absolute top-full left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-rose-50 py-1 text-center">
             <div className="text-[10px] font-medium text-gray-400">
               {step === 1 ? 'Siapa penerimanya?' : step === 2 ? 'Pilih vibe musik' : 'Tulis ceritamu'}
             </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-md px-4 py-4 sm:py-8">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          
          {/* STEP 0: ANNOUNCEMENT - halaman pengumuman */}
          {step === 0 && (
            <div className="flex flex-col items-center justify-start animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">
              <Card className="w-full overflow-hidden border-rose-200 bg-white shadow-xl">
                {/* Header */}
                <div className="bg-[#E11D48] px-3 py-2 flex items-center justify-center gap-2 text-white shadow-sm">
                  <Megaphone className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Kado Valentine Paling Romantis</span>
                </div>

                <CardContent className="p-0">
                  <div className="p-3 text-center space-y-2">
                    <h2 className="text-sm font-bold text-gray-900 leading-snug mx-auto max-w-[260px]">
                      Rekam emosi mereka saat mendengar lagu untuk menang <span className="text-[#E11D48]">Rp 1.000.000!</span>
                    </h2>

                    {/* Video Centered */}
                    <div className="relative mx-auto rounded-lg overflow-hidden bg-gray-100 shadow-md ring-1 ring-gray-200 w-[110px] aspect-[9/16]">
                       {heroVideoUrl ? (
                         <video 
                           src={heroVideoUrl} 
                           autoPlay 
                           loop 
                           muted 
                           playsInline
                           className="w-full h-full object-cover"
                         />
                       ) : (
                         <div className="flex items-center justify-center h-full text-gray-400 text-[9px]">Video preview</div>
                       )}
                    </div>

                    {/* Warranty Box Below Video */}
                    <div className="mx-auto max-w-[280px]">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-[10px] text-green-800 shadow-sm text-center">
                        <p className="font-bold mb-0.5 flex items-center justify-center gap-1"><span className="text-base">🤑</span> GARANSI UANG TUNAI</p>
                        <p className="leading-tight opacity-90">Setiap video reaksi yang jelas <span className="font-bold underline decoration-green-500/50">pasti dapat Rp 75.000</span>.</p>
                      </div>
                      <p className="text-[9px] text-gray-400 italic mt-1 text-center">*Syarat dan ketentuan berlaku</p>
                    </div>
                  </div>

                  {/* How it works - Ultra Compact Timeline */}
                  <div className="bg-gradient-to-b from-rose-50/80 to-white px-4 py-3 border-t border-rose-100">
                    <h3 className="text-[10px] font-bold text-rose-500 mb-2 text-center uppercase tracking-wider">Cara Ikutan</h3>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {/* Step 1 */}
                      <div className="flex flex-col items-center text-center">
                        <div className="w-5 h-5 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-[10px] font-bold mb-1 shadow-sm">1</div>
                        <p className="font-bold text-[10px] text-gray-800 leading-tight">Buat Lagu Gratis</p>
                        <p className="text-[9px] text-gray-500 leading-none mt-0.5">Hemat 100%</p>
                      </div>

                      {/* Step 2 */}
                      <div className="flex flex-col items-center text-center">
                        <div className="w-5 h-5 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-[10px] font-bold mb-1 shadow-sm">2</div>
                        <p className="font-bold text-[10px] text-gray-800 leading-tight">Rekam Reaksinya</p>
                        <p className="text-[9px] text-gray-500 leading-none mt-0.5">Wajib Video!</p>
                      </div>

                      {/* Step 3 */}
                      <div className="flex flex-col items-center text-center">
                        <div className="w-5 h-5 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-[10px] font-bold mb-1 shadow-sm">3</div>
                        <p className="font-bold text-[10px] text-gray-800 leading-tight">Kirim & Menang</p>
                        <p className="text-[9px] text-gray-500 leading-none mt-0.5">Dapat Cuan!</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <p className="text-center text-[9px] text-gray-400 mt-2 animate-pulse">Klik tombol di bawah untuk mulai 👇</p>
            </div>
          )}

          {/* STEP 1: WHO IS IT FOR? */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                  <Heart className="h-5 w-5 text-rose-400 fill-rose-100" />
                  Siapa penerimanya?
                </h1>
                <p className="text-xs text-gray-500">Namanya akan ada di dalam lirik</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['Pasangan', 'Suami', 'Pacar', 'Tunangan', 'Istri', 'Lainnya'].map((rel) => (
                  <SelectionChip
                    key={rel}
                    label={rel}
                    icon={rel === 'Pasangan' ? '💕' : rel === 'Suami' ? '💍' : rel === 'Pacar' ? '❤️' : rel === 'Tunangan' ? '💎' : rel === 'Istri' ? '👰' : '✨'}
                    selected={relationship === rel}
                    onClick={() => {
                      setRelationship(rel)
                      setValue('extraNotes', `Relasi dengan penerima: ${rel}`)
                    }}
                    className={relationship === rel ? "bg-[#E11D48] border-[#E11D48] text-white w-full shadow-md shadow-rose-100 px-2 py-3" : "w-full bg-white shadow-sm px-2 py-3"}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nama Panggilannya</label>
                <Input 
                  {...register('recipientName')} 
                  placeholder="cth. Salsa" 
                  className="h-11 rounded-xl border-gray-300 text-base shadow-sm focus-visible:ring-[#E11D48]"
                />
                {errors.recipientName && <p className="text-xs text-[#E11D48]">{errors.recipientName.message}</p>}
                <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  Nama ini akan dinyanyikan dalam lirik!
                </div>
              </div>

              <div className="text-center text-[10px] text-gray-400 mt-4">
                Bergabung dengan 2,847 orang yang membuat pasangannya menangis bahagia
              </div>
            </div>
          )}

          {/* STEP 2: VIBE */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                  <Music className="h-5 w-5 text-rose-400" />
                  Pilih Vibe
                </h1>
                <p className="text-xs text-gray-500">Sesuaikan dengan selera musiknya</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Country', label: 'Country', desc: 'Bercerita & tulus', icon: '🤠' },
                  { id: 'Acoustic', label: 'Acoustic', desc: 'Hangat & intim', icon: '🎸' },
                  { id: 'Pop Ballad', label: 'Pop Ballad', desc: 'Modern & emosional', icon: '🎹', badge: 'Best' },
                  { id: 'R&B Soul', label: 'R&B Soul', desc: 'Halus & romantis', icon: '🌙' },
                  { id: 'Rock', label: 'Rock', desc: 'Kuat & penuh gairah', icon: '⚡' },
                  { id: 'Piano Ballad', label: 'Piano Ballad', desc: 'Elegan & abadi', icon: '🎻' },
                ].map((g) => (
                  <VibeCard
                    key={g.id}
                    label={g.label}
                    description={g.desc}
                    icon={<span className="text-xl">{g.icon}</span>}
                    badge={g.badge}
                    selected={genre === g.id}
                    onClick={() => setValue('musicPreferences.genre', g.id)}
                    className={genre === g.id ? "bg-[#E11D48] border-[#E11D48] text-white ring-2 ring-rose-200 shadow-md p-3" : "bg-white shadow-sm p-3"}
                  />
                ))}
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-100 text-center space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Suara Penyanyi</label>
                <div className="flex justify-center gap-4">
                  {['Female', 'Male', 'Surprise me'].map((v) => (
                    <label key={v} className="flex items-center gap-1.5 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                      <input 
                        type="radio" 
                        value={v} 
                        {...register('musicPreferences.voiceStyle')}
                        className="text-[#E11D48] focus:ring-[#E11D48] w-3 h-3" 
                      />
                      <span className="text-xs font-medium">{v === 'Female' ? 'Wanita' : v === 'Male' ? 'Pria' : 'Bebas'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-100 text-center space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Bahasa lirik</label>
                <select
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
                  value={language || 'Indonesian'}
                  onChange={(e) => setValue('musicPreferences.language', e.target.value)}
                >
                  <option value="English">English</option>
                  <option value="Indonesian">Bahasa Indonesia</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: STORY */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                  <PenLine className="h-5 w-5 text-rose-400" />
                  Ceritakan kisahmu
                </h1>
                <p className="text-xs text-gray-500">Ini akan menjadi lirik. <span className="text-[#E11D48] font-medium">Beberapa kalimat saja!</span></p>
              </div>

              <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 space-y-2 text-xs text-gray-600">
                <div className="flex gap-2 items-start">
                  <span className="text-[#E11D48] font-bold mt-0.5">•</span>
                  <span>Semakin kaya detail, semakin kuat emosinya.</span>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-[#E11D48] font-bold mt-0.5">•</span>
                  <span>Ceritakan pertemuan, hal yang dicintai, atau kenangan lucu.</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> Ide Topik:
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Awal bertemu', 'Yang aku suka darinya', 'Jokes internal kami', 'Mimpi masa depan'].map((prompt) => (
                    <PromptChip 
                      key={prompt} 
                      label={prompt} 
                      icon={prompt.includes('bertemu') ? '💞' : prompt.includes('suka') ? '😍' : prompt.includes('Jokes') ? '😂' : '🔮'}
                      onClick={() => appendStoryPrompt(prompt)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Textarea 
                  {...storyRegister}
                  ref={(el) => {
                    storyRegister.ref(el)
                    storyTextareaRef.current = el
                  }}
                  rows={5} 
                  placeholder="Mulai ketik ceritamu di sini..." 
                  maxLength={4000}
                  className="rounded-xl border-gray-300 text-base shadow-sm focus-visible:ring-[#E11D48] resize-none p-4"
                />
                <div className="flex justify-between text-xs">
                  <div className={["flex items-center gap-2 font-medium", storyQuality.text].join(' ')}>
                    <div className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={["h-full transition-all duration-300", storyQuality.color].join(' ')}
                        style={{ width: `${storyQuality.pct}%` }}
                      />
                    </div>
                    {storyQuality.label}
                  </div>
                  <span className="text-gray-400">{storyText.length} / 4000</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW / CHECKOUT */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
              <div className="text-center space-y-1">
                <PartyPopper className="mx-auto h-6 w-6 text-yellow-500" />
                <h1 className="text-2xl font-serif font-bold text-gray-900">Semua siap!</h1>
                <p className="text-sm text-gray-500">
                  {manualConfirmationEnabled
                    ? 'Konfirmasi pesanan via WhatsApp'
                    : `Kirim lagu ${currentRecipient} ke mana?`}
                </p>
              </div>

              <div className="space-y-4">
                 {/* Compact Order Summary Accordion */}
                 <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button 
                      type="button"
                      onClick={() => setIsOrderSummaryOpen(!isOrderSummaryOpen)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">💝</span>
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-bold text-gray-700">Ringkasan Pesanan</span>
                          <span className="text-[10px] text-gray-500">{genre}, {language || 'Indonesian'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#E11D48]">GRATIS</span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOrderSummaryOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    
                    {isOrderSummaryOpen && (
                      <div className="p-4 text-xs space-y-2 border-t border-gray-100 animate-in slide-in-from-top-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Untuk</span>
                          <span className="font-bold text-gray-900">{recipientName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Gaya & Suara</span>
                          <span className="font-bold text-gray-900">{genre} ({form.getValues('musicPreferences.voiceStyle')})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Bahasa</span>
                          <span className="font-bold text-gray-900">{language || 'Indonesian'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Estimasi</span>
                          <span className="font-bold text-green-600 flex items-center gap-1"><Zap className="h-3 w-3" /> {deliveryEta.short}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="bg-rose-50 p-2 rounded text-rose-700 italic">
                          "{storyText.length > 50 ? storyText.slice(0, 50) + '...' : storyText}"
                        </div>
                      </div>
                    )}
                 </div>

                 <div className="space-y-1">
                   <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nomor WhatsApp</label>
                   <Controller
                     name="whatsappNumber"
                     control={form.control}
                     render={({ field }) => {
                       const digits = String(field.value ?? '').replace(/\D/g, '')
                       const local = digits.startsWith('62') ? digits.slice(2) : digits
                       return (
                         <div className="relative">
                           <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-gray-500">
                             +62
                           </div>
                           <Input
                             value={local}
                             onChange={(e) => {
                               const raw = e.target.value.replace(/\D/g, '')
                               const normalizedLocal = raw.replace(/^0+/, '')
                               field.onChange(`62${normalizedLocal}`)
                             }}
                             placeholder="8123456789"
                             inputMode="numeric"
                             pattern="[0-9]*"
                             type="tel"
                             className="h-12 rounded-xl border-gray-300 shadow-sm focus-visible:ring-[#E11D48] pl-12"
                           />
                         </div>
                       )
                     }}
                   />
                    {errors.whatsappNumber && <p className="text-xs text-[#E11D48]">{errors.whatsappNumber.message}</p>}
                 </div>

                 {!manualConfirmationEnabled ? (
                   <>
                     <div className="space-y-1">
                       <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Alamat Email</label>
                       <div className="relative">
                         <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                           <Mail className="h-4 w-4" />
                         </div>
                         <Input
                           {...register('email')}
                           placeholder="nama@email.com"
                           type="email"
                           disabled={emailVerified}
                           className={`h-12 rounded-xl border-gray-300 shadow-sm focus-visible:ring-[#E11D48] pl-10 ${emailVerified ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                         />
                       </div>
                       {errors.email && <p className="text-xs text-[#E11D48]">{errors.email.message}</p>}
                     </div>

                     {emailOtpEnabled ? (
                       <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm space-y-3">
                         <div className="flex items-center justify-between gap-3">
                           <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">Verifikasi Email</div>
                           {emailVerified ? (
                             <div className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                               <Check className="h-3 w-3" /> OK
                             </div>
                           ) : null}
                         </div>

                         {emailVerified ? (
                           <div className="text-xs text-green-800 flex items-center gap-2">
                             <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                               <Check className="h-3.5 w-3.5 text-green-600" />
                             </div>
                             <div>
                               Email <span className="font-bold">{email}</span> terverifikasi.
                             </div>
                           </div>
                         ) : (
                           <>
                             <div className="flex gap-2">
                               <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 className="h-10 rounded-lg border-gray-200 w-full text-xs"
                                 onClick={() => void sendEmailOtp()}
                                 disabled={
                                   otpSending ||
                                   otpVerifying ||
                                   !email ||
                                   Boolean(errors.email) ||
                                   resendCooldownSec > 0 ||
                                   hasEnteredOtp
                                 }
                               >
                                 {otpSending ? (
                                   <span className="flex items-center gap-2">
                                     <Loader2 className="h-3 w-3 animate-spin" /> Mengirim...
                                   </span>
                                 ) : hasEnteredOtp ? (
                                   'Cek kode di emailmu'
                                 ) : resendCooldownSec > 0 ? (
                                   `Kirim ulang (${resendCooldownSec}s)`
                                 ) : (
                                   'Kirim Kode Verifikasi'
                                 )}
                               </Button>
                             </div>

                             {emailVerificationId && !emailVerified ? (
                               <div className="space-y-2 pt-1">
                                 <div className="flex gap-2 justify-center">
                                   {[0, 1, 2, 3].map((i) => (
                                     <Input
                                       key={i}
                                       ref={(el) => {
                                         otpRefs.current[i] = el
                                       }}
                                       value={otpDigits[i] ?? ''}
                                       onChange={(e) => handleOtpChange(i, e.target.value)}
                                       onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                       onPaste={i === 0 ? handleOtpPaste : undefined}
                                       inputMode="numeric"
                                       pattern="[0-9]*"
                                       type="tel"
                                       maxLength={1}
                                       className="h-10 w-10 text-center text-lg font-bold rounded-lg border-gray-300 shadow-sm focus-visible:ring-[#E11D48]"
                                     />
                                   ))}
                                 </div>
                                 <Button
                                   type="button"
                                   size="sm"
                                   className="h-9 w-full rounded-lg bg-gray-900 text-white hover:bg-gray-800 text-xs"
                                   onClick={() => void verifyEmailOtp()}
                                   disabled={otpVerifying || otpDigits.some((d) => !d)}
                                 >
                                   {otpVerifying ? 'Memverifikasi...' : 'Verifikasi Kode'}
                                 </Button>
                               </div>
                             ) : null}

                             {otpError && typeof otpError === 'string' ? (
                               <p className="text-[10px] text-[#E11D48] text-center">{otpError}</p>
                             ) : null}
                           </>
                         )}
                       </div>
                     ) : null}
                   </>
                 ) : null}

                 {agreementEnabled ? (
                   <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm space-y-2">
                     <label className="flex items-start gap-2 cursor-pointer">
                       <input
                         type="checkbox"
                         checked={agreementAccepted}
                         onChange={(e) => setAgreementAccepted(e.target.checked)}
                         className="mt-1 h-3.5 w-3.5 rounded border-gray-300 text-[#E11D48] focus:ring-[#E11D48]"
                       />
                       <span className="text-xs text-gray-600 leading-tight">
                         Saya setuju mengirimkan video reaksi untuk keperluan promosi Laguin.id.
                       </span>
                     </label>
                     <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-1.5 rounded border border-amber-100">
                       🏆 Hadiah Rp 1.000.000 untuk video reaksi terbaik.
                     </p>
                   </div>
                 ) : null}

                 <div className="rounded-xl bg-green-50 p-3 border border-green-100 space-y-2">
                   <div className="text-[10px] font-bold text-green-800 uppercase tracking-wider">Selanjutnya:</div>
                   <div className="space-y-1.5 text-xs text-green-900">
                     <div className="flex gap-2 items-start">
                       <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-200 text-[9px] font-bold text-green-700 mt-0.5">1</div>
                      <span className="leading-tight">{manualConfirmationEnabled ? 'Admin memproses pesanan' : 'Kami membuat lagu personalmu'}</span>
                     </div>
                     <div className="flex gap-2 items-start">
                       <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-200 text-[9px] font-bold text-green-700 mt-0.5">2</div>
                      {manualConfirmationEnabled ? (
                        <span className="leading-tight">Lanjut chat admin WhatsApp untuk konfirmasi.</span>
                      ) : (
                        <span className="leading-tight">
                          Dikirim via email & WA <span className="font-bold">{deliveryEta.sentenceLower}</span>
                        </span>
                      )}
                     </div>
                   </div>
                 </div>

                 <div className="flex justify-center gap-4 text-[10px] text-gray-400">
                   <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Checkout aman</div>
                  <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {deliveryEta.short}</div>
                 </div>
              </div>
            </div>
          )}

          {/* BOTTOM NAV / CTA */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             <div className="mx-auto max-w-md flex flex-col gap-2">
               {step === 4 && (
                 <div className="text-center text-[10px] text-gray-500 flex justify-center items-center gap-1">
                   <Timer className="h-3 w-3" /> Cerita tersimpan selama 9:56 — selesaikan checkout untuk menyimpannya
                 </div>
               )}
               
               <div className="flex gap-3">
                 {step > (agreementEnabled ? 0 : 1) && (
                   <Button 
                     type="button" 
                     variant="outline" 
                     size="icon" 
                     className="shrink-0 h-12 w-12 rounded-xl border-gray-200"
                     onClick={handleBack}
                     disabled={loading}
                   >
                     <ChevronLeft className="h-5 w-5" />
                   </Button>
                 )}
                 
                 <Button 
                   type="submit" 
                   className="h-12 w-full rounded-xl bg-[#E11D48] text-base font-bold text-white shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all"
                   onClick={step < 4 ? (e) => { e.preventDefault(); handleNext(); } : undefined}
                  disabled={
                    loading ||
                    (step === 4 && !manualConfirmationEnabled && emailOtpEnabled && !emailVerified) ||
                    (step === 4 && agreementEnabled && !agreementAccepted)
                  }
                 >
                   {step === 0 ? 'Mulai Buat Lagu ->' : 
                    step === 1 ? 'Pilih vibenya ->' : 
                    step === 2 ? 'Tambahkan ceritamu ->' : 
                    step === 3 ? 'Hampir selesai! ->' : 
                    loading ? 'Memproses...' : (agreementEnabled && !agreementAccepted ? 'Centang persetujuan' : manualConfirmationEnabled ? 'Konfirmasi via WhatsApp' : emailOtpEnabled ? (emailVerified ? 'Ke checkout — GRATIS' : 'Verifikasi email dulu') : 'Ke checkout — GRATIS')}
                 </Button>
               </div>
             </div>
          </div>

          {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        </form>
      </main>
    </div>
  )
}
