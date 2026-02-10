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
  // Mocked time: "29d 14h 32m 45s" style from screenshot, dynamic for feel
  const [time, setTime] = useState({ d: 6, h: 14, m: 32, s: 45 })

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => {
        let { d, h, m, s } = prev
        if (s > 0) s--
        else {
          s = 59
          if (m > 0) m--
          else {
            m = 59
            if (h > 0) h--
            else {
              h = 23
              if (d > 0) d--
            }
          }
        }
        return { d, h, m, s }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-[#E11D48] px-4 py-2 text-center text-xs font-bold text-white uppercase tracking-wide">
      💝 Valentine's dalam {time.d}h {time.h}j {time.m}m {time.s}d lagi •{' '}
      <span className="line-through opacity-70">Rp 200.000</span> <span className="text-white">GRATIS</span> (100 orang pertama)
    </div>
  )
}

function AudioPlayerCard({
  name,
  quote,
  metaText,
  audioUrl,
  time = '3:24',
}: {
  name: string
  quote: string
  metaText?: string | null
  audioUrl?: string | null
  time?: string
}) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [posSec, setPosSec] = useState(0)
  const [durSec, setDurSec] = useState<number | null>(null)

  useEffect(() => {
    setPlaying(false)
    setPosSec(0)
    setDurSec(null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [audioUrl])

  const progressPct = useMemo(() => {
    const dur = durSec && durSec > 0 ? durSec : null
    if (!dur) return playing ? 50 : 10
    return Math.min(100, Math.max(0, (posSec / dur) * 100))
  }, [durSec, posSec, playing])

  function fmt(sec: number) {
    const s = Math.max(0, Math.floor(sec))
    const mm = String(Math.floor(s / 60)).padStart(1, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-white p-4 shadow-sm border border-gray-100">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <Music className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-rose-500">Sedang Diputar</div>
            <div className="text-sm font-bold text-gray-900">"{quote}"</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (!audioUrl) return
            const a = audioRef.current
            if (!a) return
            if (playing) {
              a.pause()
              setPlaying(false)
              return
            }
            a.play()
              .then(() => setPlaying(true))
              .catch(() => setPlaying(false))
          }}
          disabled={!audioUrl}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E11D48] text-white transition-transform active:scale-95"
        >
          {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
        </button>
        <div className="flex-1 space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn("h-full bg-[#E11D48] transition-all duration-300")}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-medium">
            <span>{fmt(posSec)}</span>
            <span>{durSec ? fmt(durSec) : time}</span>
          </div>
        </div>
      </div>

      {audioUrl ? (
        <audio
          ref={(el) => {
            audioRef.current = el
          }}
          src={audioUrl}
          preload="metadata"
          loop
          onTimeUpdate={(e) => {
            const a = e.currentTarget
            setPosSec(a.currentTime || 0)
          }}
          onLoadedMetadata={(e) => {
            const a = e.currentTarget
            const d = Number.isFinite(a.duration) ? a.duration : null
            setDurSec(d && d > 0 ? d : null)
          }}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          className="hidden"
        />
      ) : (
        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          Upload lagu dulu di Admin agar bisa diputar.
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-gray-50 pt-3">
        <div className="text-xs">
          <span className="font-bold block">{name}</span>
          {metaText ? <span className="text-gray-500 text-[10px]">{metaText}</span> : null}
        </div>
        <div className="ml-auto flex text-yellow-400">
          <Star className="h-3 w-3 fill-current" />
          <Star className="h-3 w-3 fill-current" />
          <Star className="h-3 w-3 fill-current" />
          <Star className="h-3 w-3 fill-current" />
          <Star className="h-3 w-3 fill-current" />
        </div>
      </div>
    </div>
  )
}

// --- Main Page ---

export function LandingRoute() {
  const [publicSiteConfig, setPublicSiteConfig] = useState<PublicSiteConfig | null>(null)
  const [heroOpen, setHeroOpen] = useState(false)
  const [playlistPlayingIndex, setPlaylistPlayingIndex] = useState<number | null>(null)
  const playlistAudioRef = useRef<HTMLAudioElement | null>(null)

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

  const playlistAudioUrl =
    playlistPlayingIndex !== null &&
    playlistPlayingIndex >= 0 &&
    playlistPlayingIndex < playlist.length &&
    typeof (playlist[playlistPlayingIndex] as any)?.audioUrl === 'string' &&
    String((playlist[playlistPlayingIndex] as any).audioUrl).trim()
      ? resolveAsset(String((playlist[playlistPlayingIndex] as any).audioUrl).trim())
      : null

  const toastConfig = (site.activityToast && typeof site.activityToast === 'object'
    ? site.activityToast
    : defaultPublicSiteConfig.activityToast) as ActivityToastConfig

  return (
    <div className="min-h-screen bg-[#FFF5F7] font-sans pb-32">
      <ActivityToast config={toastConfig} />

      {/* Sticky Top Banner */}
      <div className="sticky top-0 z-50">
        <CountdownTimer />
        <div className="border-b border-rose-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2 font-serif text-xl font-bold text-[#E11D48]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E11D48] text-white">
                L
              </div>
              Laguin.id
            </div>
            <div className="text-right flex items-center gap-3">
              <div className="hidden md:block text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                💝 Spesial Valentine
              </div>
              <div>
                <span className="text-xs text-gray-400 line-through">Rp 200.000</span>{' '}
                <span className="text-lg font-bold text-[#E11D48]">GRATIS</span>
                <Badge variant="destructive" className="ml-1 h-5 px-1 py-0 text-[10px]">
                  11 kuota gratis tersisa!
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 pt-12 space-y-20">
        {/* HERO SECTION */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left space-y-8">
            <div className="flex justify-center md:justify-start gap-1 text-yellow-400 mb-2">
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
              <span className="ml-2 text-sm font-bold text-gray-900">2,847 pria menangis terharu</span>
            </div>
            
            <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight text-gray-900 tracking-tight">
              Valentine kali ini, <br />
              <span className="text-[#E11D48]">buat dia menangis bahagia.</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-lg mx-auto md:mx-0">
              Sebuah <strong className="text-gray-900">lagu</strong> personal dengan{' '}
              <strong className="text-gray-900">namanya</strong> di dalam lirik. Kualitas studio. Dikirim dalam 24 jam.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button asChild size="lg" className="h-14 px-8 rounded-full bg-[#E11D48] text-lg font-bold shadow-xl shadow-rose-200 hover:bg-rose-700 hover:scale-105 transition-all duration-300">
                <Link to="/config">
                  Buat Lagunya — GRATIS
                  <span className="ml-2 text-sm font-normal line-through opacity-70">Rp 200.000</span>
                </Link>
              </Button>
            </div>

            <div className="flex justify-center md:justify-start gap-6 text-xs font-bold text-gray-500 uppercase tracking-wide">
              <span className="flex items-center gap-1"><Zap className="h-4 w-4 text-green-500" /> Pengiriman 24 jam</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-green-500" /> Garansi Uang Kembali</span>
              <span className="flex items-center gap-1 text-[#E11D48]">11 kuota gratis tersisa!</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md md:max-w-full">
             <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-2xl">
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
                   alt="Couple kissing"
                   className="h-full w-full object-cover"
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
                   <div className="font-serif italic text-2xl">"{overlayQuote}"</div>
                   <div className="mt-2 text-sm font-medium opacity-90 flex items-center gap-2">
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
        <section className="space-y-8 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <div className="text-[#E11D48] text-sm font-bold uppercase tracking-wider">Contoh Nyata</div>
            <h2 className="font-serif text-4xl font-bold text-gray-900">Dengar <span className="text-[#E11D48] italic">namanya</span> di lagu asli</h2>
            <p className="text-gray-500">Lagu asli yang kami buat. Nama asli. Air mata asli.</p>
          </div>

          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-rose-100/50">
             <AudioPlayerCard 
               name={nowPlayingName}
               quote={nowPlayingQuote}
               metaText={nowPlayingMetaText}
               audioUrl={nowPlayingAudioUrl}
               time={nowPlayingTime}
             />
             <div className="mt-8 space-y-4">
               {playlist.map((track, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const urlRaw = (track as any)?.audioUrl
                    const url = typeof urlRaw === 'string' && urlRaw.trim() ? resolveAsset(urlRaw.trim()) : null
                    if (!url) return

                    const a = playlistAudioRef.current
                    if (!a) {
                      setPlaylistPlayingIndex(i)
                      return
                    }

                    if (playlistPlayingIndex === i && !a.paused) {
                      a.pause()
                      setPlaylistPlayingIndex(null)
                      return
                    }

                    // switch track and play
                    setPlaylistPlayingIndex(i)
                    // play will be handled by effect below after src updates
                  }}
                  className={cn(
                    'flex w-full items-center gap-4 p-4 rounded-xl transition-colors group text-left',
                    (track as any)?.audioUrl ? 'hover:bg-rose-50 cursor-pointer' : 'opacity-60 cursor-not-allowed',
                  )}
                  disabled={!(typeof (track as any)?.audioUrl === 'string' && String((track as any).audioUrl).trim())}
                >
                  <div className="h-10 w-10 rounded-full bg-rose-100 text-[#E11D48] flex items-center justify-center group-hover:bg-[#E11D48] group-hover:text-white transition-colors">
                    {playlistPlayingIndex === i ? (
                      <Pause className="h-5 w-5" fill="currentColor" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
                    )}
                  </div>
                   <div className="flex-1">
                     <div className="font-bold text-gray-900">{track.title}</div>
                     <div className="text-xs text-gray-500">{track.subtitle}</div>
                   </div>
                   <div className="text-xs font-bold text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                     {track.ctaLabel ?? 'PUTAR'}
                   </div>
                </button>
               ))}
             </div>
             {playlistAudioUrl ? (
               <audio
                 ref={(el) => {
                   playlistAudioRef.current = el
                 }}
                 src={playlistAudioUrl}
                 preload="metadata"
                 loop
                 onPause={() => setPlaylistPlayingIndex(null)}
                 className="hidden"
                 autoPlay
               />
             ) : null}
             
             <div className="mt-8 text-center">
               <Button asChild size="lg" className="h-12 rounded-full bg-[#E11D48] font-bold shadow-lg shadow-rose-200 hover:bg-rose-700">
                 <Link to="/config">Buat Lagunya Sekarang</Link>
               </Button>
             </div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className="py-8 border-y border-rose-100 bg-white/50 backdrop-blur-sm">
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
        <section className="space-y-10 text-center max-w-5xl mx-auto">
          <div className="space-y-2">
            <h2 className="font-serif text-4xl font-bold text-gray-900">
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
                   <div className="text-[#E11D48] font-bold text-3xl">GRATIS <span className="text-gray-300 line-through text-lg font-normal">Rp 200.000</span></div>
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
            <h2 className="font-serif text-4xl font-bold text-gray-900">"Dia <span className="text-[#E11D48] italic">tidak pernah</span> menangis"</h2>
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
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-[#E11D48] text-sm font-bold uppercase tracking-wider">Proses Mudah</h2>
            <h2 className="font-serif text-4xl font-bold text-gray-900">Tiga langkah menuju <span className="text-[#E11D48] italic">tangis bahagia</span></h2>
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
        <section className="space-y-10 max-w-3xl mx-auto pb-8">
          <h2 className="text-center font-serif text-3xl font-bold text-gray-900">Pertanyaan <span className="text-[#E11D48] italic">Cepat</span></h2>
          <div className="space-y-4">
             {[
               { q: "Dia bukan tipe yang emosional...", a: "Itu yang MEREKA SEMUA katakan! 98% menangis — mantan militer, ayah yang kaku, pacar 'aku gak main perasaan'. Semakin tangguh mereka, semakin dalam jatuhnya. 😉" },
               { q: "Bagaimana dia menerima lagunya?", a: "Kamu menerima link download via email. Putar untuknya secara langsung, kirim via WhatsApp, atau jadikan kejutan! Ini file MP3 yang bisa diputar di mana saja." },
               { q: "Berapa lama prosesnya?", a: "Dalam 24 jam! Biasanya lebih cepat. Kamu akan dapat notifikasi email saat sudah siap." },
               { q: "Kalau aku gak suka gimana?", a: "Revisi gratis tanpa batas sampai kamu suka. Masih gak puas? Refund penuh, tanpa tanya-tanya. 💕" },
               { q: "Benarkah GRATIS?", a: "Ya! Spesial untuk 100 orang pertama (normalnya Rp 200.000). Tanpa biaya tersembunyi. Satu kesempatan, hadiah tak terlupakan." },
             ].map((faq, i) => (
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
           <h2 className="font-serif text-4xl font-bold text-gray-900">Jangan biarkan Valentine berlalu</h2>
           <p className="text-gray-600 text-lg">Beri dia hadiah yang tak akan pernah dia lupakan. Gabung <strong>2,847 wanita</strong> yang membuat pasangannya menangis terharu.</p>
           
           <div className="pt-4">
             <Button asChild size="lg" className="h-16 px-12 rounded-full bg-[#E11D48] text-xl font-bold shadow-2xl shadow-rose-300 hover:bg-rose-700 hover:scale-105 transition-all">
               <Link to="/config">
                 Buat Lagunya — GRATIS
                 <span className="ml-2 text-sm font-normal line-through opacity-70">Rp 200.000</span>
               </Link>
             </Button>
           </div>
           
           <div className="flex justify-center gap-6 text-xs font-bold text-gray-400 uppercase tracking-wide pt-4">
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
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white border-t border-gray-100 p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
