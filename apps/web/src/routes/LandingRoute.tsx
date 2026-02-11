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
  ChevronRight,
  SkipBack,
  SkipForward,
  Heart,
} from 'lucide-react'

import { apiGet } from '@/lib/http'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ActivityToast, type ActivityToastConfig } from '@/components/activity-toast/ActivityToast'
import { HeroPlayerInline } from './HeroPlayerInline.tsx'

// --- Components ---

type PublicSiteConfig = {
  landing?: {
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
  activityToast?: ActivityToastConfig
}

type PublicSettingsResponse = { publicSiteConfig: PublicSiteConfig | null }

const defaultPublicSiteConfig: PublicSiteConfig = {
  landing: {
    heroMedia: {
      imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=2940&auto=format&fit=crop',
      videoUrl: null,
    },
    heroOverlay: {
      quote: 'Dia menangis sebelum chorus berakhir',
      authorName: 'Rina M.',
      authorLocation: 'Jakarta',
      authorAvatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    heroPlayer: {
      enabled: true,
      playingBadgeText: 'Playing',
      cornerBadgeText: "Valentine's Special",
      verifiedBadgeText: 'Verified Purchase',
      quote: 'He tried not to cry. He failed.',
      authorName: 'Rachel M.',
      authorSubline: "London • Valentine's 2025",
      authorAvatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
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

function CountdownTimer() {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })

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
        setTime({ d: 0, h: 0, m: 0, s: 0 })
        return
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24))
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)

      setTime({ d, h, m, s })
    }

    updateTimer() // Initial call
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-[#E11D48] px-3 py-2 text-center text-[10px] sm:text-xs font-bold text-white uppercase tracking-wide leading-snug">
      <span className="whitespace-normal">
        💝 Valentine's dalam {time.d}h {time.h}j {time.m}m {time.s}d lagi
      </span>
      <span className="hidden sm:inline"> • </span>
      <span className="block sm:inline mt-0.5 sm:mt-0">
        <span className="line-through opacity-70">Rp 497rb</span> <span className="text-white">GRATIS</span> (100 pertama)
      </span>
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
      <span className="text-[#E11D48]">{parsed.name}</span>
      {parsed.after}
    </>
  )
}

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
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#E11D48]/90 text-rose-100">
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
            className="h-full bg-rose-300 transition-all duration-150"
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
            hasAudio ? 'bg-[#E11D48] hover:bg-rose-600 active:scale-95' : 'bg-gray-300 cursor-not-allowed'
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
          onPlay={() => setPlaying(true)}
          className="hidden"
        />
      )}
    </div>
  )
}

// --- Main Page ---

const FAQ_ITEMS = [
  { q: "Dia bukan tipe yang emosional...", a: "Itu yang MEREKA SEMUA katakan! 98% menangis — mantan militer, ayah yang kaku, pacar 'aku gak main perasaan'. Semakin tangguh mereka, semakin dalam jatuhnya. 😉" },
  { q: "Bagaimana dia menerima lagunya?", a: "Kamu menerima link download via email. Putar untuknya secara langsung, kirim via WhatsApp, atau jadikan kejutan! Ini file MP3 yang bisa diputar di mana saja." },
  { q: "Berapa lama prosesnya?", a: "Dalam 24 jam! Biasanya lebih cepat. Kamu akan dapat notifikasi email saat sudah siap." },
  { q: "Kalau aku gak suka gimana?", a: "Revisi gratis tanpa batas sampai kamu suka. Masih gak puas? Refund penuh, tanpa tanya-tanya. 💕" },
  { q: "Benarkah GRATIS?", a: "Ya! Spesial untuk 100 orang pertama (normalnya Rp 497.000). Tanpa biaya tersembunyi. Satu kesempatan, hadiah tak terlupakan." },
]

export function LandingRoute() {
  const [publicSiteConfig, setPublicSiteConfig] = useState<PublicSiteConfig | null>(null)
  const [heroOpen, setHeroOpen] = useState(false)
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0)
  const [autoPlayOnSelect, setAutoPlayOnSelect] = useState(false)
  const [showMobileCta, setShowMobileCta] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

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
      description: 'Lagu personal dengan namanya di lirik. Cerita & kenangan kalian ditenun jadi musik profesional. Kualitas studio, dikirim 24 jam.',
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
      mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
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
  }, [])

  useEffect(() => {
    let cancelled = false
    apiGet<PublicSettingsResponse>('/api/public/settings')
      .then((res) => {
        if (cancelled) return
        const cfg = res?.publicSiteConfig
        if (cfg && typeof cfg === 'object') setPublicSiteConfig(cfg)
        else setPublicSiteConfig(null)
      })
      .catch(() => {
        if (!cancelled) setPublicSiteConfig(null)
      })
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

  const site = (publicSiteConfig ?? defaultPublicSiteConfig) as PublicSiteConfig
  const landing = site.landing ?? defaultPublicSiteConfig.landing!
  const heroMedia = landing.heroMedia ?? defaultPublicSiteConfig.landing!.heroMedia!
  const heroOverlay = landing.heroOverlay ?? defaultPublicSiteConfig.landing!.heroOverlay!
  const audioSamples = landing.audioSamples ?? defaultPublicSiteConfig.landing!.audioSamples!
  const heroPlayer = landing.heroPlayer ?? defaultPublicSiteConfig.landing!.heroPlayer!

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
    <div className="min-h-screen bg-[#FFF5F7] font-sans pb-32 overflow-x-hidden">
      <ActivityToast config={toastConfig} />

      {/* Sticky Top Banner */}
      <div className="sticky top-0 z-50">
        <CountdownTimer />
        <div className="border-b border-rose-100 bg-white/95 px-2 sm:px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 font-serif text-xl font-bold text-[#E11D48]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E11D48] text-white">
                L
              </div>
              Laguin.id
            </div>
            <div className="text-right flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
              <div className="hidden md:block text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                💝 Spesial Valentine
              </div>
              <div className="leading-tight">
                <span className="text-xs text-gray-400 line-through">Rp 497.000</span>{' '}
                <span className="text-base sm:text-lg font-bold text-[#E11D48]">GRATIS</span>
                <Badge variant="destructive" className="ml-1 h-5 px-1 py-0 text-[10px] align-middle">
                  11 kuota gratis tersisa!
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-12 space-y-12 sm:space-y-20">
        {/* HERO SECTION */}
        <section ref={heroRef} aria-labelledby="hero-title" className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center">
          <div className="text-center md:text-left space-y-5 md:space-y-6">
            {/* Social proof badge */}
            <div className="inline-flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
              <div className="flex -space-x-2">
                <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" />
                <img src="https://randomuser.me/api/portraits/women/65.jpg" alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" />
                <img src="https://randomuser.me/api/portraits/women/32.jpg" alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" />
              </div>
              <span className="text-sm font-medium text-gray-900">2,847 pria menangis terharu</span>
              <div className="flex gap-0.5 text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
              </div>
            </div>

            {/* Tagline */}
            <p className="text-base sm:text-lg text-gray-700 font-normal">Lelah dengan kado yang dia lupa?</p>

            {/* Main headline */}
            <h1 id="hero-title" className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
              <span className="text-gray-900">Valentine kali ini,</span>
              <br />
              <span className="text-[#E11D48]">buat dia menangis bahagia.</span>
            </h1>

            {/* Body paragraph */}
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-lg mx-auto md:mx-0 text-center md:text-left">
              Sebuah <strong className="text-gray-900">lagu</strong> personal dengan{' '}
              <strong className="text-gray-900">namanya</strong> di dalam lirik, menceritakan{' '}
              <strong className="text-gray-900">kisah kalian</strong>. Kualitas studio. Dikirim dalam 24 jam.
            </p>

            {/* CTA + Pricing row */}
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start sm:items-center gap-4">
              <Button asChild size="lg" className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl bg-[#E11D48] text-base sm:text-lg font-bold shadow-lg shadow-rose-200/50 hover:bg-rose-600 transition-all duration-300 group">
                <Link to="/config" className="flex items-center gap-2">
                  Buat Lagunya — GRATIS
                  <ChevronRight className="h-5 w-5 -mr-1 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
              <div className="flex items-baseline gap-2">
                <span className="text-base text-gray-400 line-through">Rp 497.000</span>
                <span className="text-xl font-bold text-[#E11D48]">GRATIS</span>
              </div>
            </div>

            {/* Feature list */}
            <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-gray-700">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                24h pengiriman
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Namanya ADA di lagu
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Tak menangis = uang kembali
              </span>
            </div>

            {/* Urgency message */}
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50/80 border border-rose-100 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#E11D48]" />
              <span className="text-sm font-medium text-[#E11D48]">Hanya 12 kuota gratis tersisa</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-full sm:max-w-md md:max-w-full min-w-0">
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
                     <div className="h-12 w-12 rounded-full bg-[#E11D48] flex items-center justify-center pl-1 shadow-lg">
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
                   </div>
                 </div>
               )}
             </div>
          </div>
        </section>

        {/* AUDIO SAMPLES SECTION */}
        <section aria-labelledby="audio-samples-title" className="space-y-8 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-[#E11D48]">
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              Tekan Putar
            </div>
            <h2 id="audio-samples-title" className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">
              Dengar <span className="text-[#E11D48] italic">namanya</span> di lagu asli
            </h2>
            <p className="text-gray-500">Lagu asli yang kami buat. Nama asli. Air mata asli.</p>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 md:p-10 shadow-xl border border-rose-100/50">
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
                      selectedTrackIndex === i ? 'bg-rose-50/70' : 'hover:bg-gray-50',
                      t.audioUrl ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-[#E11D48]">
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
                Bayangkan mendengar <span className="text-[#E11D48] font-medium italic">namanya</span> di lagu seperti ini...
              </p>
              <Button asChild size="lg" className="h-12 px-8 rounded-xl bg-[#E11D48] font-bold shadow-lg shadow-rose-200/50 hover:bg-rose-600">
                <Link to="/config">Buat Lagunya — GRATIS</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className="py-8 border-y border-rose-100 bg-white/50 backdrop-blur-sm -mx-2 px-2 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
          <div className="flex flex-wrap justify-center gap-8 md:gap-24 text-center">
             {[
               { val: '99%', label: 'Menangis' },
               { val: '24h', label: 'Pengiriman' },
               { val: '2,847', label: 'Lagu Terkirim' },
             ].map((stat) => (
               <div key={stat.label}>
                 <div className="text-3xl md:text-4xl font-bold text-[#E11D48] font-serif">{stat.val}</div>
                 <div className="text-xs uppercase font-bold text-gray-400 tracking-wider">{stat.label}</div>
               </div>
             ))}
          </div>
        </section>

        {/* COMPARISON SECTION */}
        <section aria-labelledby="comparison-title" className="space-y-10 text-center max-w-5xl mx-auto">
          <div className="space-y-2">
            <h2 id="comparison-title" className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">
              Kado yang akan dia <span className="text-gray-400 line-through decoration-rose-500">lupakan</span> vs. yang akan dia <span className="text-[#E11D48] italic">putar ulang</span>
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
             <div className="bg-white rounded-3xl p-8 border-2 border-[#E11D48] shadow-xl relative overflow-hidden transform md:scale-105 z-10">
               <div className="absolute top-4 right-4 bg-[#E11D48] text-white text-[10px] font-bold px-3 py-1 rounded-full">HARGA TERBAIK</div>
               <div className="h-full flex flex-col items-center justify-center space-y-6">
                 <div className="h-20 w-20 bg-rose-100 rounded-full flex items-center justify-center text-4xl shadow-inner">
                   🎵
                 </div>
                 <div className="space-y-1">
                   <h3 className="text-2xl font-bold text-gray-900">Lagu Personal Untuknya</h3>
                   <div className="text-[#E11D48] font-bold text-3xl">GRATIS <span className="text-gray-300 line-through text-lg font-normal">Rp 497.000</span></div>
                 </div>
                 <ul className="text-left space-y-3 text-gray-600 bg-rose-50 p-6 rounded-2xl w-full">
                   <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[#E11D48]" /> <strong>Namanya</strong> dalam lirik</li>
                   <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[#E11D48]" /> Cerita & kenangan kalian</li>
                   <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[#E11D48]" /> Audio kualitas studio</li>
                   <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[#E11D48]" /> Dikirim dalam 24 jam</li>
                 </ul>
                 <div className="font-bold text-[#E11D48] uppercase tracking-widest text-sm">Diputar Selamanya ✅</div>
               </div>
             </div>
          </div>
        </section>

        {/* SOCIAL PROOF / REVIEWS */}
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <div className="text-[#E11D48] text-sm font-bold uppercase tracking-wider">Reaksi Nyata</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">"Dia <span className="text-[#E11D48] italic">tidak pernah</span> menangis"</h2>
            <p className="text-gray-600">...mereka semua bilang begitu. 98% salah.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#E11D48] text-white p-8 rounded-3xl shadow-lg transform md:-rotate-1 hover:rotate-0 transition-transform">
               <div className="flex text-yellow-300 mb-4">
                 {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
               </div>
               <p className="font-medium text-lg mb-6 leading-relaxed">
                 "Suami saya itu mantan TNI, orangnya keras. 12 tahun nikah, <strong className="bg-white/20 px-1 rounded">GAK PERNAH nangis.</strong> Eh, pas denger lagu ini, dia langsung mewek bahkan sebelum masuk reff."
               </p>
               <div className="flex items-center gap-3">
                 <img src="https://randomuser.me/api/portraits/women/65.jpg" className="w-10 h-10 rounded-full border-2 border-white/50" />
                 <div>
                   <div className="font-bold">Rina M.</div>
                   <div className="text-xs opacity-80">Jakarta • Feb 2025</div>
                 </div>
               </div>
            </div>

            <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-lg transform md:translate-y-4 hover:translate-y-2 transition-transform">
               {/* Chat UI */}
               <div className="space-y-4 font-sans text-sm">
                 <div className="bg-white/10 rounded-2xl rounded-tl-sm p-3 self-start max-w-[90%]">
                    Ka, lagunya baru masuk 😭😭😭
                 </div>
                 <div className="bg-blue-600 rounded-2xl rounded-tr-sm p-3 self-end ml-auto max-w-[90%]">
                    Sumpah ini aku gemeteran!!
                 </div>
                 <div className="bg-blue-600 rounded-2xl rounded-tr-sm p-3 self-end ml-auto max-w-[90%]">
                    Dia bakal MELELEH besok 🥺
                 </div>
               </div>
               <div className="mt-6 flex items-center gap-3 pt-6 border-t border-white/10">
                 <img src="https://randomuser.me/api/portraits/women/32.jpg" className="w-10 h-10 rounded-full border-2 border-white/50" />
                 <div>
                   <div className="font-bold">Sinta L.</div>
                   <div className="text-xs opacity-80">WhatsApp • Kemarin</div>
                 </div>
               </div>
            </div>

            <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-lg transform md:rotate-1 hover:rotate-0 transition-transform">
               <div className="flex text-yellow-400 mb-4">
                 {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
               </div>
               <p className="font-medium text-gray-800 text-lg mb-6 leading-relaxed">
                 "Dia terpaksa <strong className="text-[#E11D48]">minggirin mobil</strong> — katanya burem kena air mata. 15 tahun nikah, akhirnya bisa bikin dia nangis juga 😂"
               </p>
               <div className="flex items-center gap-3">
                 <img src="https://randomuser.me/api/portraits/women/12.jpg" className="w-10 h-10 rounded-full border-2 border-gray-100" />
                 <div>
                   <div className="font-bold text-gray-900">Ema T.</div>
                   <div className="text-xs text-gray-500">Surabaya • Jan 2025</div>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section aria-labelledby="how-it-works-title" className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-[#E11D48] text-sm font-bold uppercase tracking-wider">Proses Mudah</h2>
            <h2 id="how-it-works-title" className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">Tiga langkah menuju <span className="text-[#E11D48] italic">tangis bahagia</span></h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, icon: '✍️', title: 'Ceritakan kisahmu', desc: 'Beritahu kami namanya, kenangan kalian, dan hal-hal lucu.' },
              { step: 2, icon: '🎵', title: 'Kami buatkan', desc: 'Namanya ditenun menjadi lirik & musik profesional oleh komposer kami.' },
              { step: 3, icon: '😭', title: 'Lihat dia terharu', desc: 'Dikirim dalam 24 jam via WhatsApp. Dia akan menyimpannya selamanya.' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center gap-4 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-3xl font-bold text-rose-500 shadow-sm">
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
            <Button asChild size="lg" className="h-14 px-10 rounded-full bg-[#E11D48] text-lg font-bold shadow-xl shadow-rose-200 hover:bg-rose-700">
               <Link to="/config">Buat Lagunya — GRATIS</Link>
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
                 <span className="flex items-center gap-1"><Check className="h-4 w-4" /> Pengiriman 24 jam</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-title" className="space-y-10 max-w-3xl mx-auto pb-8">
          <h2 id="faq-title" className="text-center font-serif text-3xl font-bold text-gray-900">Pertanyaan <span className="text-[#E11D48] italic">Cepat</span></h2>
          <div className="space-y-4">
             {FAQ_ITEMS.map((faq, i) => (
               <div key={i} className="group rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-md transition-all cursor-default">
                 <h3 className="font-bold text-gray-900 text-lg mb-2 flex justify-between items-center">
                   {faq.q}
                   <span className="text-rose-200 group-hover:text-rose-500 transition-colors text-2xl">↓</span>
                 </h3>
                 <p className="text-gray-600 leading-relaxed">{faq.a}</p>
               </div>
             ))}
          </div>
        </section>

        {/* FOOTER CTA */}
        <section className="text-center space-y-6 pb-12">
           <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">Jangan biarkan Valentine berlalu</h2>
           <p className="text-gray-600 text-base sm:text-lg">Beri dia hadiah yang tak akan pernah dia lupakan. Gabung <strong>2,847 wanita</strong> yang membuat pasangannya menangis terharu.</p>
           
           <div className="pt-4">
             <Button asChild size="lg" className="h-16 px-12 rounded-full bg-[#E11D48] text-xl font-bold shadow-2xl shadow-rose-300 hover:bg-rose-700 hover:scale-105 transition-all">
               <Link to="/config">
                 Buat Lagunya — GRATIS
                 <span className="ml-2 text-sm font-normal line-through opacity-70">Rp 497.000</span>
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
      <footer className="border-t border-gray-100 bg-white py-12 text-center text-sm text-gray-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 font-serif text-xl font-bold text-gray-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400">L</div>
            Laguin.id
          </div>
          <p>Membuat pria menangis sejak 2024 💕</p>
          <div className="flex gap-6 pt-4">
            <a href="#" className="hover:text-gray-600">Privasi</a>
            <a href="#" className="hover:text-gray-600">Ketentuan</a>
            <a href="#" className="hover:text-gray-600">Kontak</a>
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
             <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-green-500" /> 24 jam</span>
             <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-500" /> Garansi</span>
           </div>
           <Button asChild size="lg" className="w-full h-14 rounded-xl bg-[#E11D48] text-lg font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all">
            <Link to="/config">
              Buat Lagunya — GRATIS
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white hover:bg-white/30 text-xs">
                (11 sisa)
              </Badge>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
