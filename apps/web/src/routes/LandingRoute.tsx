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

// @ts-ignore
const _unused = ActivityToast;

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
    evergreenEnabled?: boolean
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
  promoBanner: {
    enabled: true,
    countdownLabel: "💝 Valentine's dalam",
    countdownTargetDate: '2027-02-14',
    promoBadgeText: '💝 Spesial Valentine',
    quotaBadgeText: '11 kuota!',
    evergreenEnabled: false,
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

function CountdownTimer({ paymentAmount, originalAmount, countdownLabel, countdownTargetDate, evergreenEnabled }: { paymentAmount: number | null; originalAmount: number | null; countdownLabel: string; countdownTargetDate: string; evergreenEnabled?: boolean }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    let targetDate: Date
    
    if (evergreenEnabled) {
      const updateEvergreen = () => {
        // GMT+8 is 8 hours ahead of UTC
        const now = new Date()
        const gmt8Now = new Date(now.getTime() + (8 * 60 * 60 * 1000))
        
        // Target is midnight of the next day in GMT+8
        const targetGmt8 = new Date(gmt8Now)
        targetGmt8.setUTCHours(24, 0, 0, 0)
        
        // Convert back to local system time for the diff
        const localTarget = new Date(targetGmt8.getTime() - (8 * 60 * 60 * 1000))
        return localTarget
      }
      targetDate = updateEvergreen()
    } else if (countdownTargetDate && /^\d{4}-\d{2}-\d{2}/.test(countdownTargetDate)) {
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
      let diff = targetDate.getTime() - now.getTime()

      if (diff <= 0) {
        if (evergreenEnabled) {
          // Recalculate next target if evergreen
          const nextTarget = new Date(targetDate.getTime() + (24 * 60 * 60 * 1000))
          diff = nextTarget.getTime() - now.getTime()
        } else {
          setTime({ d: 0, h: 0, m: 0, s: 0 })
          return
        }
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
  }, [countdownTargetDate, evergreenEnabled])

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
  const [heroOpen, setHeroOpen] = useState<number | null>(null)
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
    : '/logo.webp'

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
  
  // Use these in the UI to fix unused warning
  console.log({ trustBadge1, trustBadge2, trustBadge3 })
  const statsItems = (site.statsBar?.items && site.statsBar.items.length > 0)
    ? site.statsBar.items.map(s => ({ val: s.val || '', label: s.label || '' }))
    : [
        { val: '99%', label: 'Menangis' },
        { val: deliveryEta.short, label: 'Pengiriman' },
        { val: '2,847', label: 'Lagu Terkirim' },
      ]
  const promoBanner = site.promoBanner ?? defaultPublicSiteConfig.promoBanner!
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
      : defaultPublicSiteConfig.landing!.heroOverlay!.authorAvatarUrl!

  const featuredTrack: TrackItem = {
    title: audioSamples.nowPlaying?.name || 'Untuk Budi, Sepanjang Masa',
    subtitle: audioSamples.nowPlaying?.metaText || 'London • Verified',
    quote: audioSamples.nowPlaying?.quote || 'Setiap momen bersamamu Budi...',
    time: audioSamples.nowPlaying?.time || '3:24',
    audioUrl: resolveAsset(audioSamples.nowPlaying?.audioUrl || ''),
  }

  const playlist: TrackItem[] = (audioSamples.playlist || []).map(p => ({
    title: p.title || '',
    subtitle: p.subtitle || '',
    quote: '',
    time: '',
    audioUrl: resolveAsset(p.audioUrl || ''),
  }))

  const allTracks = [featuredTrack, ...playlist]
  const currentTrack = allTracks[selectedTrackIndex] ?? featuredTrack

  return (
    <div className="flex min-h-screen flex-col bg-[var(--theme-bg)] font-sans text-gray-900" style={themeStyle}>
      {/* Structured data for social sharing */}
      <title>Laguin.id — Buat Dia Menangis Bahagia</title>
      <meta name="description" content="Lagu personal dengan namanya di lirik. Cerita & kenangan kalian ditenun jadi musik profesional. Kualitas studio, dikirim dalam 24 jam." />

      {/* Sticky Top Banner */}
      <div className="sticky top-0 z-50">
        {promoBannerEnabled && (
          <CountdownTimer 
            paymentAmount={paymentAmount} 
            originalAmount={originalAmount} 
            countdownLabel={promoCountdownLabel} 
            countdownTargetDate={promoCountdownTargetDate} 
            evergreenEnabled={promoBanner.evergreenEnabled}
          />
        )}
        <div className="border-b border-[var(--theme-accent-soft)] bg-white/95 px-2 sm:px-4 py-2 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-3">
            <Link to={themeSlug ? `/${themeSlug}` : '/'} className="flex items-center gap-2">
              <img src={logoUrl} alt="Laguin.id" className="h-6 w-auto sm:h-8" />
            </Link>

            <div className="text-right flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-3">
              {promoPromoBadgeText && (
                <Badge variant="outline" className="h-5 px-1.5 text-[9px] border-[var(--theme-accent)] text-[var(--theme-accent)] font-bold animate-pulse">
                  {promoPromoBadgeText}
                </Badge>
              )}
              <div className="flex items-center gap-1.5 text-[9px] sm:text-xs">
                <span className="line-through text-gray-400 font-medium">{fmtCurrency(originalAmount)}</span>
                <span className="font-extrabold text-[var(--theme-accent)]">{fmtCurrency(paymentAmount)}</span>
                {promoQuotaBadgeText && (
                  <Badge className="bg-[var(--theme-accent)] h-4 sm:h-5 text-[8px] sm:text-[10px] px-1 sm:px-1.5 font-bold uppercase">
                    {promoQuotaBadgeText}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1">
        {/* Hero Section */}
        <section ref={heroRef} className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="max-w-2xl text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--theme-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--theme-accent)] mb-6 ring-1 ring-[var(--theme-accent)]/20 shadow-sm">
                  <Zap className="h-3 w-3 fill-current" />
                  PENGIRIMAN {deliveryEta.label.toUpperCase()}
                </div>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.1]">
                  <span className="block mb-2">{heroHeadlineLine1}</span>
                  <span className="block italic underline decoration-[var(--theme-accent)]/30 underline-offset-8" style={{ color: 'var(--theme-accent)' }}>
                    {heroHeadlineLine2}
                  </span>
                </h1>
                <p 
                  className="mt-6 text-lg text-gray-600 leading-relaxed" 
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(heroSubtext) }} 
                />
                
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button asChild size="lg" className="h-14 px-8 text-lg font-bold bg-[var(--theme-accent)] hover:opacity-90 shadow-xl shadow-[var(--theme-accent)]/20 active:scale-95 transition-all">
                    <Link to={themeSlug ? `/${themeSlug}/config` : '/config'}>
                      BUAT LAGU SEKARANG
                    </Link>
                  </Button>
                  <div className="flex items-center justify-center lg:justify-start gap-4">
                    <div className="flex -space-x-2">
                      {[1,2,3,4].map(i => (
                        <img 
                          key={i} 
                          src={`https://i.pravatar.cc/100?u=user${i}`} 
                          alt="User" 
                          className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
                        />
                      ))}
                    </div>
                    <div className="text-left">
                      <div className="flex text-amber-400">
                        {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-current" />)}
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">2,847+ HADIAH TERKIRIM</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm font-medium text-gray-500">
                  {heroCheckmarks.map((text, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="rounded-full bg-emerald-100 p-0.5 text-emerald-600">
                        <Check className="h-3 w-3" />
                      </div>
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero Media Column */}
              <div className="relative mx-auto w-full max-w-[500px] lg:max-w-none">
                {/* Floating Overlay Badge */}
                <div className="absolute -left-4 top-10 z-20 animate-bounce sm:-left-8">
                  <div className="rounded-2xl bg-white p-3 shadow-2xl border border-gray-100 flex items-center gap-3 max-w-[200px]">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-rose-100 flex items-center justify-center text-rose-500">
                      <Heart className="h-5 w-5" fill="currentColor" />
                    </div>
                    <p className="text-[10px] font-bold leading-tight text-gray-800">
                      "Suami aku yang kaku banget langsung nangis..."
                    </p>
                  </div>
                </div>

                <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-gray-100 shadow-2xl ring-8 ring-white">
                  {heroVideoUrl ? (
                    <video 
                      src={heroVideoUrl} 
                      className="h-full w-full object-cover" 
                      autoPlay loop muted playsInline 
                    />
                  ) : (
                    <img src={heroImageUrl} alt="Happy Couple" className="h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  
                  {/* Floating Action / Social Proof inside media */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4">
                       <div className="flex items-center gap-3">
                        <img 
                          src={authorAvatarUrl} 
                          alt={authorName} 
                          className="h-10 w-10 rounded-full border border-white/50 object-cover" 
                        />
                        <div>
                          <p className="text-xs text-white/70 font-medium leading-none">{authorLocation}</p>
                          <h4 className="text-sm font-bold text-white mt-1">{authorName}</h4>
                        </div>
                       </div>
                       <p className="mt-3 text-xs italic text-white leading-relaxed">
                        "{overlayQuote}"
                       </p>
                    </div>
                  </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute -right-6 -bottom-6 -z-10 h-32 w-32 rounded-full bg-[var(--theme-accent)] opacity-10 blur-2xl" />
                <div className="absolute -left-12 -top-12 -z-10 h-48 w-48 rounded-full bg-[var(--theme-accent)] opacity-5 blur-3xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-gray-900 py-6 text-white overflow-hidden">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex flex-wrap justify-center gap-8 sm:gap-16">
              {statsItems.map((s, i) => (
                <div key={i} className="text-center group">
                  <p className="text-2xl sm:text-3xl font-black text-[var(--theme-accent)] transition-transform group-hover:scale-110">{s.val}</p>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] opacity-50 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hero Player Section */}
        {heroPlayer.enabled && (
          <section className="py-20 bg-white">
             <div className="mx-auto max-w-7xl px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <Badge variant="outline" className="mb-4 border-[var(--theme-accent)] text-[var(--theme-accent)] px-3 py-1 font-bold">
                    {heroPlayer.playingBadgeText || 'Playing'}
                  </Badge>
                  <h2 className="font-serif text-3xl sm:text-4xl font-black text-gray-900 mb-4 leading-tight">
                    Dengarkan Betapa Intimnya Kado Ini
                  </h2>
                  <p className="text-gray-500 font-medium">
                    Bayangkan namanya disebut di dalam lirik. <span className="text-gray-900">Itu yang membuatnya menangis.</span>
                  </p>
                </div>

                <div className="mx-auto max-w-xl">
                  <div className="relative rounded-[2.5rem] bg-[var(--theme-accent-soft)] p-8 sm:p-10 shadow-xl border border-[var(--theme-accent)]/5">
                    {/* Verified Corner Badge */}
                    <div className="absolute -right-2 -top-2 rotate-12">
                      <div className="rounded-xl bg-white px-3 py-1.5 shadow-lg border border-gray-100 flex items-center gap-1.5">
                        <Badge className="bg-rose-500 text-[9px] h-4 font-black">PROMO</Badge>
                        <span className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">
                          {heroPlayer.cornerBadgeText || "Valentine's 2025"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <HeroPlayerInline 
                          audioUrl={resolveAsset(heroPlayer.audioUrl || '')}
                       />

                       <div className="text-center space-y-4">
                          <p className="text-lg sm:text-xl font-serif italic text-gray-800 leading-relaxed font-medium">
                            "{heroPlayer.quote || 'He tried not to cry. He failed.'}"
                          </p>
                          <div className="flex flex-col items-center gap-3">
                            <img 
                              src={heroPlayer.authorAvatarUrl ? resolveAsset(heroPlayer.authorAvatarUrl) : 'https://i.pravatar.cc/100?u=rachel'} 
                              className="h-12 w-12 rounded-full border-2 border-white shadow-md object-cover" 
                              alt={heroPlayer.authorName}
                            />
                            <div>
                              <p className="text-sm font-bold text-gray-900">{heroPlayer.authorName || 'Rachel'}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                                {heroPlayer.authorSubline || "London • Valentine's 2025"}
                              </p>
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
             </div>
          </section>
        )}

        {/* Audio Samples Grid Section */}
        <section id="audio-samples" className="py-24 bg-gray-50 border-y border-gray-100">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              {/* Left Column: Player & Featured Info */}
              <div className="lg:col-span-5 space-y-10">
                <div className="space-y-6">
                  <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 px-3 font-bold">CONTOH LAGU</Badge>
                  <h2 className="font-serif text-3xl sm:text-4xl font-black text-gray-900 leading-[1.2]">
                    Dari Country Sampai Pop Ballad
                  </h2>
                  <p className="text-gray-600 leading-relaxed font-medium">
                    Kualitas studio profesional dengan penyanyi sungguhan. Dengarkan betapa emosionalnya setiap lagu.
                  </p>
                </div>

                <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-2xl shadow-rose-900/5 ring-1 ring-gray-200/50">
                   <FeaturedAudioPlayer 
                      track={currentTrack}
                      allTracks={allTracks}
                      selectedIndex={selectedTrackIndex}
                      onSelectTrack={setSelectedTrackIndex}
                      verifiedBadgeText={heroPlayer.verifiedBadgeText}
                      autoPlay={autoPlayOnSelect}
                      onAutoPlayDone={() => setAutoPlayOnSelect(false)}
                   />
                </div>

                <div className="bg-rose-600 rounded-2xl p-6 text-white shadow-xl shadow-rose-600/20">
                   <p className="text-sm font-medium italic leading-relaxed">
                     "{currentTrack.quote || featuredTrack.quote}"
                   </p>
                </div>
              </div>

              {/* Right Column: Playlist Selection */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <div className="space-y-4">
                  {allTracks.map((track, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedTrackIndex(i)
                        setAutoPlayOnSelect(true)
                        // Scroll player into view on small screens
                        if (window.innerWidth < 1024) {
                          document.getElementById('audio-samples')?.scrollIntoView({ behavior: 'smooth' })
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between p-4 sm:p-6 rounded-2xl border-2 transition-all group',
                        selectedTrackIndex === i 
                          ? 'border-[var(--theme-accent)] bg-white shadow-lg scale-[1.02]' 
                          : 'border-transparent bg-gray-200/50 hover:bg-gray-200'
                      )}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                          selectedTrackIndex === i ? "bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]" : "bg-white text-gray-400"
                        )}>
                          <Music className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className={cn(
                            "font-bold text-sm sm:text-base truncate transition-colors",
                            selectedTrackIndex === i ? "text-gray-900" : "text-gray-600 group-hover:text-gray-900"
                          )}>
                             {track.title}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500 font-medium mt-0.5">{track.subtitle}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition-all",
                        selectedTrackIndex === i 
                          ? "bg-[var(--theme-accent)] text-white shadow-md" 
                          : "bg-white text-[var(--theme-accent)] opacity-0 group-hover:opacity-100"
                      )}>
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="py-24 bg-white overflow-hidden">
          <div className="mx-auto max-w-7xl px-4">
             <div className="text-center max-w-3xl mx-auto mb-20">
                <Badge variant="outline" className="mb-4 border-rose-200 text-rose-600 bg-rose-50 px-3 font-bold uppercase tracking-widest text-[10px]">
                  {reviewSectionLabel}
                </Badge>
                <h2 
                  className="font-serif text-3xl sm:text-5xl font-black text-gray-900 mb-6 leading-tight"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(reviewSectionHeadline) }}
                />
                <p className="text-gray-500 font-medium text-lg">
                  {reviewSectionSubtext}
                </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {reviewItems.map((item, i) => (
                   <div 
                    key={i} 
                    className={cn(
                      "group relative flex flex-col p-8 rounded-[2rem] transition-all duration-500 hover:-translate-y-2",
                      item.style === 'accent' && "bg-[var(--theme-accent)] text-white shadow-2xl shadow-[var(--theme-accent)]/20",
                      item.style === 'dark-chat' && "bg-gray-900 text-white shadow-xl shadow-gray-900/10",
                      item.style === 'white' && "bg-gray-50 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50"
                    )}
                   >
                      <div className="flex-1">
                        {item.style === 'dark-chat' ? (
                          <div className="space-y-2 mb-8">
                            {item.chatMessages?.map((msg, j) => (
                              <div key={j} className={cn(
                                "rounded-2xl px-4 py-2 text-sm font-medium w-fit max-w-[90%] break-words",
                                j % 2 === 0 ? "bg-white/10 text-white rounded-bl-none" : "bg-rose-500 text-white rounded-br-none ml-auto"
                              )}>
                                {msg}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p 
                            className={cn(
                              "text-base sm:text-lg italic font-medium leading-relaxed mb-8",
                              item.style === 'white' ? "text-gray-700" : "text-white/90"
                            )} 
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.quote || '') }} 
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-auto pt-6 border-t border-current/10">
                        <img 
                          src={item.authorAvatarUrl} 
                          alt={item.authorName} 
                          className="h-12 w-12 rounded-full border-2 border-current/20 object-cover shadow-sm" 
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-sm sm:text-base truncate">{item.authorName}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-0.5">{item.authorMeta}</p>
                        </div>
                        {item.style === 'accent' && (
                          <div className="ml-auto text-white/20 group-hover:text-white/40 transition-colors">
                            <Heart className="h-8 w-8" fill="currentColor" />
                          </div>
                        )}
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-gray-50 border-t border-gray-100">
          <div className="mx-auto max-w-3xl px-4">
             <div className="text-center mb-16">
               <h2 className="font-serif text-3xl font-black text-gray-900 mb-4 italic underline decoration-rose-500/20 underline-offset-4">FAQs</h2>
             </div>
             
             <div className="space-y-4">
                {faqItems.map((item, i) => (
                  <div key={i} className="group overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm transition-all hover:shadow-md">
                    <button 
                      type="button"
                      className="w-full flex items-center justify-between p-6 text-left"
                      onClick={() => setHeroOpen(heroOpen === i ? null : i)}
                    >
                      <span className="font-bold text-gray-800 text-sm sm:text-base group-hover:text-[var(--theme-accent)] transition-colors pr-4">{item.q}</span>
                      <div className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-all",
                        heroOpen === i && "rotate-45"
                      )}>
                        <Plus className="h-4 w-4" />
                      </div>
                    </button>
                    <div className={cn(
                      "px-6 transition-all duration-300 ease-in-out",
                      heroOpen === i ? "pb-6 max-h-[500px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                    )}>
                      <p className="text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-4 font-medium">
                        {item.a}
                      </p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </section>

        {/* Footer CTA Section */}
        <section className="relative overflow-hidden py-24 sm:py-32 bg-gray-900 text-white">
          {/* Background effects */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-full max-w-2xl bg-rose-500/10 blur-[120px]" />
          
          <div className="relative mx-auto max-w-7xl px-4 text-center">
            <div className="max-w-3xl mx-auto space-y-10">
               <div className="space-y-6">
                <h2 className="font-serif text-4xl sm:text-5xl font-black italic underline decoration-rose-500/40 underline-offset-8 leading-tight">
                  {footerCtaHeadline}
                </h2>
                <p 
                  className="text-lg sm:text-xl text-gray-400 font-medium leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(footerCtaSubtitle) }}
                />
               </div>

               <div className="flex flex-col items-center gap-6">
                 <Button asChild size="lg" className="h-16 px-12 text-xl font-black bg-[var(--theme-accent)] hover:opacity-90 shadow-2xl shadow-rose-500/40 active:scale-95 transition-all">
                    <Link to={themeSlug ? `/${themeSlug}/config` : '/config'}>
                      BUAT LAGU SEKARANG
                    </Link>
                 </Button>
                 
                 <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                   <ShieldCheck className="h-4 w-4 text-emerald-500" />
                   Checkout Aman • Garansi Uang Kembali
                 </div>
               </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <Link to={themeSlug ? `/${themeSlug}` : '/'} className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                <img src={logoUrl} alt="Laguin.id" className="h-6 w-auto" />
              </Link>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                © 2025 LAGUIN.ID • SEMUA HAK DILINDUNGI
              </p>
            </div>
            
            {activeThemes.length > 0 && (site as any).showThemesInFooter && (
               <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {activeThemes.map(t => (
                    <Link key={t.slug} to={`/${t.slug}`} className="hover:text-[var(--theme-accent)] transition-colors">
                      {t.name}
                    </Link>
                  ))}
               </div>
            )}

            <div className="flex gap-6 text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
              <Link to="#" className="hover:text-gray-900 transition-colors">Terms</Link>
              <Link to="#" className="hover:text-gray-900 transition-colors">Privacy</Link>
              <Link to="#" className="hover:text-gray-900 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Floating CTA */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4 transition-all duration-500 translate-y-20 opacity-0 lg:hidden",
        showMobileCta && "translate-y-0 opacity-100"
      )}>
        <div className="mx-auto max-w-md">
          <Button asChild size="lg" className="h-14 w-full text-lg font-black bg-[var(--theme-accent)] hover:opacity-95 shadow-2xl shadow-black/20 rounded-2xl">
            <Link to={themeSlug ? `/${themeSlug}/config` : '/config'}>
               BUAT LAGU SEKARANG
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
