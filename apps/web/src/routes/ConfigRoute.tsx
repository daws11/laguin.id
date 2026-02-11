import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Gift,
  Award,
  ArrowDown
} from 'lucide-react'

type PersistedConfigDraft = {
  v: 1
  step: number
  relationship: string
  emailVerificationId: string | null
  formValues: Partial<OrderInput>
  updatedAt: number
}

const CONFIG_DRAFT_STORAGE_KEY = 'laguin:config_draft:v1'

export function ConfigRoute() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [relationship, setRelationship] = useState('Pasangan')
  const storyTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Countdown timer logic to match LandingRoute
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0 })

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
    apiGet<{ emailOtpEnabled?: boolean; agreementEnabled?: boolean; publicSiteConfig?: any }>('/api/public/settings')
      .then((res) => {
        if (cancelled) return
        setEmailOtpEnabled(res?.emailOtpEnabled ?? true)
        setAgreementEnabled(res?.agreementEnabled ?? false)
        
        // Resolve hero video URL
        const landing = res?.publicSiteConfig?.landing
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
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null)
  const [emailVerificationId, setEmailVerificationId] = useState<string | null>(null)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', ''])
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [resendCooldownSec, setResendCooldownSec] = useState(0)

  const DEFAULT_ORDER_INPUT: OrderInput = {
    yourName: undefined,
    recipientName: '',
    occasion: 'Valentine',
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
    email: '',
    emailVerificationId: '',
    extraNotes: '',
  }

  const getErrorMessage = (e: unknown, fallback: string) => {
    if (e instanceof Error && e.message) return e.message
    return fallback
  }

  const form = useForm<OrderInput>({
    // NOTE: keep build stable across Zod typings changes between deps.
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

  const saveDraft = (values: Partial<OrderInput>) => {
    if (!didHydrateDraftRef.current) return
    try {
      const formValues: Partial<OrderInput> = {
        yourName: values.yourName,
        recipientName: values.recipientName,
        occasion: values.occasion,
        story: values.story,
        musicPreferences: values.musicPreferences,
        whatsappNumber: values.whatsappNumber,
        email: values.email,
        extraNotes: values.extraNotes,
        // Intentionally not persisting emailVerificationId from the form:
        // - It is only set after OTP verification
        // - Persisting it doesn't help without a server-side status check
      }

      const payload: PersistedConfigDraft = {
        v: 1,
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
      if (!raw) {
        didHydrateDraftRef.current = true
        return
      }
      const parsed = JSON.parse(raw) as Partial<PersistedConfigDraft>
      if (parsed.v !== 1) {
        didHydrateDraftRef.current = true
        return
      }

      const nextStep = Number.isFinite(parsed.step) ? Math.max(0, Math.min(4, parsed.step as number)) : 0
      const nextRelationship = typeof parsed.relationship === 'string' && parsed.relationship ? parsed.relationship : 'Pasangan'
      const nextEmailVerificationId = typeof parsed.emailVerificationId === 'string' ? parsed.emailVerificationId : null

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

      setStep(nextStep)
      setRelationship(nextRelationship)
      setEmailVerificationId(nextEmailVerificationId)
      suppressOtpResetOnceRef.current = true
      form.reset(merged)
    } catch {
      // ignore and continue with defaults
    } finally {
      didHydrateDraftRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist on any form change (best-effort).
  useEffect(() => {
    const sub = form.watch((values) => saveDraft(values as Partial<OrderInput>))
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, step, relationship, emailVerificationId])

  // Persist when non-form state changes (step/relationship/OTP start).
  useEffect(() => {
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

  // Reset OTP state if email changes
  useEffect(() => {
    if (suppressOtpResetOnceRef.current) {
      suppressOtpResetOnceRef.current = false
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
      window.setTimeout(() => otpRefs.current?.[0]?.focus?.(), 50)
    } catch (e: unknown) {
      setOtpError(getErrorMessage(e, 'Gagal mengirim OTP. Coba lagi.'))
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
    } catch (e: unknown) {
      setEmailVerified(false)
      setValue('emailVerificationId', '')
      setOtpError(getErrorMessage(e, 'Kode OTP salah / kadaluarsa.'))
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
    if (emailOtpEnabled && (!emailVerified || !data.emailVerificationId)) {
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
      const payload = { ...data, whatsappNumber: data.whatsappNumber }
      if (!emailOtpEnabled) delete (payload as Record<string, unknown>).emailVerificationId
      if (agreementEnabled) (payload as Record<string, unknown>).agreementAccepted = true
      const res = await apiPost<{ orderId: string }>('/api/orders/draft', payload)
      clearDraft()
      navigate(`/checkout?orderId=${encodeURIComponent(res.orderId)}`)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF5F7] font-sans text-gray-900 pb-32">
      {/* Top Banner */}
      <div className="bg-[#E11D48] px-4 py-2 text-center text-xs font-bold text-white uppercase tracking-wide">
        🎁 {timeLeft.days} hari {timeLeft.hours} jam {timeLeft.mins} menit menuju Valentine • Dikirim dalam 24 jam
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-rose-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-serif text-xl font-bold text-[#E11D48]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E11D48] text-white">L</div>
            Laguin.id
          </div>
          <div className="text-right">
             <span className="text-xs text-gray-400 line-through">Rp 497.000</span>{' '}
             <span className="text-lg font-bold text-[#E11D48]">GRATIS</span>{' '}
             <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0 h-5">11 sisa</Badge>
          </div>
        </div>
        {/* Progress Bar inside Header */}
        <div className="px-4 pb-2">
           <div className="flex gap-1 h-1">
             {[0, 1, 2, 3, 4]
               .filter((i) => agreementEnabled || i > 0)
               .map((i) => (
               <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i < step ? 'bg-green-500' : i === step ? 'bg-[#E11D48]' : 'bg-gray-200'}`} />
             ))}
           </div>
           {step === 0 && <div className="mt-1 text-center text-[10px] font-medium text-gray-400">Pengumuman</div>}
           {step > 1 && <div className="mt-1 text-center text-[10px] font-medium text-gray-400">Lagu untuk {currentRecipient}</div>}
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          
          {/* STEP 0: ANNOUNCEMENT - halaman pengumuman */}
          {step === 0 && (
            <div className="flex flex-col items-center justify-start animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">
              <Card className="w-full overflow-hidden border-rose-200 bg-white shadow-xl">
                {/* Header */}
                <div className="bg-[#E11D48] px-3 py-2.5 flex items-center justify-center gap-2 text-white shadow-sm">
                  <Megaphone className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wide">Kado Valentine Paling Romantis</span>
                </div>

                <CardContent className="p-0">
                  <div className="p-4 text-center space-y-3">
                    <h2 className="text-base font-bold text-gray-900 leading-snug mx-auto max-w-[280px]">
                      Rekam emosi mereka saat mendengar lagu untuk menang <span className="text-[#E11D48]">Rp 3.000.000!</span>
                    </h2>
                    
                    {/* Video Container - Optimized size */}
                    <div className="relative mx-auto rounded-lg overflow-hidden bg-gray-100 shadow-md ring-1 ring-gray-200 w-[140px] aspect-[9/16] sm:w-[160px]">
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
                         <div className="flex items-center justify-center h-full text-gray-400 text-[10px]">Video preview</div>
                       )}
                    </div>
                  </div>

                  {/* How it works - Compact Timeline */}
                  <div className="bg-gradient-to-b from-rose-50/80 to-white px-5 py-4 border-t border-rose-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 text-center uppercase tracking-wider text-[10px] text-rose-500">Cara Ikutan</h3>
                    
                    <div className="space-y-0">
                      {/* Step 1 */}
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ring-2 ring-white">1</div>
                          <div className="w-0.5 h-full bg-rose-200 min-h-[20px]"></div>
                        </div>
                        <div className="pb-4 pt-0.5">
                          <p className="font-bold text-sm text-gray-800 leading-none">Buat Lagu Gratis</p>
                          <p className="text-[11px] text-gray-500 mt-1 leading-tight">Biasanya Rp 497.000 (Hemat 100%).</p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ring-2 ring-white">2</div>
                          <div className="w-0.5 h-full bg-rose-200 min-h-[20px]"></div>
                        </div>
                        <div className="pb-4 pt-0.5">
                          <p className="font-bold text-sm text-gray-800 leading-none">Rekam Video Reaksinya</p>
                          <div className="text-[11px] text-gray-500 mt-1 space-y-0.5 leading-tight">
                            <p>• Format portrait (9:16)</p>
                            <p>• Pastikan suara lagu terdengar</p>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ring-2 ring-white">3</div>
                        </div>
                        <div className="pt-0.5">
                          <p className="font-bold text-sm text-gray-800 leading-none">Kirim & Menang</p>
                          <p className="text-[11px] text-gray-500 mt-1 leading-tight">
                            Kirim ke WhatsApp kami dalam 24 jam.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <p className="text-center text-[10px] text-gray-400 mt-3 animate-pulse">Scroll ke bawah untuk mulai 👇</p>
            </div>
          )}

          {/* STEP 1: WHO IS IT FOR? */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <Heart className="mx-auto h-8 w-8 text-rose-400 fill-rose-100" />
                <h1 className="text-3xl font-serif font-bold text-gray-900">Siapa orang beruntung itu?</h1>
                <p className="text-gray-500">Kami akan memasukkan <strong className="text-gray-900">namanya</strong> ke dalam lirik lagu</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                    className={relationship === rel ? "bg-[#E11D48] border-[#E11D48] text-white" : ""}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nama Panggilannya</label>
                <Input 
                  {...register('recipientName')} 
                  placeholder="cth. Salsa" 
                  className="h-14 rounded-xl border-gray-300 text-lg shadow-sm focus-visible:ring-[#E11D48]"
                />
                {errors.recipientName && <p className="text-xs text-[#E11D48]">{errors.recipientName.message}</p>}
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                  <Sparkles className="h-3 w-3" />
                  Nama ini akan dinyanyikan dalam lirik!
                </div>
              </div>

              <div className="text-center text-xs text-gray-400">
                Bergabung dengan 2,847 wanita yang membuat pasangannya menangis bahagia
              </div>
            </div>
          )}

          {/* STEP 2: VIBE */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <Music className="mx-auto h-8 w-8 text-rose-400" />
                <h1 className="text-3xl font-serif font-bold text-gray-900">Pilih vibe untuk {currentRecipient}</h1>
                <p className="text-gray-500">Gaya musik apa yang dia suka?</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'Country', label: 'Country', desc: 'Bercerita & tulus', icon: '🤠' },
                  { id: 'Acoustic', label: 'Acoustic', desc: 'Hangat & intim', icon: '🎸' },
                  { id: 'Pop Ballad', label: 'Pop Ballad', desc: 'Modern & emosional', icon: '🎹', badge: 'Pilihan terbaik' },
                  { id: 'R&B Soul', label: 'R&B Soul', desc: 'Halus & romantis', icon: '🌙' },
                  { id: 'Rock', label: 'Rock', desc: 'Kuat & penuh gairah', icon: '⚡' },
                  { id: 'Piano Ballad', label: 'Piano Ballad', desc: 'Elegan & abadi', icon: '🎻' },
                ].map((g) => (
                  <VibeCard
                    key={g.id}
                    label={g.label}
                    description={g.desc}
                    icon={<span className="text-2xl">{g.icon}</span>}
                    badge={g.badge}
                    selected={genre === g.id}
                    onClick={() => setValue('musicPreferences.genre', g.id)}
                    className={genre === g.id ? "bg-[#E11D48] border-[#E11D48] text-white ring-2 ring-rose-200" : ""}
                  />
                ))}
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Suara Penyanyi</label>
                <div className="flex justify-center gap-6">
                  {['Female', 'Male', 'Surprise me'].map((v) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        value={v} 
                        {...register('musicPreferences.voiceStyle')}
                        className="text-[#E11D48] focus:ring-[#E11D48]" 
                      />
                      <span className="text-sm font-medium">{v === 'Female' ? 'Wanita' : v === 'Male' ? 'Pria' : 'Kejutkan saya'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Bahasa lirik</label>
                <select
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
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
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <PenLine className="mx-auto h-8 w-8 text-rose-400" />
                <h1 className="text-3xl font-serif font-bold text-gray-900">Ceritakan kisahmu</h1>
                <p className="text-gray-500">Ini akan menjadi lirik. <span className="text-[#E11D48] font-medium">Beberapa kalimat saja sudah cukup!</span></p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> Ketuk untuk menambah:
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

              <div className="rounded-xl bg-rose-50 p-4 text-xs text-gray-600 italic border border-rose-100">
                <span className="font-bold not-italic text-rose-600">Contoh:</span> "Kami bertemu di pernikahan teman 3 tahun lalu. Dia selalu membuatku tertawa setiap hari. Aku suka bagaimana dia selalu membawakanku kopi di tempat tidur."
              </div>

              <div className="space-y-2">
                <Textarea 
                  {...storyRegister}
                  ref={(el) => {
                    storyRegister.ref(el)
                    storyTextareaRef.current = el
                  }}
                  rows={6} 
                  placeholder="Mulai ketik ceritamu di sini..." 
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
                  <span className="text-gray-400">{storyText.length} chars</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW / CHECKOUT */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <PartyPopper className="mx-auto h-8 w-8 text-yellow-500" />
                <h1 className="text-3xl font-serif font-bold text-gray-900">Semua siap!</h1>
                <p className="text-gray-500">Kemana kami harus mengirim lagu {currentRecipient}?</p>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nomor WhatsApp</label>
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

                 <div className="space-y-1">
                   <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Alamat Email</label>
                   <div className="relative">
                     <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                       <Mail className="h-5 w-5" />
                     </div>
                     <Input
                       {...register('email')}
                       placeholder="nama@email.com"
                       type="email"
                       className="h-12 rounded-xl border-gray-300 shadow-sm focus-visible:ring-[#E11D48] pl-10"
                     />
                   </div>
                    {errors.email && <p className="text-xs text-[#E11D48]">{errors.email.message}</p>}
                 </div>

                 {emailOtpEnabled ? (
                   <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                     <div className="flex items-center justify-between gap-3">
                       <div className="text-sm font-bold text-gray-900">Verifikasi Email</div>
                       {emailVerified ? (
                         <div className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-full">
                           <Check className="h-3.5 w-3.5" /> Terverifikasi
                         </div>
                       ) : null}
                     </div>

                     <div className="flex gap-3">
                       <Button
                         type="button"
                         variant="outline"
                         className="h-11 rounded-xl border-gray-200"
                         onClick={() => void sendEmailOtp()}
                         disabled={
                           otpSending ||
                           otpVerifying ||
                           !email ||
                           Boolean(errors.email) ||
                           resendCooldownSec > 0 ||
                           emailVerified ||
                           hasEnteredOtp
                         }
                       >
                         {otpSending ? (
                           <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</span>
                         ) : emailVerified ? (
                           'Email terverifikasi'
                         ) : hasEnteredOtp ? (
                           'Verifikasi kode di bawah'
                         ) : resendCooldownSec > 0 ? (
                           `Kirim ulang (${resendCooldownSec}s)`
                         ) : (
                           'Kirim kode verifikasi'
                         )}
                       </Button>
                     </div>

                     {emailVerificationId && !emailVerified ? (
                       <div className="space-y-3">
                         <div className="text-xs text-gray-500">
                           Masukkan 4 digit kode OTP yang kami kirim ke <span className="font-semibold text-gray-800">{email}</span>
                         </div>
                         <div className="flex gap-2 justify-center">
                           {[0, 1, 2, 3].map((i) => (
                             <Input
                               key={i}
                               ref={(el) => { otpRefs.current[i] = el }}
                               value={otpDigits[i] ?? ''}
                               onChange={(e) => handleOtpChange(i, e.target.value)}
                               onKeyDown={(e) => handleOtpKeyDown(i, e)}
                               onPaste={i === 0 ? handleOtpPaste : undefined}
                               inputMode="numeric"
                               pattern="[0-9]*"
                               type="tel"
                               maxLength={1}
                               className="h-12 w-12 text-center text-lg font-bold rounded-xl border-gray-300 shadow-sm focus-visible:ring-[#E11D48]"
                             />
                           ))}
                         </div>
                         <Button
                           type="button"
                           className="h-11 w-full rounded-xl bg-gray-900 text-white hover:bg-gray-800"
                           onClick={() => void verifyEmailOtp()}
                           disabled={otpVerifying || otpDigits.some((d) => !d)}
                         >
                           {otpVerifying ? (
                             <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi...</span>
                           ) : (
                             'Verifikasi kode'
                           )}
                         </Button>
                       </div>
                     ) : null}

                     {otpError ? <p className="text-xs text-[#E11D48]">{otpError}</p> : null}
                   </div>
                 ) : null}

                 {agreementEnabled ? (
                   <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                     <label className="flex items-start gap-3 cursor-pointer">
                       <input
                         type="checkbox"
                         checked={agreementAccepted}
                         onChange={(e) => setAgreementAccepted(e.target.checked)}
                         className="mt-1 h-4 w-4 rounded border-gray-300 text-[#E11D48] focus:ring-[#E11D48]"
                       />
                       <span className="text-sm text-gray-700">
                         Saya menyetujui untuk mengirimkan rekaman reaksi dan respons emosional penerima lagu kepada Laguin.id, untuk keperluan promosi dan peningkatan layanan.
                       </span>
                     </label>
                     <p className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                       Hadiah sebesar Rp 3.000.000 akan diberikan kepada pemenang dengan video reaksi terbaik.
                     </p>
                   </div>
                 ) : null}

                 <Card className="overflow-hidden border-gray-200 shadow-sm">
                   <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                     <span className="text-lg">💝</span> <span className="text-sm font-bold text-gray-700">Pesanan Lagumu</span>
                   </div>
                   <CardContent className="p-4 text-sm space-y-3">
                     <div className="flex justify-between">
                       <span className="text-gray-500">Untuk</span>
                       <span className="font-bold text-gray-900">{recipientName}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-500">Gaya</span>
                       <span className="font-bold text-gray-900">{genre}</span>
                     </div>
                   <div className="flex justify-between">
                     <span className="text-gray-500">Bahasa</span>
                     <span className="font-bold text-gray-900">{language || 'Indonesian'}</span>
                   </div>
                     <div className="flex justify-between">
                       <span className="text-gray-500">Pengiriman</span>
                       <span className="font-bold text-green-600 flex items-center gap-1"><Zap className="h-3 w-3" /> Dalam 24 jam</span>
                     </div>
                     <Separator />
                     <div className="flex justify-between items-center pt-1">
                       <span className="text-gray-500">Total</span>
                       <div className="flex items-center gap-2">
                         <span className="text-gray-400 line-through text-xs">Rp 497.000</span>
                         <span className="font-bold text-[#E11D48] text-xl">GRATIS</span>
                       </div>
                     </div>
                   </CardContent>
                 </Card>

                 <div className="rounded-xl bg-green-50 p-4 border border-green-100 space-y-3">
                   <div className="text-xs font-bold text-green-800 uppercase tracking-wider">Apa selanjutnya?</div>
                   <div className="space-y-2 text-sm text-green-900">
                     <div className="flex gap-2">
                       <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-[10px] font-bold text-green-700">1</div>
                       <span>Kami membuat lagu personalmu</span>
                     </div>
                     <div className="flex gap-2">
                       <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-[10px] font-bold text-green-700">2</div>
                       <span>Dikirim via email & notifikasi WhatsApp <span className="font-bold">dalam 24 jam</span></span>
                     </div>
                     <div className="flex gap-2">
                       <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-[10px] font-bold text-green-700">3</div>
                       <span>Putar untuknya dan lihat dia menangis 😭</span>
                     </div>
                   </div>
                 </div>

                 <div className="flex justify-center gap-4 text-[10px] text-gray-400">
                   <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Checkout aman</div>
                   <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pengiriman 24 jam</div>
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
                    (step === 4 && emailOtpEnabled && !emailVerified) ||
                    (step === 4 && agreementEnabled && !agreementAccepted)
                  }
                 >
                   {step === 0 ? 'Mulai Buat Lagu ->' : 
                    step === 1 ? 'Pilih vibenya ->' : 
                    step === 2 ? 'Tambahkan ceritamu ->' : 
                    step === 3 ? 'Hampir selesai! ->' : 
                    loading ? 'Memproses...' : (agreementEnabled && !agreementAccepted ? 'Centang persetujuan' : emailOtpEnabled ? (emailVerified ? 'Ke checkout — GRATIS' : 'Verifikasi email dulu') : 'Ke checkout — GRATIS')}
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
