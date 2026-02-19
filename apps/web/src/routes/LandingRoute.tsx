import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Star,
  Play,
  Check,
  ShieldCheck,
  Zap,
} from 'lucide-react'

import { apiGet, apiPost } from '@/lib/http'
import { useThemeSlug } from '@/features/theme/ThemeContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ActivityToast, type ActivityToastConfig } from '@/components/activity-toast/ActivityToast'
import { HeroPlayerInline } from './HeroPlayerInline.tsx'
import { CountdownTimer } from '@/components/landing/CountdownTimer'
import type { TrackItem } from '@/components/landing/AudioSamplesSection'

const AudioSamplesSection = lazy(() => import('@/components/landing/AudioSamplesSection').then(m => ({ default: m.AudioSamplesSection })))
const StatsBar = lazy(() => import('@/components/landing/StatsBar').then(m => ({ default: m.StatsBar })))
const ComparisonSection = lazy(() => import('@/components/landing/ComparisonSection').then(m => ({ default: m.ComparisonSection })))
const ReviewsSection = lazy(() => import('@/components/landing/ReviewsSection').then(m => ({ default: m.ReviewsSection })))
const HowItWorksSection = lazy(() => import('@/components/landing/HowItWorksSection').then(m => ({ default: m.HowItWorksSection })))
const GuaranteeSection = lazy(() => import('@/components/landing/GuaranteeSection').then(m => ({ default: m.GuaranteeSection })))
const FaqSection = lazy(() => import('@/components/landing/FaqSection').then(m => ({ default: m.FaqSection })))
const FooterCtaSection = lazy(() => import('@/components/landing/FooterCtaSection').then(m => ({ default: m.FooterCtaSection })))
const LandingFooter = lazy(() => import('@/components/landing/LandingFooter').then(m => ({ default: m.LandingFooter })))

function sanitizeHtml(html: string): string {
  return html.replace(/<\/?(?!strong|em|br\s*\/?)([a-z][a-z0-9]*)\b[^>]*>/gi, '')
}

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
    evergreenCycleHours?: number
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
      setShowMobileCta(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
  const promoEvergreenEnabled = promoBanner.evergreenEnabled ?? false
  const promoEvergreenCycleHours = promoBanner.evergreenCycleHours ?? 24
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

  const toastConfig = (site.activityToast && typeof site.activityToast === 'object'
    ? site.activityToast
    : defaultPublicSiteConfig.activityToast) as ActivityToastConfig

  const sectionFallback = null

  return (
    <div className="min-h-screen bg-[var(--theme-accent-soft)] font-sans pb-32 overflow-x-hidden" style={themeStyle}>
      <ActivityToast config={toastConfig} />

      {/* Sticky Top Banner */}
      <div className="sticky top-0 z-50">
        {promoBannerEnabled && (
          <CountdownTimer paymentAmount={paymentAmount} originalAmount={originalAmount} countdownLabel={promoCountdownLabel} countdownTargetDate={promoCountdownTargetDate} evergreenEnabled={promoEvergreenEnabled} evergreenCycleHours={promoEvergreenCycleHours} />
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
          <div className="text-center md:text-left space-y-3 md:space-y-6 md:col-start-1 md:row-start-1">
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

            <h1 id="hero-title" className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              <span className="text-gray-900">{heroHeadlineLine1}</span>
              <br className="hidden sm:inline" /> <span className="text-[var(--theme-accent)]">{heroHeadlineLine2}</span>
            </h1>

            <p className="text-sm sm:text-lg text-gray-600 leading-normal max-w-lg mx-auto md:mx-0" dangerouslySetInnerHTML={{ __html: sanitizeHtml(heroSubtext) }} />
          </div>

          <div className="relative mx-auto w-full max-w-full sm:max-w-md md:max-w-full min-w-0 md:col-start-2 md:row-start-1 md:row-span-2">
             <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl">
               <div className="absolute inset-0 bg-gray-900/10 z-10"></div>
               {heroVideoUrl ? (
                 <video
                   className="h-full w-full object-cover"
                   src={heroVideoUrl}
                   autoPlay
                   muted
                   loop
                   playsInline
                   preload="metadata"
                   poster={heroImageUrl}
                 />
               ) : (
                 <img
                   src={heroImageUrl}
                   alt="Pasangan merayakan Valentine - Lagu personal Laguin.id dengan nama di lirik, hadiah yang tak terlupakan"
                   className="h-full w-full object-cover"
                   loading="eager"
                   fetchPriority="high"
                   decoding="async"
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

          <div className="text-center md:text-left space-y-4 md:space-y-6 md:col-start-1 md:row-start-2">
            <div className="flex flex-wrap justify-center md:justify-start gap-x-3 gap-y-1 text-[10px] sm:text-sm font-medium text-gray-500">
              {heroCheckmarks.map((text, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-600" />
                  {text}
                </span>
              ))}
            </div>

            <div className="space-y-2">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-8 rounded-full bg-[var(--theme-accent)] text-base sm:text-lg font-bold shadow-lg shadow-[var(--theme-accent-soft)] hover:opacity-90 hover:scale-105 transition-all duration-300">
                <Link to={themeSlug ? `/${themeSlug}/config` : '/config'} className="flex items-center justify-center gap-2">
                  Buat Lagu — {fmtCurrency(paymentAmount)}
                  <span className="text-[var(--theme-accent-soft)] line-through font-normal text-sm sm:text-base ml-1">{fmtCurrency(originalAmount)}</span>
                </Link>
              </Button>
              
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

        <Suspense fallback={sectionFallback}>
          <AudioSamplesSection
            allTracks={allTracks}
            selectedTrackIndex={selectedTrackIndex}
            setSelectedTrackIndex={setSelectedTrackIndex}
            autoPlayOnSelect={autoPlayOnSelect}
            setAutoPlayOnSelect={setAutoPlayOnSelect}
            heroVerifiedBadgeText={heroVerifiedBadgeText}
            fmtCurrency={fmtCurrency}
            paymentAmount={paymentAmount}
            originalAmount={originalAmount}
            themeSlug={themeSlug}
          />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <StatsBar items={statsItems} />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <ComparisonSection
            fmtCurrency={fmtCurrency}
            paymentAmount={paymentAmount}
            originalAmount={originalAmount}
            deliveryEtaSentence={deliveryEta.sentenceLower}
          />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <ReviewsSection
            sectionLabel={reviewSectionLabel}
            sectionHeadline={reviewSectionHeadline}
            sectionSubtext={reviewSectionSubtext}
            items={reviewItems}
          />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <HowItWorksSection
            deliveryEtaSentence={deliveryEta.sentenceLower}
            fmtCurrency={fmtCurrency}
            paymentAmount={paymentAmount}
            originalAmount={originalAmount}
            themeSlug={themeSlug}
          />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <GuaranteeSection deliveryEtaShort={deliveryEta.short} />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <FaqSection items={faqItems} />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <FooterCtaSection
            headline={footerCtaHeadline}
            subtitle={footerCtaSubtitle}
            fmtCurrency={fmtCurrency}
            paymentAmount={paymentAmount}
            originalAmount={originalAmount}
            themeSlug={themeSlug}
          />
        </Suspense>
      </main>

      <Suspense fallback={sectionFallback}>
        <LandingFooter
          logoUrl={logoUrl}
          themeSlug={themeSlug}
          activeThemes={activeThemes}
        />
      </Suspense>

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
