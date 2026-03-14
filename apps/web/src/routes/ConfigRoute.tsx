import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Controller, useForm, type FieldErrors, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { OrderInputSchema, type OrderInput } from 'shared'
import { apiGet, apiPost } from '@/lib/http'
import { useThemeSlug } from '@/features/theme/ThemeContext'
import { ensureMetaPixelLoaded, trackWishlist, executePixelScript, trackPixelEvent } from '@/features/analytics/MetaPixel'

import { CountdownTimer } from '@/components/landing/CountdownTimer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  ChevronDown,
  Play,
  Pause,
  ChevronRight,
  BadgeCheck,
  Tag
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
  const themeSlug = useThemeSlug()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isHydrated, setIsHydrated] = useState(false)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [relationship, setRelationship] = useState('Pasangan')
  const storyTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const whatsappSectionRef = useRef<HTMLDivElement | null>(null)
  const [instantEnabled, setInstantEnabled] = useState<boolean | null>(null)
  const [deliveryDelayHours, setDeliveryDelayHours] = useState<number | null>(null)
  const [manualConfirmationEnabled, setManualConfirmationEnabled] = useState(false)
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null)
  const [playingTrackIdx, setPlayingTrackIdx] = useState<number | null>(null)
  const miniPlayerRef = useRef<HTMLAudioElement | null>(null)


  const [paymentAmount, setPaymentAmount] = useState<number>(497000)
  const [originalAmount, setOriginalAmount] = useState<number>(497000)
  const [wishlistPixelId, setWishlistPixelId] = useState<string | null>(null)
  const [pixelStep1Script, setPixelStep1Script] = useState<string | null>(null)
  const [pixelStep4Script, setPixelStep4Script] = useState<string | null>(null)
  const pixelStep1Fired = useRef(false)
  const pixelStep4Fired = useRef(false)
  const [draftCountdown, setDraftCountdown] = useState(10 * 60)
  const draftCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [discountInputOpen, setDiscountInputOpen] = useState(false)
  const [discountCodeInput, setDiscountCodeInput] = useState('')
  const [discountValidating, setDiscountValidating] = useState(false)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null)

  const fmtCurrency = (amt: number) => {
    if (amt === 0) return 'GRATIS'
    if (amt >= 100000 && amt < 1000000) {
      return `Rp ${Math.floor(amt / 1000)}rb`
    }
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amt)
  }

  const deliveryEta = useMemo(() => {
    if (instantEnabled) {
      return { label: '10–30 menit', sentenceLower: 'dalam 10–30 menit', short: '10–30 menit' }
    }
    const hRaw = deliveryDelayHours
    const h = typeof hRaw === 'number' && Number.isFinite(hRaw) && hRaw > 0 ? hRaw : 24
    if (h >= 24 && h % 24 === 0) {
      const d = h / 24
      const dText = String(d)
      return { label: `Dalam ${dText} hari`, sentenceLower: `dalam ${dText} hari`, short: `${dText} hari` }
    }
    const hText = String(h)
    return { label: `Dalam ${hText} jam`, sentenceLower: `dalam ${hText} jam`, short: `${hText} jam` }
  }, [deliveryDelayHours, instantEnabled])

  useEffect(() => {
    let cancelled = false
    apiGet<{
      emailOtpEnabled?: boolean
      whatsappEnabled?: boolean
      agreementEnabled?: boolean
      publicSiteConfig?: unknown
      instantEnabled?: boolean
      deliveryDelayHours?: number
      manualConfirmationEnabled?: boolean
      paymentAmount?: number
      originalAmount?: number
      metaPixelWishlistId?: string | null
      metaPixelStep1Script?: string | null
      metaPixelStep4Script?: string | null
    }>(`/api/public/settings${themeSlug ? `?theme=${encodeURIComponent(themeSlug)}` : ''}`)
      .then((res) => {
        if (cancelled) return
        setEmailOtpEnabled(res?.emailOtpEnabled ?? true)
        setWhatsappEnabled(res?.whatsappEnabled ?? true)
        setAgreementEnabled(res?.agreementEnabled ?? false)
        setInstantEnabled(typeof res?.instantEnabled === 'boolean' ? res.instantEnabled : null)
        setDeliveryDelayHours(typeof res?.deliveryDelayHours === 'number' ? res.deliveryDelayHours : null)
        setManualConfirmationEnabled(Boolean(res?.manualConfirmationEnabled))
        setPaymentAmount(res?.paymentAmount ?? 497000)
        setOriginalAmount(res?.originalAmount ?? 497000)
        setWishlistPixelId(res?.metaPixelWishlistId ?? null)
        setPixelStep1Script(res?.metaPixelStep1Script ?? null)
        setPixelStep4Script(res?.metaPixelStep4Script ?? null)
        
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

        setPublicSiteConfig(publicSiteConfig ?? null)
        setSettingsLoaded(true)
      })
      .catch(() => {
        if (!cancelled) {
          setPublicSiteConfig(null)
          setEmailOtpEnabled(true)
          setSettingsLoaded(true)
        }
      })
    return () => { cancelled = true }
  }, [])

  // Email verification (OTP) state for checkout step
  const [emailOtpEnabled, setEmailOtpEnabled] = useState(true)
  const [whatsappEnabled, setWhatsappEnabled] = useState(true)
  const [agreementEnabled, setAgreementEnabled] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null)
  const [publicSiteConfig, setPublicSiteConfig] = useState<unknown>(undefined)

  const configSteps = useMemo(() => {
    const cfg = publicSiteConfig && typeof publicSiteConfig === 'object' ? (publicSiteConfig as any) : {}
    const cs = cfg?.configSteps && typeof cfg.configSteps === 'object' ? cfg.configSteps : {}
    const s0 = cs?.step0 && typeof cs.step0 === 'object' ? cs.step0 : {}
    const s1 = cs?.step1 && typeof cs.step1 === 'object' ? cs.step1 : {}
    const s2 = cs?.step2 && typeof cs.step2 === 'object' ? cs.step2 : {}
    const s3 = cs?.step3 && typeof cs.step3 === 'object' ? cs.step3 : {}
    const s4 = cs?.step4 && typeof cs.step4 === 'object' ? cs.step4 : {}

    const str = (v: unknown, fb: string) => typeof v === 'string' && v.trim() ? v : fb
    const arr = <T,>(v: unknown, map: (x: any) => T): T[] => Array.isArray(v) ? v.map(map) : []

    const howSteps = arr(s0?.howItWorksSteps, (x: any) => ({
      title: str(x?.title, ''),
      subtitle: str(x?.subtitle, ''),
    })).filter((x: any) => x.title)

    const relChips = arr(s1?.relationshipChips, (x: any) => ({
      label: str(x?.label, ''),
      icon: typeof x?.icon === 'string' ? x.icon.trim() : '',
      value: str(x?.value, ''),
    })).filter((x: any) => x.label && x.value)

    const vibeChips = arr(s2?.vibeChips, (x: any) => ({
      id: str(x?.id, ''),
      label: str(x?.label, ''),
      desc: str(x?.desc, ''),
      icon: typeof x?.icon === 'string' ? x.icon.trim() : '',
      badge: x?.badge ? str(x.badge, '') : undefined,
    })).filter((x: any) => x.id && x.label)

    const voiceOptions = arr(s2?.voiceOptions, (x: any) => ({
      value: str(x?.value, ''),
      label: str(x?.label, ''),
    })).filter((x: any) => x.value && x.label)

    const languageOptions = arr(s2?.languageOptions, (x: any) => ({
      value: str(x?.value, ''),
      label: str(x?.label, ''),
    })).filter((x: any) => x.value && x.label)

    const tipBullets = arr(s3?.tipBullets, (x: any) => typeof x === 'string' ? x : '').filter((x: string) => x.trim())

    const storyPrompts = arr(s3?.storyPrompts, (x: any) => ({
      label: str(x?.label, ''),
      icon: str(x?.icon, '💡'),
    })).filter((x: any) => x.label)

    const nextSteps = arr(s4?.nextSteps, (x: any) => ({ text: str(x?.text, '') })).filter((x: any) => x.text)
    const manualNextSteps = arr(s4?.manualNextSteps, (x: any) => ({ text: str(x?.text, '') })).filter((x: any) => x.text)
    const securityBadges = arr(s4?.securityBadges, (x: any) => typeof x === 'string' ? x : '').filter((x: string) => x.trim())

    return {
      step0: {
        enabled: typeof s0?.enabled === 'boolean' ? s0.enabled : true,
        bannerHeadline: str(s0?.bannerHeadline, 'Kado Valentine Paling Romantis'),
        mainHeadline: str(s0?.mainHeadline, 'Rekam emosi mereka saat mendengar lagu untuk menang <span class="text-[var(--theme-accent)]">Rp 1.000.000!</span>'),
        guaranteeTitle: str(s0?.guaranteeTitle, 'GARANSI UANG TUNAI'),
        guaranteeText: str(s0?.guaranteeText, 'Setiap video reaksi yang jelas <span class="font-bold underline decoration-green-500/50">pasti dapat Rp 75.000</span>.'),
        howItWorksTitle: str(s0?.howItWorksTitle, 'Cara Ikutan'),
        howItWorksSteps: howSteps.length ? howSteps : [
          { title: 'Buat Lagu Gratis', subtitle: 'Hemat 100%' },
          { title: 'Rekam Reaksinya', subtitle: 'Wajib Video!' },
          { title: 'Kirim & Menang', subtitle: 'Dapat Cuan!' },
        ],
        bottomCtaText: str(s0?.bottomCtaText, 'Klik tombol di bawah untuk mulai 👇'),
      },
      step1: {
        headline: str(s1?.headline, 'Siapa penerimanya?'),
        subtitle: str(s1?.subtitle, 'Namanya akan ada di dalam lirik'),
        relationshipChips: relChips.length ? relChips : [
          { label: 'Pasangan', icon: '💕', value: 'Pasangan' },
          { label: 'Suami', icon: '💍', value: 'Suami' },
          { label: 'Pacar', icon: '❤️', value: 'Pacar' },
          { label: 'Tunangan', icon: '💎', value: 'Tunangan' },
          { label: 'Istri', icon: '👰', value: 'Istri' },
        ],
        nameFieldLabel: str(s1?.nameFieldLabel, 'Nama Panggilannya'),
        nameFieldPlaceholder: str(s1?.nameFieldPlaceholder, 'cth. Salsa'),
        occasionFieldLabel: str(s1?.occasionFieldLabel, 'Untuk momen apa?'),
        occasionFieldPlaceholder: str(s1?.occasionFieldPlaceholder, 'cth. Anniversary, Ultah, Wisuda'),
        socialProofText: str(s1?.socialProofText, 'Bergabung dengan 2,847 orang yang membuat pasangannya menangis bahagia'),
      },
      step2: {
        headline: str(s2?.headline, 'Pilih Vibe'),
        subtitle: str(s2?.subtitle, 'Sesuaikan dengan selera musiknya'),
        vibeChips: vibeChips.length ? vibeChips : [
          { id: 'Country', label: 'Country', desc: 'Bercerita & tulus', icon: '🤠' },
          { id: 'Acoustic', label: 'Acoustic', desc: 'Hangat & intim', icon: '🎸' },
          { id: 'Pop Ballad', label: 'Pop Ballad', desc: 'Modern & emosional', icon: '🎹', badge: 'Best' },
          { id: 'R&B Soul', label: 'R&B Soul', desc: 'Halus & romantis', icon: '🌙' },
          { id: 'Rock', label: 'Rock', desc: 'Kuat & penuh gairah', icon: '⚡' },
          { id: 'Piano Ballad', label: 'Piano Ballad', desc: 'Elegan & abadi', icon: '🎻' },
        ],
        voiceLabel: str(s2?.voiceLabel, 'Suara Penyanyi'),
        voiceOptions: voiceOptions.length ? voiceOptions : [
          { value: 'Female', label: 'Wanita' },
          { value: 'Male', label: 'Pria' },
          { value: 'Surprise me', label: 'Bebas' },
        ],
        languageLabel: str(s2?.languageLabel, 'Bahasa lirik'),
        languageOptions: languageOptions.length ? languageOptions : [
          { value: 'English', label: 'English' },
          { value: 'Indonesian', label: 'Bahasa Indonesia' },
        ],
      },
      step3: {
        headline: str(s3?.headline, 'Ceritakan kisahmu'),
        subtitle: str(s3?.subtitle, 'Ini akan menjadi lirik. <span class="text-[var(--theme-accent)] font-medium">Beberapa kalimat saja!</span>'),
        tipBullets: tipBullets.length ? tipBullets : [
          'Semakin kaya detail, semakin kuat emosinya.',
          'Ceritakan pertemuan, hal yang dicintai, atau kenangan lucu.',
        ],
        storyPrompts: storyPrompts.length ? storyPrompts : [
          { label: 'Awal bertemu', icon: '💞' },
          { label: 'Yang aku suka darinya', icon: '😍' },
          { label: 'Jokes internal kami', icon: '😂' },
          { label: 'Mimpi masa depan', icon: '🔮' },
        ],
        textareaPlaceholder: str(s3?.textareaPlaceholder, 'Mulai ketik ceritamu di sini...'),
      },
      step4: {
        headline: str(s4?.headline, 'Semua siap!'),
        subtitleTemplate: str(s4?.subtitleTemplate, 'Kirim lagu {recipient} ke mana?'),
        manualSubtitle: str(s4?.manualSubtitle, 'Konfirmasi pesanan via WhatsApp'),
        orderSummaryLabel: str(s4?.orderSummaryLabel, 'Ringkasan Pesanan'),
        orderSummaryEmoji: typeof s4?.orderSummaryEmoji === 'string' ? s4.orderSummaryEmoji.trim() : '💝',
        whatsappLabel: str(s4?.whatsappLabel, 'Nomor WhatsApp'),
        whatsappPlaceholder: str(s4?.whatsappPlaceholder, 'Masukkan nomor WhatsApp'),
        emailLabel: str(s4?.emailLabel, 'Alamat Email'),
        emailPlaceholder: str(s4?.emailPlaceholder, 'nama@email.com'),
        nextStepsTitle: str(s4?.nextStepsTitle, 'Apa selanjutnya?'),
        nextSteps: nextSteps.length ? nextSteps : [
          { text: 'Kami membuat lagu personalmu' },
          { text: 'Dikirim via email & WA {delivery}' },
          { text: 'Putar untuknya dan lihat dia menangis 😭' },
        ],
        manualNextSteps: manualNextSteps.length ? manualNextSteps : [
          { text: 'Admin memproses pesanan' },
          { text: 'Lanjut chat admin WhatsApp untuk konfirmasi.' },
          { text: 'Putar untuknya dan lihat dia menangis 😭' },
        ],
        securityBadges: securityBadges.length ? securityBadges : ['Checkout aman', '{delivery}'],
        draftTimerText: str(s4?.draftTimerText, 'Cerita tersimpan selama {timer} — selesaikan checkout untuk menyimpannya'),
        checkoutButtonText: str(s4?.checkoutButtonText, 'Ke checkout'),
        checkoutSubtext: str(s4?.checkoutSubtext, 'Siap bikin sesuatu yang spesial untuk {recipient}?'),
        manualCheckoutButtonText: str(s4?.manualCheckoutButtonText, 'Konfirmasi via WhatsApp'),
        showPriceInButton: typeof s4?.showPriceInButton === 'boolean' ? s4.showPriceInButton : true,
        checkoutImageUrl: str(s4?.checkoutImageUrl, '/images/checkout-studio.png'),
        showCheckoutImage: typeof s4?.showCheckoutImage === 'boolean' ? s4.showCheckoutImage : true,
      },
    }
  }, [publicSiteConfig])

  const funnelPriceVisibility = useMemo(() => {
    const cfg = publicSiteConfig && typeof publicSiteConfig === 'object' ? (publicSiteConfig as any) : {}
    const pv = cfg?.priceVisibility && typeof cfg.priceVisibility === 'object' ? cfg.priceVisibility : {}
    return {
      funnelHeader: pv.funnelHeader !== false,
      orderSummary: pv.orderSummary !== false,
      checkoutButton: pv.checkoutButton !== false,
    }
  }, [publicSiteConfig])

  const checkoutExtraData = useMemo(() => {
    const cfg = publicSiteConfig && typeof publicSiteConfig === 'object' ? (publicSiteConfig as any) : {}

    const faqRaw = cfg?.faqSection
    const faqItems: Array<{ q: string; a: string }> = []
    if (faqRaw?.items && Array.isArray(faqRaw.items)) {
      for (const it of faqRaw.items) {
        if (it?.q && it?.a) faqItems.push({ q: String(it.q), a: String(it.a) })
      }
    }
    if (!faqItems.length) {
      faqItems.push(
        { q: "Dia bukan tipe yang emosional...", a: "Itu yang MEREKA SEMUA katakan! 98% menangis. Semakin tangguh mereka, semakin dalam jatuhnya. 😉" },
        { q: "Bagaimana dia menerima lagunya?", a: "Kamu menerima link download via email. Putar untuknya secara langsung, kirim via WhatsApp, atau jadikan kejutan!" },
        { q: "Kalau aku gak suka gimana?", a: "Revisi gratis tanpa batas sampai kamu suka. Masih gak puas? Refund penuh, tanpa tanya-tanya. 💕" },
      )
    }

    const gSec = cfg?.guaranteeSection
    const guarantee = {
      badge: typeof gSec?.badge === 'string' && gSec.badge.trim() ? gSec.badge : '100% PUAS',
      headline: typeof gSec?.headline === 'string' && gSec.headline.trim() ? gSec.headline : 'Garansi Kepuasan',
      description: typeof gSec?.description === 'string' && gSec.description.trim() ? gSec.description : 'Revisi gratis tanpa batas. Tidak puas? Uang kembali 100%, tanpa tanya-tanya.',
    }

    const landing = cfg?.landing && typeof cfg.landing === 'object' ? cfg.landing : {}
    const as_ = landing?.audioSamples && typeof landing.audioSamples === 'object' ? landing.audioSamples : {}
    const playlist: Array<{ title: string; subtitle: string; audioUrl: string }> = []
    const np = as_?.nowPlaying
    if (np && typeof np === 'object' && typeof np.name === 'string' && np.name.trim()) {
      playlist.push({
        title: String(np.name),
        subtitle: typeof np.time === 'string' ? np.time : '',
        audioUrl: typeof np.audioUrl === 'string' ? np.audioUrl : '',
      })
    }
    if (Array.isArray(as_?.playlist)) {
      for (const t of as_.playlist) {
        if (t?.title) {
          playlist.push({
            title: String(t.title),
            subtitle: typeof t.subtitle === 'string' ? t.subtitle : '',
            audioUrl: typeof t.audioUrl === 'string' ? t.audioUrl : '',
          })
        }
      }
    }

    const pb = cfg?.promoBanner && typeof cfg.promoBanner === 'object' ? cfg.promoBanner : {}
    const promoBanner = {
      enabled: pb.enabled !== false,
      countdownLabel: typeof pb.countdownLabel === 'string' && pb.countdownLabel.trim() ? pb.countdownLabel : "💝 Valentine's dalam",
      countdownTargetDate: typeof pb.countdownTargetDate === 'string' && pb.countdownTargetDate.trim() ? pb.countdownTargetDate : '2027-02-14',
      evergreenEnabled: pb.evergreenEnabled ?? false,
      evergreenCycleHours: typeof pb.evergreenCycleHours === 'number' ? pb.evergreenCycleHours : 24,
    }

    return { faqItems, guarantee, playlist, promoBanner }
  }, [publicSiteConfig])

  useEffect(() => {
    if (settingsLoaded && !configSteps.step0.enabled && step === 0) {
      setStep(1)
    }
  }, [settingsLoaded, configSteps.step0.enabled])

  useEffect(() => {
    if (step === 1 && pixelStep1Script && !pixelStep1Fired.current) {
      pixelStep1Fired.current = true
      executePixelScript(pixelStep1Script)
    }
    if (step === 4 && pixelStep4Script && !pixelStep4Fired.current) {
      pixelStep4Fired.current = true
      executePixelScript(pixelStep4Script)
    }
  }, [step, pixelStep1Script, pixelStep4Script])

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
      themeSlug: themeSlug ?? null,
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

      const relParam = searchParams.get('rel')
      if (relParam) {
        setStep(initialStep)
        setRelationship(relParam)
      } else {
        setStep(initialStep)
        setRelationship(nextRelationship)
      }
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

  const minStep = configSteps.step0.enabled ? 0 : 1

  const handleNext = async () => {
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
    setStep((prev) => Math.max(prev - 1, minStep))
    window.scrollTo(0, 0)
  }

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

  const discountedPaymentAmount = appliedDiscount
    ? Math.max(0, paymentAmount - appliedDiscount.amount)
    : paymentAmount

  async function validateDiscountCode() {
    const code = discountCodeInput.trim()
    if (!code) return
    setDiscountValidating(true)
    setDiscountError(null)
    try {
      const res = await apiPost<{ valid: boolean; discountAmount?: number; error?: string }>('/api/public/discount/validate', {
        code,
        templateSlug: themeSlug ?? null,
        phoneNumber: form.getValues('whatsappNumber') || null,
      })
      if (res.valid && typeof res.discountAmount === 'number') {
        setAppliedDiscount({ code: code.toUpperCase(), amount: res.discountAmount })
        setDiscountError(null)
      } else {
        setDiscountError(res.error ?? 'Kode diskon tidak valid.')
        setAppliedDiscount(null)
      }
    } catch (e: any) {
      setDiscountError(e?.message ?? 'Gagal memvalidasi kode diskon.')
      setAppliedDiscount(null)
    } finally {
      setDiscountValidating(false)
    }
  }

  const onSubmit = async (data: OrderInput) => {
    if (!manualConfirmationEnabled && emailOtpEnabled) {
      if (!data.email) {
        setError('Masukkan alamat email untuk melanjutkan.')
        return
      }
      if (!emailVerified || !data.emailVerificationId) {
        setError('Verifikasi email dulu sebelum lanjut ke checkout.')
        return
      }
    }
    setLoading(true)
    setError(null)
    try {
      // Clear any previous server-side field errors.
      form.clearErrors('whatsappNumber')
      const payload: Record<string, unknown> = { ...data, whatsappNumber: whatsappEnabled ? data.whatsappNumber : '' }
      if (!whatsappEnabled) {
        delete payload.whatsappNumber
      }
      if (manualConfirmationEnabled || !emailOtpEnabled) {
        delete payload.email
        delete payload.emailVerificationId
      }
      // Agreement UI is temporarily disabled, but backend may still enforce it.
      // If enabled in settings, auto-accept to avoid blocking the public flow.
      if (agreementEnabled) (payload as Record<string, unknown>).agreementAccepted = true
      const res = await apiPost<{ orderId: string; xenditInvoiceUrl?: string }>('/api/orders/draft', { ...payload, themeSlug: themeSlug ?? null, ...(appliedDiscount ? { discountCode: appliedDiscount.code } : {}) })
      clearDraft()

      // Fire browser Lead pixel with the same eventID as server-side CAPI for deduplication.
      trackPixelEvent('Lead', { content_name: 'Lagu Personal', currency: 'IDR', value: 0 }, `order_created:${res.orderId}`)

      if (wishlistPixelId) {
        ensureMetaPixelLoaded(wishlistPixelId)
        trackWishlist(wishlistPixelId, { content_name: 'Lagu Personal Valentine' })
      }

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

      if (res.xenditInvoiceUrl) {
        window.location.href = res.xenditInvoiceUrl
        return
      }

      navigate(`/checkout?orderId=${encodeURIComponent(res.orderId)}`)
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Something went wrong. Please try again.')
      if (whatsappEnabled) {
        form.setError('whatsappNumber', { type: 'server', message: msg })
        whatsappSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setError(null)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const onInvalid = (_errs: FieldErrors<OrderInput>) => {
    // Make it visible even if the invalid field is on a previous step.
    setError('Data belum lengkap. Mohon lengkapi semua field yang wajib di langkah sebelumnya sebelum melanjutkan.')
  }

  // When admin enables manual confirmation, the public flow must not be blocked by hidden email/OTP fields.
  useEffect(() => {
    if (!manualConfirmationEnabled) return
    form.clearErrors(['email', 'emailVerificationId'])
    setValue('email', undefined, { shouldDirty: false, shouldTouch: false, shouldValidate: false })
    setValue('emailVerificationId', undefined, { shouldDirty: false, shouldTouch: false, shouldValidate: false })
    setEmailVerificationId(null)
    setOtpDigits(['', '', '', ''])
    setOtpError(null)
    setEmailVerified(false)
  }, [manualConfirmationEnabled, form, setValue, step])

  useEffect(() => {
    if (!error) return
  }, [error])

  useEffect(() => {
    if (step === 4) {
      setDraftCountdown(10 * 60)
      draftCountdownRef.current = setInterval(() => {
        setDraftCountdown((prev) => {
          if (prev <= 1) {
            if (draftCountdownRef.current) clearInterval(draftCountdownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (draftCountdownRef.current) {
        clearInterval(draftCountdownRef.current)
        draftCountdownRef.current = null
      }
    }
    return () => {
      if (draftCountdownRef.current) clearInterval(draftCountdownRef.current)
    }
  }, [step])

  const themeColors = (publicSiteConfig as any)?.colors
  const themeStyle = {
    '--theme-accent': themeColors?.accentColor || '#E11D48',
    '--theme-button': themeColors?.buttonColor || themeColors?.accentColor || '#E11D48',
    '--theme-accent-soft': themeColors?.bgColor1 || '#FFF5F7',
    '--theme-bg': themeColors?.bgColor2 || '#FFFFFF',
  } as React.CSSProperties

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''
  const resolveAsset = (v: string) => {
    const s = (v ?? '').trim()
    if (!s) return ''
    if (/^https?:\/\//i.test(s)) return s
    return apiBase + s
  }
  const logoUrl = typeof (publicSiteConfig as any)?.logoUrl === 'string' && (publicSiteConfig as any).logoUrl.trim()
    ? resolveAsset((publicSiteConfig as any).logoUrl)
    : '/logo.webp'

  if (!isHydrated || publicSiteConfig === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={publicSiteConfig !== undefined ? themeStyle : undefined}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--theme-accent-soft)] font-sans text-gray-900 pb-32" style={themeStyle}>
      {checkoutExtraData.promoBanner.enabled && (
        <CountdownTimer
          paymentAmount={null}
          originalAmount={null}
          countdownLabel={checkoutExtraData.promoBanner.countdownLabel}
          countdownTargetDate={checkoutExtraData.promoBanner.countdownTargetDate}
          evergreenEnabled={checkoutExtraData.promoBanner.evergreenEnabled}
          evergreenCycleHours={checkoutExtraData.promoBanner.evergreenCycleHours}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--theme-accent-soft)] bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2">
          <button 
            type="button"
            onClick={() => navigate(`/${themeSlug || ''}`)}
            className="hover:opacity-80 transition-opacity"
          >
            <img src={logoUrl} alt="Laguin - Musikmu Ceritamu" className="h-8 sm:h-10 w-auto object-contain" />
          </button>
          {funnelPriceVisibility.funnelHeader && (
            <div className="text-right flex items-center gap-1.5">
               <span className="text-[10px] sm:text-xs text-gray-400 line-through">{fmtCurrency(originalAmount)}</span>
               <span className="text-sm sm:text-lg font-bold text-[var(--theme-accent)]">{fmtCurrency(paymentAmount)}</span>
               <Badge variant="destructive" className="ml-1 text-[9px] sm:text-[10px] px-1.5 py-0 h-4 sm:h-5 min-w-[36px] justify-center">11 sisa</Badge>
            </div>
          )}
        </div>
        {step > 0 && step < 4 && (
          <div className="px-4 pb-2 pt-1 max-w-4xl mx-auto w-full">
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--theme-accent)] rounded-full transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] font-semibold text-gray-700">Step {step} of 4</span>
              <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" /> Takes ~2 min</span>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-4xl w-full px-4 pt-0 pb-4 sm:py-8 lg:py-12">
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          
          {/* STEP 0: ANNOUNCEMENT - halaman pengumuman */}
          {step === 0 && configSteps.step0.enabled && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4 -mx-4 sm:mx-0">
              <div className="bg-[var(--theme-button)] px-4 py-3 flex items-center justify-center gap-2 text-white">
                <Megaphone className="h-4 w-4 shrink-0" />
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">{configSteps.step0.bannerHeadline}</span>
              </div>

              <div className="bg-white px-4 sm:px-8 py-6 sm:py-8 text-center space-y-4 sm:space-y-6">
                <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-gray-900 leading-snug mx-auto max-w-lg" dangerouslySetInnerHTML={{ __html: configSteps.step0.mainHeadline }} />

                <div className="relative mx-auto rounded-xl overflow-hidden bg-gray-100 shadow-md ring-1 ring-gray-200 w-[110px] sm:w-[180px] md:w-[220px] aspect-[9/16]">
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
                     <div className="flex items-center justify-center h-full text-gray-400 text-xs italic">Video preview</div>
                   )}
                </div>

                <div className="mx-auto max-w-md w-full">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-green-800 text-center">
                    <p className="font-bold mb-1 flex items-center justify-center gap-2 text-base sm:text-lg"><span className="text-xl">🤑</span> {configSteps.step0.guaranteeTitle}</p>
                    <p className="leading-relaxed opacity-90" dangerouslySetInnerHTML={{ __html: configSteps.step0.guaranteeText }} />
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-400 italic mt-2 text-center">*Syarat dan ketentuan berlaku</p>
                </div>
              </div>

              <div className="bg-gradient-to-b from-[var(--theme-accent-soft)] to-white px-4 py-6 sm:py-10 border-t border-[var(--theme-accent-soft)]">
                <h3 className="text-[10px] sm:text-xs font-bold text-[var(--theme-accent)] mb-4 sm:mb-8 text-center uppercase tracking-widest">{configSteps.step0.howItWorksTitle}</h3>
                
                <div className={`grid ${configSteps.step0.howItWorksSteps.length <= 2 ? 'grid-cols-2' : configSteps.step0.howItWorksSteps.length >= 4 ? 'grid-cols-4' : 'grid-cols-3'} gap-4 sm:gap-8 max-w-lg mx-auto`}>
                  {configSteps.step0.howItWorksSteps.map((s, i) => (
                    <div key={i} className="flex flex-col items-center text-center">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[var(--theme-accent)] text-white flex items-center justify-center text-xs sm:text-sm font-bold mb-2 shadow-sm">{i + 1}</div>
                      <p className="font-bold text-[10px] sm:text-sm text-gray-800 leading-tight">{s.title}</p>
                      <p className="text-[9px] sm:text-xs text-gray-500 leading-none mt-1">{s.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-[10px] sm:text-sm text-gray-400 mt-4 px-4 animate-bounce">{configSteps.step0.bottomCtaText}</p>
            </div>
          )}

          {/* STEP 1: WHO IS IT FOR? */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                  <Heart className="h-5 w-5 text-[var(--theme-accent)] fill-[var(--theme-accent-soft)]" />
                  {configSteps.step1.headline}
                </h1>
                <p className="text-xs text-gray-500">{configSteps.step1.subtitle}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[...configSteps.step1.relationshipChips, { label: 'Lainnya', icon: '', value: 'Lainnya' }].map((chip) => (
                  <SelectionChip
                    key={chip.value}
                    label={chip.label}
                    icon={chip.icon}
                    selected={relationship === chip.value}
                    onClick={() => {
                      setRelationship(chip.value)
                      setValue('extraNotes', `Relasi dengan penerima: ${chip.value}`)
                      if (chip.value !== 'Lainnya') setValue('occasion', '')
                    }}
                  />
                ))}
              </div>

              {relationship === 'Lainnya' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{configSteps.step1.occasionFieldLabel}</label>
                  <Input 
                    {...register('occasion')} 
                    placeholder={configSteps.step1.occasionFieldPlaceholder}
                    className="h-11 rounded-xl border-gray-300 text-base shadow-sm bg-white focus-visible:ring-[var(--theme-accent)]"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{configSteps.step1.nameFieldLabel}</label>
                <Input 
                  {...register('recipientName')} 
                  placeholder={configSteps.step1.nameFieldPlaceholder}
                  className="h-11 rounded-xl border-gray-300 text-base shadow-sm focus-visible:ring-[var(--theme-accent)]"
                />
                {errors.recipientName && <p className="text-xs text-[var(--theme-accent)]">{errors.recipientName.message}</p>}
                <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  Nama ini akan dinyanyikan dalam lirik!
                </div>
              </div>

              {configSteps.step1.socialProofText && (
                <div className="text-center text-[10px] text-gray-400 mt-4">
                  {configSteps.step1.socialProofText}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: VIBE */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                  <Music className="h-5 w-5 text-[var(--theme-accent)]" />
                  {configSteps.step2.headline}
                </h1>
                <p className="text-xs text-gray-500">{configSteps.step2.subtitle}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {configSteps.step2.vibeChips.map((g) => (
                  <VibeCard
                    key={g.id}
                    label={g.label}
                    description={g.desc}
                    icon={g.icon}
                    badge={g.badge}
                    selected={genre === g.id}
                    onClick={() => setValue('musicPreferences.genre', g.id)}
                  />
                ))}
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-100 text-center space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{configSteps.step2.voiceLabel}</label>
                <div className="flex justify-center gap-4">
                  {configSteps.step2.voiceOptions.map((v) => (
                    <label key={v.value} className="flex items-center gap-1.5 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                      <input 
                        type="radio" 
                        value={v.value} 
                        {...register('musicPreferences.voiceStyle')}
                        className="text-[var(--theme-accent)] focus:ring-[var(--theme-accent)] w-3 h-3" 
                      />
                      <span className="text-xs font-medium">{v.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-100 text-center space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{configSteps.step2.languageLabel}</label>
                <select
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
                  value={language || configSteps.step2.languageOptions[1]?.value || 'Indonesian'}
                  onChange={(e) => setValue('musicPreferences.language', e.target.value)}
                >
                  {configSteps.step2.languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: STORY */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                  <PenLine className="h-5 w-5 text-[var(--theme-accent)]" />
                  {configSteps.step3.headline}
                </h1>
                <p className="text-xs text-gray-500" dangerouslySetInnerHTML={{ __html: configSteps.step3.subtitle }} />
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {configSteps.step3.tipBullets.map((bullet, i) => (
                  <div key={i}>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> Ide Topik:
                </div>
                <div className="flex flex-wrap gap-2">
                  {configSteps.step3.storyPrompts.map((prompt) => (
                    <PromptChip 
                      key={prompt.label} 
                      label={prompt.label} 
                      icon={prompt.icon}
                      onClick={() => appendStoryPrompt(prompt.label)}
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
                  placeholder={configSteps.step3.textareaPlaceholder}
                  maxLength={4000}
                  className="rounded-xl border-gray-300 text-base shadow-sm focus-visible:ring-[var(--theme-accent)] resize-none p-4"
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
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2 pb-4">

              {/* 1. Headline + subtitle + delivery badge */}
              <div className="text-center space-y-2">
                <PartyPopper className="mx-auto h-6 w-6 text-yellow-500" />
                <h1 className="text-2xl font-serif font-bold text-gray-900">{configSteps.step4.headline}</h1>
                <p className="text-sm text-gray-500">
                  {manualConfirmationEnabled
                    ? configSteps.step4.manualSubtitle
                    : configSteps.step4.subtitleTemplate.replace('{recipient}', currentRecipient)}
                </p>
                <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
                  <Zap className="h-3 w-3" />
                  {deliveryEta.label}
                </div>
              </div>

              {/* 2. Contact inputs (WhatsApp + Email + OTP) — all conditional logic preserved */}
              <div className="space-y-4">
                {whatsappEnabled && (
                  <div className="space-y-1">
                    <div ref={whatsappSectionRef} />
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{configSteps.step4.whatsappLabel}</label>
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
                                setError(null)
                                form.clearErrors('whatsappNumber')
                                const raw = e.target.value.replace(/\D/g, '')
                                let normalizedLocal = raw.replace(/^0+/, '')
                                if (normalizedLocal.startsWith('62')) normalizedLocal = normalizedLocal.slice(2)
                                field.onChange(`62${normalizedLocal}`)
                              }}
                              placeholder={configSteps.step4.whatsappPlaceholder}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              type="tel"
                              className="h-12 rounded-xl border-gray-300 shadow-sm focus-visible:ring-[var(--theme-accent)] pl-12 bg-white"
                            />
                          </div>
                        )
                      }}
                    />
                    {errors.whatsappNumber && <p className="text-xs text-[var(--theme-accent)]">{errors.whatsappNumber.message}</p>}
                  </div>
                )}

                {!manualConfirmationEnabled && emailOtpEnabled ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{configSteps.step4.emailLabel}</label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                          <Mail className="h-4 w-4" />
                        </div>
                        <Input
                          {...register('email')}
                          placeholder={configSteps.step4.emailPlaceholder}
                          type="email"
                          disabled={emailVerified}
                          className={`h-12 rounded-xl border-gray-300 shadow-sm focus-visible:ring-[var(--theme-accent)] pl-10 ${emailVerified ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      {errors.email && <p className="text-xs text-[var(--theme-accent)]">{errors.email.message}</p>}
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
                                      className="h-10 w-10 text-center text-lg font-bold rounded-lg border-gray-300 shadow-sm focus-visible:ring-[var(--theme-accent)]"
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
                              <p className="text-[10px] text-[var(--theme-accent)] text-center">{otpError}</p>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}
                  </>
                ) : null}

                {/* Agreement UI temporarily disabled (keep announcement step). */}

                {/* Primary CTA after contact inputs */}
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-[var(--theme-button)] text-sm font-bold text-white shadow-lg shadow-[var(--theme-accent-soft)] hover:bg-[var(--theme-button)] active:scale-95 transition-all"
                  disabled={
                    loading ||
                    (!manualConfirmationEnabled && emailOtpEnabled && !emailVerified)
                  }
                >
                  {loading ? 'Memproses...' : (manualConfirmationEnabled ? configSteps.step4.manualCheckoutButtonText : `${configSteps.step4.checkoutButtonText}${funnelPriceVisibility.checkoutButton ? ` — ${fmtCurrency(discountedPaymentAmount)}` : ''}`)}
                </Button>

                {/* Trust badges */}
                <div className="flex justify-center gap-4 text-[10px] text-gray-400">
                  {configSteps.step4.securityBadges.map((badge, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {i === 0 ? <ShieldCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {badge.replace('{delivery}', deliveryEta.short)}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Order Summary — always visible, no accordion */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    {configSteps.step4.orderSummaryEmoji && <span className="text-base">{configSteps.step4.orderSummaryEmoji}</span>}
                    <span className="text-xs font-bold text-gray-700">{configSteps.step4.orderSummaryLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[10px] font-semibold text-[var(--theme-accent)] hover:underline flex items-center gap-0.5"
                  >
                    Ubah <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="p-4 text-xs space-y-2">
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
                  {funnelPriceVisibility.orderSummary && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Lagu Personal <span className="text-gray-400">({relationship})</span></span>
                          {originalAmount > paymentAmount && !appliedDiscount && (
                            <span className="text-[10px] font-bold bg-[var(--theme-accent)] text-white px-2 py-0.5 rounded-full">HEMAT {Math.round((1 - paymentAmount / originalAmount) * 100)}%</span>
                          )}
                        </div>

                        {/* Discount code section */}
                        <div className="py-2">
                          {!appliedDiscount && !discountInputOpen && (
                            <button
                              type="button"
                              onClick={() => setDiscountInputOpen(true)}
                              className="text-sm font-semibold text-[var(--theme-accent)] hover:text-[var(--theme-accent)] flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-[var(--theme-accent)] border-opacity-30 hover:bg-[var(--theme-accent)] hover:bg-opacity-5 transition-all"
                            >
                              <Tag className="h-4 w-4" /> Add discount code
                            </button>
                          )}
                          {!appliedDiscount && discountInputOpen && (
                            <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex gap-2">
                                <Input
                                  value={discountCodeInput}
                                  onChange={e => { setDiscountCodeInput(e.target.value.toUpperCase()); setDiscountError(null) }}
                                  placeholder="Kode diskon"
                                  className="h-10 text-sm flex-1 uppercase font-semibold"
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  className="h-10 text-sm px-4 bg-[var(--theme-accent)] text-white hover:bg-[var(--theme-accent)] font-semibold"
                                  onClick={() => void validateDiscountCode()}
                                  disabled={discountValidating || !discountCodeInput.trim()}
                                >
                                  {discountValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                                </Button>
                              </div>
                              {discountError && <p className="text-xs text-red-600 text-center font-medium">{discountError}</p>}
                            </div>
                          )}
                          {appliedDiscount && (
                            <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-green-100 border border-green-300 rounded-lg px-4 py-2.5 shadow-sm">
                              <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-bold text-green-800">{appliedDiscount.code}</span>
                                <span className="text-xs font-bold bg-green-600 text-white px-2 py-1 rounded-full">HEMAT {fmtCurrency(appliedDiscount.amount)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setAppliedDiscount(null); setDiscountCodeInput(''); setDiscountError(null) }}
                                className="text-xs text-red-600 hover:text-red-700 font-semibold hover:underline"
                              >
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Total</span>
                          <span className="font-bold text-[var(--theme-accent)] flex items-center gap-2">
                            {(originalAmount > paymentAmount || appliedDiscount) && (
                              <span className="text-gray-400 line-through font-normal">{fmtCurrency(appliedDiscount ? paymentAmount : originalAmount)}</span>
                            )}
                            {fmtCurrency(appliedDiscount ? discountedPaymentAmount : paymentAmount)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 5. Mini sample songs playlist */}
              {checkoutExtraData.playlist.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-gray-800 text-center flex items-center justify-center gap-1.5"><Music className="h-4 w-4" /> Contoh Lagu yang Dibuat</div>
                  <audio
                    ref={miniPlayerRef}
                    onEnded={() => setPlayingTrackIdx(null)}
                    onError={() => setPlayingTrackIdx(null)}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    {checkoutExtraData.playlist.slice(0, 3).map((track, i) => {
                      const isPlaying = playingTrackIdx === i
                      const audioSrc = track.audioUrl ? resolveAsset(track.audioUrl) : ''
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={!audioSrc}
                          onClick={() => {
                            const audio = miniPlayerRef.current
                            if (!audio || !audioSrc) return
                            if (isPlaying) {
                              audio.pause()
                              setPlayingTrackIdx(null)
                            } else {
                              audio.src = audioSrc
                              audio.play().catch(() => setPlayingTrackIdx(null))
                              setPlayingTrackIdx(i)
                            }
                          }}
                          className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isPlaying ? 'bg-[var(--theme-accent)] text-white' : 'bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]'} transition-colors`}>
                            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate">{track.title}</div>
                            {track.subtitle && <div className="text-[10px] text-gray-400 truncate">{track.subtitle}</div>}
                          </div>
                          <Music className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 6. Guarantee box */}
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center space-y-2">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="h-3 w-3" /> {checkoutExtraData.guarantee.badge}
                </div>
                <div className="text-sm font-bold text-green-900">{checkoutExtraData.guarantee.headline}</div>
                <p className="text-xs text-green-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: checkoutExtraData.guarantee.description }} />
              </div>

              {/* 7. Second CTA + What You'll Get checklist */}
              <div className="space-y-3">
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-[var(--theme-button)] text-sm font-bold text-white shadow-lg shadow-[var(--theme-accent-soft)] hover:bg-[var(--theme-button)] active:scale-95 transition-all"
                  onClick={(e) => { e.preventDefault(); const submitBtn = (e.target as HTMLElement).closest('form')?.querySelector<HTMLButtonElement>('button[type="submit"]'); submitBtn?.click(); }}
                  disabled={
                    loading ||
                    (!manualConfirmationEnabled && emailOtpEnabled && !emailVerified)
                  }
                >
                  {loading ? 'Memproses...' : (manualConfirmationEnabled ? configSteps.step4.manualCheckoutButtonText : `${configSteps.step4.checkoutButtonText}${funnelPriceVisibility.checkoutButton ? ` — ${fmtCurrency(discountedPaymentAmount)}` : ''}`)}
                </Button>
                <p className="text-center text-xs text-gray-400">{configSteps.step4.checkoutSubtext.replace('{recipient}', currentRecipient)}</p>

                <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 space-y-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{configSteps.step4.nextStepsTitle}</div>
                  <div className="space-y-1.5 text-xs text-gray-700">
                    {(manualConfirmationEnabled ? configSteps.step4.manualNextSteps : configSteps.step4.nextSteps).map((s, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--theme-accent-soft)] text-[9px] font-bold text-[var(--theme-accent)] mt-0.5">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                        <span className="leading-tight" dangerouslySetInnerHTML={{ __html: s.text.replace('{delivery}', `<span class="font-bold">${deliveryEta.sentenceLower}</span>`) }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 8. FAQ accordion */}
              {checkoutExtraData.faqItems.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pertanyaan Umum</div>
                  <div className="space-y-1.5">
                    {checkoutExtraData.faqItems.map((item, i) => (
                      <div key={i} className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => setFaqOpenIndex(faqOpenIndex === i ? null : i)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-xs font-semibold text-gray-800 pr-2">{item.q}</span>
                          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${faqOpenIndex === i ? 'rotate-180' : ''}`} />
                        </button>
                        {faqOpenIndex === i && (
                          <div className="px-3 pb-3 text-xs text-gray-600 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                            {item.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. Back button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1"
                >
                  <ChevronLeft className="h-3 w-3" /> Kembali ke langkah sebelumnya
                </button>
              </div>

            </div>
          )}

          {/* BOTTOM NAV / CTA — hidden on step 4 (inline CTAs used instead) */}
          <div className={`fixed inset-x-0 bottom-0 z-50 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]${step === 4 ? ' hidden' : ''}`}>
             <div className="mx-auto max-w-4xl flex flex-col gap-2">
               {step === 4 && (
                 <div className="text-center text-[10px] sm:text-xs text-gray-500 flex justify-center items-center gap-1 mb-1">
                   <Timer className="h-3 w-3" /> {configSteps.step4.draftTimerText.replace('{timer}', `${Math.floor(draftCountdown / 60)}:${String(draftCountdown % 60).padStart(2, '0')}`)}
                 </div>
               )}

               {/* Intentionally no global error banner here (avoid duplicate warnings). */}
               
               <div className="flex gap-3">
                 {step > 0 && (
                   <Button 
                     type="button" 
                     variant="outline" 
                     size="lg" 
                     className="shrink-0 h-12 sm:h-14 px-4 sm:px-8 rounded-xl border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                     onClick={handleBack}
                     disabled={loading}
                   >
                     <ChevronLeft className="h-5 w-5" />
                     <span className="hidden sm:inline ml-2 font-bold">Kembali</span>
                   </Button>
                 )}
                 
                 <Button 
                   type="submit" 
                   className="h-12 sm:h-14 w-full rounded-xl bg-[var(--theme-button)] text-base sm:text-lg font-bold text-white shadow-lg shadow-[var(--theme-accent-soft)] hover:bg-[var(--theme-button)] active:scale-95 transition-all"
                   onClick={step < 4 ? (e) => { e.preventDefault(); handleNext(); } : undefined}
                  disabled={
                    loading ||
                    (step === 4 && !manualConfirmationEnabled && emailOtpEnabled && !emailVerified) ||
                    false
                  }
                 >
                   {step === 0 && configSteps.step0.enabled ? 'Mulai Buat Lagu ->' : 
                    step === 1 ? 'Pilih vibenya ->' : 
                    step === 2 ? 'Tambahkan ceritamu ->' : 
                    step === 3 ? 'Hampir selesai! ->' : 
                    loading ? 'Memproses...' : (manualConfirmationEnabled ? configSteps.step4.manualCheckoutButtonText : emailOtpEnabled ? (emailVerified ? `${configSteps.step4.checkoutButtonText}${funnelPriceVisibility.checkoutButton ? ` — ${fmtCurrency(discountedPaymentAmount)}` : ''}` : 'Verifikasi email dulu') : `${configSteps.step4.checkoutButtonText}${funnelPriceVisibility.checkoutButton ? ` — ${fmtCurrency(discountedPaymentAmount)}` : ''}`)}
                 </Button>
               </div>
             </div>
          </div>
          {/* NOTE: Error banner is shown inside the fixed CTA area above. */}

        </form>
      </main>
    </div>
  )
}
