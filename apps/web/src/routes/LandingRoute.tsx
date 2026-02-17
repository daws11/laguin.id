import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Star,
  Play,
  Pause,
  Check,
  ShieldCheck,
  Zap,
  Music,
  SkipBack,
  SkipForward,
  Heart,
} from 'lucide-react'

import { apiGet, apiPost } from '@/lib/http'
import { useThemeSlug } from '@/features/theme/ThemeContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ActivityToast, type ActivityToastConfig } from '@/components/activity-toast/ActivityToast'
import { HeroPlayerInline } from './HeroPlayerInline.tsx'

function sanitizeHtml(html: string): string {
  return html.replace(/<\/?(?!strong|em|br\s*\/?)([a-z][a-z0-9]*)\b[^>]*>/gi, '')
}

// --- Components ---

type PublicSiteConfig = {
  landing?: {
    heroHeadline?: { line1?: string; line2?: string }
    heroSubtext?: string
    footerCta?: { headline?: string; subtitle?: string }
    heroMedia?: { imageUrl?: string; videoUrl?: string | null }
    heroOverlay?: {
      quote?: string
      authorName?: string
      authorLocation?: string
      authorAvatarUrl?: string | null
    }
    heroPlayer?: {
      enabled?: boolean
      playingBadgeText?: string
      cornerBadgeText?: string
      verifiedBadgeText?: string
      quote?: string
      authorName?: string
      authorSubline?: string
      authorAvatarUrl?: string | null
      audioUrl?: string | null
    }
    audioSamples?: {
      nowPlaying?: { name?: string; quote?: string; time?: string; metaText?: string | null; audioUrl?: string | null }
      playlist?: Array<{ title?: string; subtitle?: string; ctaLabel?: string; audioUrl?: string | null }>
    }
  }
  heroCheckmarks?: string[]
  trustBadges?: { badge1?: string; badge2?: string; badge3?: string }
  statsBar?: { items?: Array<{ val?: string; label?: string }> }
  promoBanner?: {
    enabled?: boolean
    countdownLabel?: string
    countdownTargetDate?: string
    promoBadgeText?: string
    quotaBadgeText?: string
  }
  reviews?: {
    sectionLabel?: string
    sectionHeadline?: string
    sectionSubtext?: string
    items?: Array<{
      style?: 'accent' | 'dark-chat' | 'white'
      quote?: string
      chatMessages?: string[]
      authorName?: string
      authorMeta?: string
      authorAvatarUrl?: string
    }>
  }
  activityToast?: ActivityToastConfig
  colors?: { accentColor?: string; bgColor1?: string; bgColor2?: string }
}

type PublicSettingsResponse = {
  publicSiteConfig: PublicSiteConfig | null
  instantEnabled?: boolean
  deliveryDelayHours?: number
  paymentAmount?: number
  originalAmount?: number
}

const defaultPublicSiteConfig: PublicSiteConfig = {
  landing: {
    heroHeadline: { line1: 'Valentine kali ini,', line2: 'buat dia menangis.' },
    heroSubtext: '',
    footerCta: {
      headline: 'Jangan biarkan Valentine berlalu',
      subtitle: 'Beri dia hadiah yang tak akan pernah dia lupakan. Gabung <strong>2,847 wanita</strong> yang membuat pasangannya menangis terharu.',
    },
    heroMedia: {
      imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=2940&auto=format&fit=crop',
      videoUrl: null,
    },
    heroOverlay: {
      quote: 'Dia menangis sebelum chorus berakhir',
      authorName: 'Rina',
      authorLocation: 'Jakarta',
      authorAvatarUrl: 'https://images.unsplash.com/photo-1530254541043-129f4c372200?w=200&h=200&fit=crop',
    },
    heroPlayer: {
      enabled: true,
      playingBadgeText: 'Playing',
      cornerBadgeText: "Valentine's Special",
      verifiedBadgeText: 'Verified Purchase',
      quote: 'He tried not to cry. He failed.',
      authorName: 'Rachel',
      authorSubline: "London • Valentine's 2025",
      authorAvatarUrl: 'https://images.unsplash.com/photo-1530254541043-129f4c372200?w=200&h=200&fit=crop',
      audioUrl: null,
    },
    audioSamples: {
      nowPlaying: {
        name: 'Untuk Budi, Sepanjang Masa',
        quote: 'Setiap momen bersamamu Budi, dari kencan pertama yang gugup itu...',
        time: '3:24',
        metaText: 'London • Verified',
        audioUrl: null,
      },
      playlist: [
        { title: 'Untuk Rizky, Segalanya Bagiku', subtitle: 'Country • 3:12', ctaLabel: 'PUTAR' },
        { title: 'Untuk Dimas, 10 Tahun Bersama', subtitle: 'Acoustic • 2:58', ctaLabel: 'PUTAR' },
        { title: 'Untuk Andi, Petualangan Kita', subtitle: 'Pop Ballad • 3:45', ctaLabel: 'PUTAR' },
      ],
    },
  },
  activityToast: {
    enabled: true,
    intervalMs: 10000,
    durationMs: 4500,
    items: [
      { fullName: 'Abdurrahman Firdaus', city: 'Bandung', recipientName: 'Salsa' },
      { fullName: 'Nabila Putri', city: 'Jakarta', recipientName: 'Rizky' },
      { fullName: 'Andreas Wijaya', city: 'Surabaya', recipientName: 'Dima' },
    ],
  },
}

function fmtCurrencyGlobal(amt: number | null | undefined) {
  if (amt === 0) return 'GRATIS'
  if (amt === null || amt === undefined) return 'Rp 497rb'
  if (amt >= 100000 && amt < 1000000) {
    return `Rp ${Math.floor(amt / 1000)}rb`
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amt)
}

function CountdownTimer({ paymentAmount, originalAmount, countdownLabel, countdownTargetDate }: { paymentAmount: number | null; originalAmount: number | null; countdownLabel: string; countdownTargetDate: string }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    let targetDate: Date
    if (countdownTargetDate && /^\d{4}-\d{2}-\d{2}/.test(countdownTargetDate)) {
      targetDate = new Date(`${countdownTargetDate}T00:00:00`)
    } else {
      const now = new Date()
      let targetYear = now.getFullYear()
      if (now.getMonth() > 1 || (now.getMonth() === 1 && now.getDate() > 14)) {
        targetYear++
      }
      targetDate = new Date(`${targetYear}-02-14T00:00:00`)
    }

    const updateTimer = () => {
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()

      if (diff <= 0) {
        setTime({ d: 0, h: 0, m: 0, s: 0 })
        return
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24))
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)

      setTime({ d, h, m, s })
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [countdownTargetDate])

  return (
    <div className="bg-[var(--theme-accent)] px-3 py-1.5 text-center text-[9px] sm:text-xs font-bold text-white uppercase tracking-tight leading-none">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span>{countdownLabel} {time.d}h {time.h}j {time.m}m {time.s}d lagi</span>
        <span className="opacity-50 text-[8px]">•</span>
        <span className="flex items-center gap-1">
          <span className="line-through opacity-70">{fmtCurrencyGlobal(originalAmount)}</span>
          <span>{fmtCurrencyGlobal(paymentAmount)} {paymentAmount === 0 ? '(100 pertama)' : ''}</span>
        </span>
      </div>
    </div>
  )
}

/** Extract name from title like "Untuk Budi, Sepanjang Masa" -> "Budi" for highlighting */
function parseHighlightName(title: string): { before: string; name: string; after: string } | null {
  const m = title.match(/^(Untuk|For|To)\s+(\w+)(.*)$/)
  if (!m) return null
  const prefix = m[1] + ' '
  const name = m[2]
  const after = m[3] || ''
  return { before: prefix, name, after }
}

function HighlightedTitle({ title }: { title: string }) {
  const parsed = parseHighlightName(title)
  if (!parsed) return <span>{title}</span>
  return (
    <>
      {parsed.before}
      <span className="text-[var(--theme-accent)]">{parsed.name}</span>
      {parsed.after}
    </>
  )
}

const LANDING_AUDIO_EVENT = 'landing-audio-playing'
const SOURCE_HERO = 'hero'
const SOURCE_SAMPLES = 'samples'

type TrackItem = {
  title: string
  subtitle: string
  quote: string
  time: string
  audioUrl: string | null
}

function FeaturedAudioPlayer({
  track,
  allTracks,
  selectedIndex,
  onSelectTrack,
  verifiedBadgeText = 'Verified',
  autoPlay,
  onAutoPlayDone,
}: {
  track: TrackItem
  allTracks: TrackItem[]
  selectedIndex: number
  onSelectTrack: (index: number) => void
  verifiedBadgeText?: string
  autoPlay?: boolean
  onAutoPlayDone?: () => void
}) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [posSec, setPosSec] = useState(0)
  const [durSec, setDurSec] = useState<number | null>(null)
  const currentIndex = selectedIndex ?? 0

  useEffect(() => {
    setPlaying(false)
    setPosSec(0)
    setDurSec(null)
  }, [selectedIndex])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [track.audioUrl])

  const progressPct = useMemo(() => {
    const dur = durSec && durSec > 0 ? durSec : null
    if (!dur) return 0
    return Math.min(100, Math.max(0, (posSec / dur) * 100))
  }, [durSec, posSec])

  function fmt(sec: number) {
    const s = Math.max(0, Math.floor(sec))
    const mm = String(Math.floor(s / 60)).padStart(1, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }

  const hasAudio = Boolean(track.audioUrl)

  useEffect(() => {
    if (autoPlay && hasAudio && audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
      onAutoPlayDone?.()
    }
  }, [autoPlay, hasAudio, onAutoPlayDone])

  // Pause when hero player starts (only one audio at a time)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ source: string }>).detail
      if (detail?.source === SOURCE_HERO) {
        const a = audioRef.current
        if (a) a.pause()
        setPlaying(false)
      }
    }
    window.addEventListener(LANDING_AUDIO_EVENT, handler)
    return () => window.removeEventListener(LANDING_AUDIO_EVENT, handler)
  }, [])

  const dispatchPlaying = () => {
    window.dispatchEvent(new CustomEvent(LANDING_AUDIO_EVENT, { detail: { source: SOURCE_SAMPLES } }))
  }

  const handlePlayPause = () => {
    if (!hasAudio) return
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  const handlePrev = () => {
    const prev = currentIndex - 1
    if (prev >= 0) onSelectTrack(prev)
  }

  const handleNext = () => {
    const next = currentIndex + 1
    if (next < allTracks.length) onSelectTrack(next)
  }

  return (
    <div className="space-y-5">
      {/* Song info header */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-accent)] text-[var(--theme-accent-soft)]">
          <Heart className="h-6 w-6" fill="currentColor" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-lg">
            <HighlightedTitle title={track.title} />
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{track.subtitle}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              <Check className="h-3 w-3" />
              {verifiedBadgeText}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-[var(--theme-accent)] transition-all duration-150"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{fmt(posSec)}</span>
          <span>{durSec ? fmt(durSec) : track.time}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          className="p-2 rounded-full text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous"
        >
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={!hasAudio}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform',
            hasAudio ? 'bg-[var(--theme-accent)] hover:opacity-90 active:scale-95' : 'bg-gray-300 cursor-not-allowed'
          )}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="h-6 w-6 ml-0.5" fill="currentColor" /> : <Play className="h-6 w-6 ml-1" fill="currentColor" />}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex >= allTracks.length - 1}
          className="p-2 rounded-full text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next"
        >
          <SkipForward className="h-5 w-5" />
        </button>
      </div>

      {!hasAudio && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Upload lagu di Admin agar bisa diputar.
        </div>
      )}

      {track.audioUrl && (
        <audio
          ref={(el) => { audioRef.current = el }}
          src={track.audioUrl}
          preload="metadata"
          onTimeUpdate={(e) => setPosSec(e.currentTarget.currentTime || 0)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration
            setDurSec(Number.isFinite(d) && d > 0 ? d : null)
          }}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => { dispatchPlaying(); setPlaying(true) }}
          className="hidden"
        />
      )}
    </div>
  )
}

// --- Main Page ---

type FaqItem = { q: string; a: string }

export function LandingRoute() {
  const themeSlug = useThemeSlug()
  const [publicSiteConfig, setPublicSiteConfig] = useState<PublicSiteConfig | null | undefined>(undefined)
  const [heroOpen, setHeroOpen] = useState(false)
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0)
  const [autoPlayOnSelect, setAutoPlayOnSelect] = useState(false)
  const [showMobileCta, setShowMobileCta] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const [instantEnabled, setInstantEnabled] = useState<boolean | null>(null)
  const [deliveryDelayHours, setDeliveryDelayHours] = useState<number | null>(null)
  const [activeThemes, setActiveThemes] = useState<Array<{ slug: string; name: string }>>([])

  useEffect(() => {
    try {
      let sid = sessionStorage.getItem('_sid')
      if (!sid) {
        sid = crypto.randomUUID()
        sessionStorage.setItem('_sid', sid)
      }
      apiPost('/api/public/track', { path: themeSlug ? `/${themeSlug}` : '/', sessionId: sid, themeSlug: themeSlug ?? null }).catch(() => {})
    } catch {}
  }, [])

  const [paymentAmount, setPaymentAmount] = useState<number | null>(null)
  const [originalAmount, setOriginalAmount] = useState<number | null>(null)

  const fmtCurrency = fmtCurrencyGlobal

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

  const faqItems = useMemo<FaqItem[]>(() => {
    const etaAnswerStart = instantEnabled ? '10–30 menit' : deliveryEta.label
    const etaAnswer = `${etaAnswerStart}! Kamu akan dapat notifikasi email saat sudah siap.`
    return [
      {
        q: "Dia bukan tipe yang emosional...",
        a: "Itu yang MEREKA SEMUA katakan! 98% menangis — mantan militer, ayah yang kaku, pacar 'aku gak main perasaan'. Semakin tangguh mereka, semakin dalam jatuhnya. 😉",
      },
      {
        q: "Bagaimana dia menerima lagunya?",
        a: 'Kamu menerima link download via email. Putar untuknya secara langsung, kirim via WhatsApp, atau jadikan kejutan! Ini file MP3 yang bisa diputar di mana saja.',
      },
      { q: 'Berapa lama prosesnya?', a: etaAnswer },
      { q: 'Kalau aku gak suka gimana?', a: 'Revisi gratis tanpa batas sampai kamu suka. Masih gak puas? Refund penuh, tanpa tanya-tanya. 💕' },
      { q: 'Benarkah GRATIS?', a: `Ya! Spesial untuk 100 orang pertama (normalnya ${fmtCurrency(originalAmount)}). Tanpa biaya tersembunyi. Satu kesempatan, hadiah tak terlupakan.` },
    ]
  }, [deliveryEta.label, instantEnabled])

  useEffect(() => {
    const handleScroll = () => {
      // Use a fixed threshold to ensure it shows reliably
      // Hero section is usually > 500px, so 400px is a safe "scrolled past" point
      setShowMobileCta(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial state

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // JSON-LD structured data for SEO (Organization, Service, FAQ)
  useEffect(() => {
    const organization = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://laguin.id/#organization',
      name: 'Laguin.id',
      url: 'https://laguin.id',
      description: 'Lagu Valentine personal dengan namanya di lirik. Buat dia menangis bahagia.',
      foundingDate: '2024',
      sameAs: [],
    }
    const service = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Lagu Valentine Personal',
      description: `Lagu personal dengan namanya di lirik. Cerita & kenangan kalian ditenun jadi musik profesional. Kualitas studio, dikirim ${deliveryEta.sentenceLower}.`,
      provider: { '@id': 'https://laguin.id/#organization' },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'IDR',
        availability: 'https://schema.org/InStock',
      },
    }
    const faqPage = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a.replace(/😉|💕/g, '') },
      })),
    }
    const scriptOrg = document.createElement('script')
    scriptOrg.type = 'application/ld+json'
    scriptOrg.textContent = JSON.stringify(organization)
    scriptOrg.id = 'ld-organization'
    const scriptSvc = document.createElement('script')
    scriptSvc.type = 'application/ld+json'
    scriptSvc.textContent = JSON.stringify(service)
    scriptSvc.id = 'ld-service'
    const scriptFaq = document.createElement('script')
    scriptFaq.type = 'application/ld+json'
    scriptFaq.textContent = JSON.stringify(faqPage)
    scriptFaq.id = 'ld-faq'
    document.head.appendChild(scriptOrg)
    document.head.appendChild(scriptSvc)
    document.head.appendChild(scriptFaq)
    return () => {
      document.getElementById('ld-organization')?.remove()
      document.getElementById('ld-service')?.remove()
      document.getElementById('ld-faq')?.remove()
    }
  }, [deliveryEta.sentenceLower, faqItems])

  useEffect(() => {
    let cancelled = false
    const themeParam = themeSlug ? `?theme=${encodeURIComponent(themeSlug)}` : ''
    apiGet<PublicSettingsResponse>(`/api/public/settings${themeParam}`)
      .then((res) => {
        if (cancelled) return
        const cfg = res?.publicSiteConfig
        if (cfg && typeof cfg === 'object') setPublicSiteConfig(cfg)
        else setPublicSiteConfig(null)
        setInstantEnabled(typeof res?.instantEnabled === 'boolean' ? res.instantEnabled : null)
        setDeliveryDelayHours(typeof res?.deliveryDelayHours === 'number' ? res.deliveryDelayHours : null)
        setPaymentAmount(typeof res?.paymentAmount === 'number' ? res.paymentAmount : null)
        setOriginalAmount(typeof res?.originalAmount === 'number' ? res.originalAmount : null)
      })
      .catch(() => {
        if (!cancelled) setPublicSiteConfig(null)
      })

    apiGet<{ themes: Array<{ slug: string; name: string }> }>('/api/public/themes')
      .then((res) => {
        if (cancelled) return
        setActiveThemes(res?.themes ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''
  const resolveAsset = (v: string) => {
    const s = (v ?? '').trim()
    if (!s) return ''
    if (/^https?:\/\//i.test(s)) return s
    return apiBase + s
  }

  if (publicSiteConfig === undefined) {
    return <div className="min-h-screen" />
  }

  const site = (publicSiteConfig ?? defaultPublicSiteConfig) as PublicSiteConfig

  const themeColors = (publicSiteConfig as any)?.colors
  const themeStyle = {
    '--theme-accent': themeColors?.accentColor || '#E11D48',
    '--theme-accent-soft': themeColors?.bgColor1 || '#FFF5F7',
    '--theme-bg': themeColors?.bgColor2 || '#FFFFFF',
  } as React.CSSProperties

  const logoUrl = typeof (publicSiteConfig as any)?.logoUrl === 'string' && (publicSiteConfig as any).logoUrl.trim()
    ? resolveAsset((publicSiteConfig as any).logoUrl)
    : '/logo.png'

  const landing = site.landing ?? defaultPublicSiteConfig.landing!
  const heroMedia = landing.heroMedia ?? defaultPublicSiteConfig.landing!.heroMedia!
  const heroOverlay = landing.heroOverlay ?? defaultPublicSiteConfig.landing!.heroOverlay!
  const audioSamples = landing.audioSamples ?? defaultPublicSiteConfig.landing!.audioSamples!
  const heroPlayer = landing.heroPlayer ?? defaultPublicSiteConfig.landing!.heroPlayer!

  const heroCheckmarks = (site.heroCheckmarks && site.heroCheckmarks.length > 0)
    ? site.heroCheckmarks.filter(x => x && x.trim())
    : ['Kualitas Studio', '98% Menangis', 'Revisi Gratis']
  const trustBadge1 = site.trustBadges?.badge1 || deliveryEta.short + ' Delivery'
  const trustBadge2 = site.trustBadges?.badge2 || 'Secure'
  const trustBadge3 = site.trustBadges?.badge3 || '11 kuota sisa'
  const statsItems = (site.statsBar?.items && site.statsBar.items.length > 0)
    ? site.statsBar.items.map(s => ({ val: s.val || '', label: s.label || '' }))
    : [
        { val: '99%', label: 'Menangis' },
        { val: deliveryEta.short, label: 'Pengiriman' },
        { val: '2,847', label: 'Lagu Terkirim' },
      ]
  const promoBanner = site.promoBanner ?? {}
  const promoBannerEnabled = promoBanner.enabled !== false
  const promoCountdownLabel = promoBanner.countdownLabel || "💝 Valentine's dalam"
  const promoCountdownTargetDate = promoBanner.countdownTargetDate || '2027-02-14'
  const promoPromoBadgeText = promoBanner.promoBadgeText || '💝 Spesial Valentine'
  const promoQuotaBadgeText = promoBanner.quotaBadgeText || '11 kuota!'
  const reviewsSection = site.reviews ?? {}
  const reviewSectionLabel = reviewsSection.sectionLabel || 'Reaksi Nyata'
  const reviewSectionHeadline = reviewsSection.sectionHeadline || '"Dia <span class="text-[var(--theme-accent)] italic">tidak pernah</span> menangis"'
  const reviewSectionSubtext = reviewsSection.sectionSubtext || '...mereka semua bilang begitu. 98% salah.'
  const reviewItems = (reviewsSection.items && reviewsSection.items.length > 0)
    ? reviewsSection.items
    : [
        {
          style: 'accent' as const,
          quote: 'Suami saya itu mantan TNI, orangnya keras. 12 tahun nikah, <strong class="bg-white/20 px-1 rounded">GAK PERNAH nangis.</strong> Eh, pas denger lagu ini, dia langsung mewek bahkan sebelum masuk reff.',
          authorName: 'Rina',
          authorMeta: 'Jakarta • Feb 2025',
          authorAvatarUrl: 'https://images.unsplash.com/photo-1562904403-a5106bef8319?w=100&h=100&fit=crop',
        },
        {
          style: 'dark-chat' as const,
          chatMessages: ['Ka, lagunya baru masuk 😭😭😭', 'Sumpah ini aku gemeteran!!', 'Dia bakal MELELEH besok 🥺'],
          authorName: 'Sinta',
          authorMeta: 'WhatsApp • Kemarin',
          authorAvatarUrl: 'https://images.unsplash.com/photo-1630758664435-72a78888fb9d?w=100&h=100&fit=crop',
        },
        {
          style: 'white' as const,
          quote: 'Doi terpaksa <strong class="text-[var(--theme-accent)]">minggirin mobil</strong> — katanya burem kena air mata. 15 tahun nikah, akhirnya bisa bikin doi nangis juga 😂',
          authorName: 'Ema',
          authorMeta: 'Surabaya • Jan 2025',
          authorAvatarUrl: 'https://images.unsplash.com/photo-1613447895590-97f008b7fff3?w=100&h=100&fit=crop',
        },
      ]

  const heroHeadlineLine1 =
    typeof landing.heroHeadline?.line1 === 'string' && landing.heroHeadline.line1.trim()
      ? landing.heroHeadline.line1
      : defaultPublicSiteConfig.landing!.heroHeadline!.line1!
  const heroHeadlineLine2 =
    typeof landing.heroHeadline?.line2 === 'string' && landing.heroHeadline.line2.trim()
      ? landing.heroHeadline.line2
      : defaultPublicSiteConfig.landing!.heroHeadline!.line2!
  const heroSubtext =
    typeof landing.heroSubtext === 'string' && landing.heroSubtext.trim()
      ? landing.heroSubtext
      : `Lagu personal dengan <strong>namanya</strong> di lirik. Dikirim ${deliveryEta.sentenceLower}.`
  const footerCtaHeadline =
    typeof landing.footerCta?.headline === 'string' && landing.footerCta.headline.trim()
      ? landing.footerCta.headline
      : defaultPublicSiteConfig.landing!.footerCta!.headline!
  const footerCtaSubtitle =
    typeof landing.footerCta?.subtitle === 'string' && landing.footerCta.subtitle.trim()
      ? landing.footerCta.subtitle
      : defaultPublicSiteConfig.landing!.footerCta!.subtitle!

  const heroImageUrl =
    typeof heroMedia.imageUrl === 'string' && heroMedia.imageUrl.trim()
      ? resolveAsset(heroMedia.imageUrl)
      : defaultPublicSiteConfig.landing!.heroMedia!.imageUrl!
  const heroVideoUrl =
    typeof heroMedia.videoUrl === 'string' && heroMedia.videoUrl.trim() ? resolveAsset(heroMedia.videoUrl) : null

  const overlayQuote =
    typeof heroOverlay.quote === 'string' && heroOverlay.quote.trim()
      ? heroOverlay.quote
      : defaultPublicSiteConfig.landing!.heroOverlay!.quote!
  const authorName =
    typeof heroOverlay.authorName === 'string' && heroOverlay.authorName.trim()
      ? heroOverlay.authorName
      : defaultPublicSiteConfig.landing!.heroOverlay!.authorName!
  const authorLocation =
    typeof heroOverlay.authorLocation === 'string' && heroOverlay.authorLocation.trim()
      ? heroOverlay.authorLocation
      : defaultPublicSiteConfig.landing!.heroOverlay!.authorLocation!
  const authorAvatarUrl =
    typeof heroOverlay.authorAvatarUrl === 'string' && heroOverlay.authorAvatarUrl.trim()
      ? resolveAsset(heroOverlay.authorAvatarUrl)
      : null

  const nowPlaying = audioSamples.nowPlaying ?? defaultPublicSiteConfig.landing!.audioSamples!.nowPlaying!
  const nowPlayingName =
    typeof nowPlaying.name === 'string' && nowPlaying.name.trim()
      ? nowPlaying.name
      : defaultPublicSiteConfig.landing!.audioSamples!.nowPlaying!.name!
  const nowPlayingQuote =
    typeof nowPlaying.quote === 'string' && nowPlaying.quote.trim()
      ? nowPlaying.quote
      : defaultPublicSiteConfig.landing!.audioSamples!.nowPlaying!.quote!
  const nowPlayingTime =
    typeof nowPlaying.time === 'string' && nowPlaying.time.trim()
      ? nowPlaying.time
      : defaultPublicSiteConfig.landing!.audioSamples!.nowPlaying!.time!
  const nowPlayingMetaTextRaw = (nowPlaying as any).metaText
  const nowPlayingMetaText =
    typeof nowPlayingMetaTextRaw === 'string'
      ? nowPlayingMetaTextRaw.trim() || null
      : (defaultPublicSiteConfig.landing!.audioSamples!.nowPlaying! as any).metaText ?? null
  const nowPlayingAudioUrlRaw = (nowPlaying as any).audioUrl
  const nowPlayingAudioUrl =
    typeof nowPlayingAudioUrlRaw === 'string' && nowPlayingAudioUrlRaw.trim() ? resolveAsset(nowPlayingAudioUrlRaw) : null

  const heroPlayerEnabled = Boolean((heroPlayer as any)?.enabled)
  const heroPlayerAudioUrlRaw = (heroPlayer as any)?.audioUrl
  const heroPlayerAudioUrl =
    typeof heroPlayerAudioUrlRaw === 'string' && heroPlayerAudioUrlRaw.trim()
      ? resolveAsset(heroPlayerAudioUrlRaw)
      : nowPlayingAudioUrl
  const heroPlayerQuote =
    typeof (heroPlayer as any)?.quote === 'string' && String((heroPlayer as any).quote).trim()
      ? String((heroPlayer as any).quote).trim()
      : overlayQuote
  const heroPlayerAuthorName =
    typeof (heroPlayer as any)?.authorName === 'string' && String((heroPlayer as any).authorName).trim()
      ? String((heroPlayer as any).authorName).trim()
      : authorName
  const heroPlayerAuthorSubline =
    typeof (heroPlayer as any)?.authorSubline === 'string' ? String((heroPlayer as any).authorSubline).trim() : ''
  const heroPlayerAvatarRaw = (heroPlayer as any)?.authorAvatarUrl
  const heroPlayerAvatarUrl =
    typeof heroPlayerAvatarRaw === 'string' && heroPlayerAvatarRaw.trim() ? resolveAsset(heroPlayerAvatarRaw) : authorAvatarUrl
  const heroPlayingBadgeText =
    typeof (heroPlayer as any)?.playingBadgeText === 'string' && String((heroPlayer as any).playingBadgeText).trim()
      ? String((heroPlayer as any).playingBadgeText).trim()
      : 'Playing'
  const heroCornerBadgeText =
    typeof (heroPlayer as any)?.cornerBadgeText === 'string' && String((heroPlayer as any).cornerBadgeText).trim()
      ? String((heroPlayer as any).cornerBadgeText).trim()
      : "Valentine's Special"
  const heroVerifiedBadgeText =
    typeof (heroPlayer as any)?.verifiedBadgeText === 'string' && String((heroPlayer as any).verifiedBadgeText).trim()
      ? String((heroPlayer as any).verifiedBadgeText).trim()
      : 'Verified Purchase'

  const playlist =
    Array.isArray(audioSamples.playlist) && audioSamples.playlist.length > 0
      ? audioSamples.playlist
      : defaultPublicSiteConfig.landing!.audioSamples!.playlist!

  const allTracks: TrackItem[] = [
    {
      title: nowPlayingName,
      subtitle: nowPlayingMetaText ?? '',
      quote: nowPlayingQuote,
      time: nowPlayingTime,
      audioUrl: nowPlayingAudioUrl,
    },
    ...playlist.map((p: any) => {
      const sub = typeof p.subtitle === 'string' ? p.subtitle : ''
      const timeMatch = sub.match(/(\d+:\d{2})$/)
      return {
        title: p.title ?? '',
        subtitle: sub,
        quote: '',
        time: timeMatch ? timeMatch[1] : '--:--',
        audioUrl: typeof p.audioUrl === 'string' && p.audioUrl.trim() ? resolveAsset(p.audioUrl.trim()) : null,
      }
    }),
  ]

  const currentTrack = allTracks[selectedTrackIndex] ?? allTracks[0]

  const toastConfig = (site.activityToast && typeof site.activityToast === 'object'
    ? site.activityToast
    : defaultPublicSiteConfig.activityToast) as ActivityToastConfig

  return (
    <div className="min-h-screen bg-[var(--theme-accent-soft)] font-sans pb-32 overflow-x-hidden" style={themeStyle}>
      <ActivityToast config={toastConfig} />

      {/* Sticky Top Banner */}
      <div className="sticky top-0 z-50">
        {promoBannerEnabled && (
          <CountdownTimer paymentAmount={paymentAmount} originalAmount={originalAmount} countdownLabel={promoCountdownLabel} countdownTargetDate={promoCountdownTargetDate} />
        )}
        <div className="border-b border-[var(--theme-accent-soft)] bg-white/95 px-2 sm:px-4 py-2 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-3">
            <Link to={themeSlug ? `/${themeSlug}` : '/'} className="flex items-center gap-2">
              <img src={logoUrl} alt="Laguin.id - Lagumu, Ceritamu" className="h-8 w-auto object-contain" />
            </Link>
            <div className="text-right flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-3">
              {promoPromoBadgeText && (
                <div className="hidden md:block text-[10px] font-medium text-[var(--theme-accent)] bg-[var(--theme-accent-soft)] px-2 py-0.5 rounded-full">
                  {promoPromoBadgeText}
                </div>
              )}
              <div className="leading-tight flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 line-through">{fmtCurrency(originalAmount)}</span>
                <span className="text-sm sm:text-lg font-bold text-[var(--theme-accent)]">{fmtCurrency(paymentAmount)}</span>
                {promoQuotaBadgeText && (
                  <Badge variant="destructive" className="h-4 px-1 py-0 text-[9px]">
                    {promoQuotaBadgeText}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl w-full px-2 sm:px-4 md:px-6 pt-2 sm:pt-12 space-y-8 sm:space-y-20">
        {/* HERO SECTION */}
        <section ref={heroRef} aria-labelledby="hero-title" className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 md:gap-12 items-center">
          {/* TOP CONTENT (Left on Desktop) */}
          <div className="text-center md:text-left space-y-3 md:space-y-6 md:col-start-1 md:row-start-1">
            {/* Social proof - More compact for fold visibility */}
            <div className="flex flex-row items-center justify-center md:justify-start gap-2">
              <div className="flex text-amber-400 gap-0.5 scale-90 origin-left">
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
              </div>
              <span className="text-xs font-medium text-gray-500">2,847 menangis bahagia</span>
            </div>

            {/* Main headline - Reduced size on mobile */}
            <h1 id="hero-title" className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              <span className="text-gray-900">{heroHeadlineLine1}</span>
              <br className="hidden sm:inline" /> <span className="text-[var(--theme-accent)]">{heroHeadlineLine2}</span>
            </h1>

            {/* Body paragraph - Compact */}
            <p className="text-sm sm:text-lg text-gray-600 leading-normal max-w-lg mx-auto md:mx-0" dangerouslySetInnerHTML={{ __html: sanitizeHtml(heroSubtext) }} />
          </div>

          {/* MEDIA CONTENT (Middle on Mobile, Right on Desktop) */}
          <div className="relative mx-auto w-full max-w-full sm:max-w-md md:max-w-full min-w-0 md:col-start-2 md:row-start-1 md:row-span-2">
             <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl">
               {/* Placeholder for Video/Image from screenshot */}
               <div className="absolute inset-0 bg-gray-900/10 z-10"></div>
               {heroVideoUrl ? (
                 <video
                   className="h-full w-full object-cover"
                   src={heroVideoUrl}
                   autoPlay
                   muted
                   loop
                   playsInline
                 />
               ) : (
                 <img
                   src={heroImageUrl}
                   alt="Pasangan merayakan Valentine - Lagu personal Laguin.id dengan nama di lirik, hadiah yang tak terlupakan"
                   className="h-full w-full object-cover"
                   loading="eager"
                 />
               )}
               {heroOpen && heroPlayerEnabled ? (
                 <div className="absolute inset-0 z-20">
                   <HeroPlayerInline
                     onClose={() => setHeroOpen(false)}
                     videoUrl={heroVideoUrl}
                     imageUrl={heroImageUrl}
                     audioUrl={heroPlayerAudioUrl}
                     playingBadgeText={heroPlayingBadgeText}
                     cornerBadgeText={heroCornerBadgeText}
                     verifiedBadgeText={heroVerifiedBadgeText}
                     quote={heroPlayerQuote}
                     authorName={heroPlayerAuthorName}
                     authorSubline={heroPlayerAuthorSubline}
                     authorAvatarUrl={heroPlayerAvatarUrl}
                   />
                 </div>
               ) : (
                 <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white p-6 text-center">
                   <button
                     type="button"
                     onClick={() => {
                       if (!heroPlayerEnabled) return
                       setHeroOpen(true)
                     }}
                     className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 hover:scale-110 transition-transform"
                     aria-label="Play hero song"
                   >
                     <div className="h-12 w-12 rounded-full bg-[var(--theme-accent)] flex items-center justify-center pl-1 shadow-lg">
                       <Play className="h-6 w-6 text-white" fill="currentColor" />
                     </div>
                   </button>
                   <div className="font-serif italic text-lg sm:text-2xl md:text-3xl leading-snug">"{overlayQuote}"</div>
                   <div className="mt-2 text-xs sm:text-sm font-medium opacity-90 flex items-center gap-2">
                     {authorAvatarUrl ? (
                       <img src={authorAvatarUrl} className="w-6 h-6 rounded-full border border-white" />
                     ) : (
                       <div className="w-6 h-6 rounded-full border border-white bg-white/20" />
                     )}
                     {authorLocation ? `${authorName}, ${authorLocation}` : authorName}
                     <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
                       <Check className="w-3 h-3" /> Verified
                     </span>
                   </div>
                 </div>
               )}
             </div>
          </div>

          {/* BOTTOM CONTENT (Left Bottom on Desktop) */}
          <div className="text-center md:text-left space-y-4 md:space-y-6 md:col-start-1 md:row-start-2">
            {/* Trust Badges - Hidden or very small on ultra-mobile if needed, but let's just make it tighter */}
            <div className="flex flex-wrap justify-center md:justify-start gap-x-3 gap-y-1 text-[10px] sm:text-sm font-medium text-gray-500">
              {heroCheckmarks.map((text, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-600" />
                  {text}
                </span>
              ))}
            </div>

            {/* CTA Button - Pulled up */}
            <div className="space-y-2">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-8 rounded-full bg-[var(--theme-accent)] text-base sm:text-lg font-bold shadow-lg shadow-[var(--theme-accent-soft)] hover:opacity-90 hover:scale-105 transition-all duration-300">
                <Link to={themeSlug ? `/${themeSlug}/config` : '/config'} className="flex items-center justify-center gap-2">
                  Buat Lagu — {fmtCurrency(paymentAmount)}
                  <span className="text-[var(--theme-accent-soft)] line-through font-normal text-sm sm:text-base ml-1">{fmtCurrency(originalAmount)}</span>
                </Link>
              </Button>
              
              {/* Footer Trust Info - Compact */}
              <div className="flex items-center justify-center md:justify-start gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-tighter sm:tracking-wider sm:text-xs">
                <span className="flex items-center gap-0.5"><Zap className="h-2.5 w-2.5 text-amber-500" /> {trustBadge1}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5"><ShieldCheck className="h-2.5 w-2.5 text-green-500" /> {trustBadge2}</span>
                <span>•</span>
                <span className="text-[var(--theme-accent)]">{trustBadge3}</span>
              </div>
            </div>
          </div>
        </section>

        {/* AUDIO SAMPLES SECTION */}
        <section aria-labelledby="audio-samples-title" className="space-y-8 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-accent-soft)] bg-[var(--theme-accent-soft)] px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-[var(--theme-accent)]">
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              Tekan Putar
            </div>
            <h2 id="audio-samples-title" className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">
              Dengar <span className="text-[var(--theme-accent)] italic">namanya</span> di lagu asli
            </h2>
            <p className="text-gray-500">Lagu asli yang kami buat. Nama asli. Air mata asli.</p>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-10 shadow-xl border border-[var(--theme-accent-soft)]">
            <FeaturedAudioPlayer
              track={currentTrack}
              allTracks={allTracks}
              selectedIndex={selectedTrackIndex}
              onSelectTrack={(i) => {
                setSelectedTrackIndex(i)
                const t = allTracks[i]
                if (t?.audioUrl) setAutoPlayOnSelect(true)
              }}
              verifiedBadgeText={heroVerifiedBadgeText}
              autoPlay={autoPlayOnSelect}
              onAutoPlayDone={() => setAutoPlayOnSelect(false)}
            />

            {/* More Examples */}
            <div className="mt-10 pt-8 border-t border-gray-100">
              <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider mb-6">
                Contoh Lainnya
              </p>
              <div className="space-y-0 divide-y divide-gray-100">
                {allTracks.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedTrackIndex(i)
                      if (t.audioUrl) setAutoPlayOnSelect(true)
                    }}
                    className={cn(
                      'flex w-full items-center gap-4 px-2 py-4 rounded-lg transition-colors text-left',
                      selectedTrackIndex === i ? 'bg-[var(--theme-accent-soft)]' : 'hover:bg-gray-50',
                      t.audioUrl ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]">
                      <Music className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900">
                        <HighlightedTitle title={t.title} />
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.subtitle}</div>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">{t.time}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 text-center space-y-4">
              <p className="text-gray-600">
                Bayangkan mendengar <span className="text-[var(--theme-accent)] font-medium italic">namanya</span> di lagu seperti ini...
              </p>
              <Button asChild size="lg" className="h-12 px-8 rounded-xl bg-[var(--theme-accent)] font-bold shadow-lg shadow-[var(--theme-accent-soft)] hover:opacity-90">
                <Link to={themeSlug ? `/${themeSlug}/config` : '/config'} className="flex items-center gap-2">
                  <span>Buat Lagunya — {fmtCurrency(paymentAmount)}</span>
                  <span className="text-xs font-normal line-through opacity-70 decoration-white/50">{fmtCurrency(originalAmount)}</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className="py-8 border-y border-[var(--theme-accent-soft)] bg-white/50 backdrop-blur-sm -mx-2 px-2 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
          <div className="flex flex-wrap justify-center gap-8 md:gap-24 text-center">
             {statsItems.map((stat, idx) => (
               <div key={idx}>
                 <div className="text-3xl md:text-4xl font-bold text-[var(--theme-accent)] font-serif">{stat.val}</div>
                 <div className="text-xs uppercase font-bold text-gray-400 tracking-wider">{stat.label}</div>
               </div>
             ))}
          </div>
        </section>

        {/* COMPARISON SECTION */}
        <section aria-labelledby="comparison-title" className="space-y-10 text-center max-w-5xl mx-auto">
          <div className="space-y-2">
            <h2 id="comparison-title" className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">
              Kado yang akan dia <span className="text-gray-400 line-through decoration-[var(--theme-accent)]">lupakan</span> vs. yang akan dia <span className="text-[var(--theme-accent)] italic">putar ulang</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
             {/* Left Column */}
             <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col justify-center">
               <div className="grid grid-cols-2 gap-8 opacity-60 grayscale-[50%]">
                   <div className="flex flex-col items-center gap-2">
                     <span className="text-4xl mb-2">🧴</span> 
                     <span className="font-medium text-gray-900">Parfum</span>
                     <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">Rp 1jt+</span>
                   </div>
                   <div className="flex flex-col items-center gap-2">
                     <span className="text-4xl mb-2">⌚</span> 
                     <span className="font-medium text-gray-900">Jam Tangan</span>
                     <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">Rp 2jt+</span>
                   </div>
                   <div className="flex flex-col items-center gap-2">
                     <span className="text-4xl mb-2">👔</span> 
                     <span className="font-medium text-gray-900">Baju</span>
                     <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">Rp 500rb+</span>
                   </div>
                   <div className="flex flex-col items-center gap-2">
                     <span className="text-4xl mb-2">🎮</span> 
                     <span className="font-medium text-gray-900">Gadget</span>
                     <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">Rp 3jt+</span>
                   </div>
               </div>
               <div className="mt-8 font-bold text-gray-400 uppercase tracking-widest text-sm">Dilupakan bulan depan ❌</div>
             </div>

             {/* Right Column */}
             <div className="bg-white rounded-3xl p-8 border-2 border-[var(--theme-accent)] shadow-xl relative overflow-hidden transform md:scale-105 z-10">
               <div className="absolute top-4 right-4 bg-[var(--theme-accent)] text-white text-[10px] font-bold px-3 py-1 rounded-full">HARGA TERBAIK</div>
               <div className="h-full flex flex-col items-center justify-center space-y-6">
                 <div className="h-20 w-20 bg-[var(--theme-accent-soft)] rounded-full flex items-center justify-center text-4xl shadow-inner">
                   🎵
                 </div>
                 <div className="space-y-1">
                   <h3 className="text-2xl font-bold text-gray-900">Lagu Personal Untuknya</h3>
                   <div className="text-[var(--theme-accent)] font-bold text-3xl">{fmtCurrency(paymentAmount)} <span className="text-gray-300 line-through text-lg font-normal">{fmtCurrency(originalAmount)}</span></div>
                 </div>
                 <ul className="text-left space-y-3 text-gray-600 bg-[var(--theme-accent-soft)] p-6 rounded-2xl w-full">
                   <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[var(--theme-accent)]" /> <strong>Namanya</strong> dalam lirik</li>
                   <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[var(--theme-accent)]" /> Cerita & kenangan kalian</li>
                   <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[var(--theme-accent)]" /> Audio kualitas studio</li>
                   <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[var(--theme-accent)]" /> Dikirim {deliveryEta.sentenceLower}</li>
                 </ul>
                 <div className="font-bold text-[var(--theme-accent)] uppercase tracking-widest text-sm">Diputar Selamanya ✅</div>
               </div>
             </div>
          </div>
        </section>

        {/* SOCIAL PROOF / REVIEWS */}
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <div className="text-[var(--theme-accent)] text-sm font-bold uppercase tracking-wider">{reviewSectionLabel}</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(reviewSectionHeadline) }} />
            <p className="text-gray-600">{reviewSectionSubtext}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {reviewItems.map((review, idx) => {
              const transforms = ['md:-rotate-1 hover:rotate-0', 'md:translate-y-4 hover:translate-y-2', 'md:rotate-1 hover:rotate-0']
              const transform = transforms[idx % transforms.length]

              if (review.style === 'accent') {
                return (
                  <div key={idx} className={`bg-[var(--theme-accent)] text-white p-8 rounded-3xl shadow-lg transform ${transform} transition-transform`}>
                    <div className="flex text-yellow-300 mb-4">
                      {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                    </div>
                    <p className="font-medium text-lg mb-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: `"${sanitizeHtml(review.quote || '')}"` }} />
                    <div className="flex items-center gap-3">
                      {review.authorAvatarUrl && <img src={review.authorAvatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-white/50 object-cover" loading="lazy" />}
                      <div>
                        <div className="font-bold">{review.authorName}</div>
                        <div className="text-xs opacity-80">{review.authorMeta}</div>
                      </div>
                    </div>
                  </div>
                )
              }

              if (review.style === 'dark-chat') {
                const msgs = review.chatMessages || []
                return (
                  <div key={idx} className={`bg-gray-900 text-white p-8 rounded-3xl shadow-lg transform ${transform} transition-transform`}>
                    <div className="space-y-4 font-sans text-sm">
                      {msgs.map((msg, mi) => (
                        <div key={mi} className={mi === 0 ? "bg-white/10 rounded-2xl rounded-tl-sm p-3 self-start max-w-[90%]" : "bg-blue-600 rounded-2xl rounded-tr-sm p-3 self-end ml-auto max-w-[90%]"}>
                          {msg}
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center gap-3 pt-6 border-t border-white/10">
                      {review.authorAvatarUrl && <img src={review.authorAvatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-white/50 object-cover" loading="lazy" />}
                      <div>
                        <div className="font-bold">{review.authorName}</div>
                        <div className="text-xs opacity-80">{review.authorMeta}</div>
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div key={idx} className={`bg-white border border-gray-100 p-8 rounded-3xl shadow-lg transform ${transform} transition-transform`}>
                  <div className="flex text-yellow-400 mb-4">
                    {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="font-medium text-gray-800 text-lg mb-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: `"${sanitizeHtml(review.quote || '')}"` }} />
                  <div className="flex items-center gap-3">
                    {review.authorAvatarUrl && <img src={review.authorAvatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-gray-100 object-cover" loading="lazy" />}
                    <div>
                      <div className="font-bold text-gray-900">{review.authorName}</div>
                      <div className="text-xs text-gray-500">{review.authorMeta}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section aria-labelledby="how-it-works-title" className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-[var(--theme-accent)] text-sm font-bold uppercase tracking-wider">Proses Mudah</h2>
            <h2 id="how-it-works-title" className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">Tiga langkah menuju <span className="text-[var(--theme-accent)] italic">tangis bahagia</span></h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, icon: '✍️', title: 'Ceritakan kisahmu', desc: 'Beritahu kami namanya, kenangan kalian, dan hal-hal lucu.' },
              { step: 2, icon: '🎵', title: 'Kami buatkan', desc: 'Namanya ditenun menjadi lirik & musik profesional oleh komposer kami.' },
              { step: 3, icon: '😭', title: 'Lihat dia terharu', desc: `Dikirim ${deliveryEta.sentenceLower} via WhatsApp. Dia akan menyimpannya selamanya.` },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center gap-4 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--theme-accent-soft)] text-3xl font-bold text-[var(--theme-accent)] shadow-sm">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <Button asChild size="lg" className="h-14 px-10 rounded-full bg-[var(--theme-accent)] text-lg font-bold shadow-xl shadow-[var(--theme-accent-soft)] hover:opacity-90">
               <Link to={themeSlug ? `/${themeSlug}/config` : '/config'} className="flex items-center gap-2">
                 <span>Buat Lagunya — {fmtCurrency(paymentAmount)}</span>
                 <span className="text-xs font-normal line-through opacity-70 decoration-white/50">{fmtCurrency(originalAmount)}</span>
               </Link>
            </Button>
          </div>
        </section>

        {/* GUARANTEE BOX */}
        <section className="max-w-3xl mx-auto">
          <div className="bg-[#ECFDF5] border border-[#D1FAE5] rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <ShieldCheck className="w-32 h-32 text-green-600" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full text-green-700 font-bold text-sm shadow-sm mb-2">
                <ShieldCheck className="h-4 w-4" /> 100% Bebas Risiko
              </div>
              <h3 className="font-serif text-3xl font-bold text-gray-900">Garansi "Tangis Bahagia"</h3>
              <p className="text-gray-700 max-w-lg mx-auto">
                Jika lagunya tidak membuatnya emosional, kami akan <strong className="text-gray-900">membuat ulang gratis</strong> atau memberikan <strong className="text-gray-900">pengembalian dana penuh</strong>. Tanpa banyak tanya.
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm font-bold text-green-700 pt-2">
                 <span className="flex items-center gap-1"><Check className="h-4 w-4" /> Revisi gratis</span>
                 <span className="flex items-center gap-1"><Check className="h-4 w-4" /> Refund penuh</span>
                 <span className="flex items-center gap-1"><Check className="h-4 w-4" /> Pengiriman {deliveryEta.short}</span>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <video 
              src="/laguin-studio.mp4" 
              className="w-full rounded-2xl shadow-md" 
              autoPlay 
              muted 
              loop 
              playsInline
            />
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-title" className="space-y-10 max-w-3xl mx-auto pb-8">
          <h2 id="faq-title" className="text-center font-serif text-3xl font-bold text-gray-900">Pertanyaan <span className="text-[var(--theme-accent)] italic">Cepat</span></h2>
          <div className="space-y-4">
             {faqItems.map((faq, i) => (
               <div key={i} className="group rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-md transition-all cursor-default">
                 <h3 className="font-bold text-gray-900 text-lg mb-2 flex justify-between items-center">
                   {faq.q}
                   <span className="text-[var(--theme-accent-soft)] group-hover:text-[var(--theme-accent)] transition-colors text-2xl">↓</span>
                 </h3>
                 <p className="text-gray-600 leading-relaxed">{faq.a}</p>
               </div>
             ))}
          </div>
        </section>

        {/* FOOTER CTA */}
        <section className="text-center space-y-6 pb-12">
           <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">{footerCtaHeadline}</h2>
           <p className="text-gray-600 text-base sm:text-lg" dangerouslySetInnerHTML={{ __html: sanitizeHtml(footerCtaSubtitle) }} />
           
           <div className="pt-4">
             <Button asChild size="lg" className="h-auto min-h-[4rem] px-6 py-4 sm:px-12 rounded-full bg-[var(--theme-accent)] text-lg sm:text-xl font-bold shadow-2xl shadow-[var(--theme-accent-soft)] hover:opacity-90 hover:scale-105 transition-all">
               <Link to={themeSlug ? `/${themeSlug}/config` : '/config'} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 leading-none">
                 <span>Buat Lagunya — {fmtCurrency(paymentAmount)}</span>
                 <span className="text-xs sm:text-sm font-normal line-through opacity-80 text-[var(--theme-accent-soft)]">{fmtCurrency(originalAmount)}</span>
               </Link>
             </Button>
           </div>
           
           <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide pt-4">
             <span>🔒 Checkout Aman</span>
             <span>Hanya 11 kuota gratis tersisa</span>
           </div>
        </section>
      </main>

      {/* FOOTER LINKS */}
      <footer className="border-t border-gray-100 bg-white py-12 text-sm text-gray-400">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            <div className="flex flex-col items-center sm:items-start gap-3">
              <Link to={themeSlug ? `/${themeSlug}` : '/'} className="flex items-center gap-2">
                <img src={logoUrl} alt="Laguin.id - Lagumu, Ceritamu" className="h-10 w-auto object-contain opacity-70" loading="lazy" />
              </Link>
              <p className="text-gray-500 text-xs">Membuat pria menangis sejak 2024</p>
              <div className="text-xs space-y-1 text-gray-400">
                <p className="font-medium text-gray-500">Langit Utama Group</p>
                <a href="mailto:support@laguin.id" className="hover:text-gray-600 transition-colors">support@laguin.id</a>
              </div>
            </div>

            {activeThemes.length > 0 && (
              <div className="flex flex-col items-center sm:items-start gap-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Koleksi Lagu</h4>
                <div className="flex flex-col gap-1.5">
                  {activeThemes.map((t) => (
                    <Link key={t.slug} to={`/${t.slug}`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col items-center sm:items-start gap-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Informasi</h4>
              <div className="flex flex-col gap-1.5">
                <Link to="/privasi" className="text-xs hover:text-gray-600 transition-colors">Privasi</Link>
                <Link to="/ketentuan" className="text-xs hover:text-gray-600 transition-colors">Ketentuan</Link>
                <Link to="/kontak" className="text-xs hover:text-gray-600 transition-colors">Kontak</Link>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 text-center">
            <p className="max-w-2xl mx-auto text-[10px] sm:text-xs text-gray-400 leading-relaxed">
              <strong className="text-gray-500">Disclaimer:</strong> Laguin.id menyediakan layanan musik digital yang dipersonalisasi. Seluruh lagu dibuat secara khusus berdasarkan informasi yang diberikan oleh pelanggan. Tidak terdapat pengiriman produk fisik. Kualitas dan hasil akhir dapat bervariasi bergantung pada kelengkapan serta keakuratan informasi yang disampaikan. Layanan ini tidak berafiliasi dengan, tidak disponsori, dan tidak didukung oleh Facebook, Inc. atau Meta Platforms, Inc.
            </p>
            <p className="mt-4 text-[10px] text-gray-300">&copy; {new Date().getFullYear()} Langit Utama Group. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* STICKY BOTTOM CTA (Mobile Only) */}
      <div 
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-[999] bg-white border-t border-gray-100 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-transform duration-300 transform",
          showMobileCta ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="mx-auto max-w-md space-y-2">
           <div className="flex justify-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
             <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-green-500" /> {deliveryEta.short}</span>
             <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-500" /> Garansi</span>
           </div>
           <Button asChild size="lg" className="w-full h-auto min-h-[3.5rem] py-2 rounded-xl bg-[var(--theme-accent)] text-lg font-bold shadow-lg shadow-[var(--theme-accent-soft)] hover:opacity-90 active:scale-95 transition-all">
            <Link to={themeSlug ? `/${themeSlug}/config` : '/config'} className="flex items-center justify-center gap-2 flex-wrap text-center leading-tight">
              <span>Buat Lagunya — {fmtCurrency(paymentAmount)}</span>
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 text-xs whitespace-nowrap">
                (11 sisa)
              </Badge>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
