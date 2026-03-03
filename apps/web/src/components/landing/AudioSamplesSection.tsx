import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Star, Play, Pause, Check, Music, SkipBack, SkipForward, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LANDING_AUDIO_EVENT = 'landing-audio-playing'
const SOURCE_SAMPLES = 'samples'
const SOURCE_HERO = 'hero'

function parseHighlightName(title: string) {
  const m = title.match(/^(Untuk\s+)(\S+)(.*)/i)
  if (!m) return null
  return { before: m[1] + ' ', name: m[2], after: m[3] || '' }
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

export type TrackItem = {
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

function sanitizeHtml(html: string): string {
  return html.replace(/<\/?(?!strong|em|br\s*\/?)(?!span\b)([a-z][a-z0-9]*)\b[^>]*>/gi, '')
}

type Props = {
  allTracks: TrackItem[]
  selectedTrackIndex: number
  setSelectedTrackIndex: (i: number) => void
  autoPlayOnSelect: boolean
  setAutoPlayOnSelect: (v: boolean) => void
  heroVerifiedBadgeText: string
  fmtCurrency: (v: number | null | undefined) => string
  paymentAmount: number | null
  originalAmount: number | null
  showPriceInButton?: boolean
  themeSlug: string | null
  sectionBadge?: string
  sectionHeadline?: string
  sectionSubtext?: string
  otherLabel?: string
  ctaLine?: string
}

export function AudioSamplesSection({
  allTracks,
  selectedTrackIndex,
  setSelectedTrackIndex,
  autoPlayOnSelect,
  setAutoPlayOnSelect,
  heroVerifiedBadgeText,
  fmtCurrency,
  paymentAmount,
  originalAmount,
  showPriceInButton = true,
  themeSlug,
  sectionBadge = 'Tekan Putar',
  sectionHeadline = 'Dengar <span class="text-[var(--theme-accent)] italic">namanya</span> di lagu asli',
  sectionSubtext = 'Lagu asli yang kami buat. Nama asli. Air mata asli.',
  otherLabel = 'Contoh Lainnya',
  ctaLine = 'Bayangkan mendengar <span class="text-[var(--theme-accent)] font-medium italic">namanya</span> di lagu seperti ini...',
}: Props) {
  const currentTrack = allTracks[selectedTrackIndex] ?? allTracks[0]

  return (
    <section aria-labelledby="audio-samples-title" className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-accent-soft)] bg-[var(--theme-accent-soft)] px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-[var(--theme-accent)]">
          <Play className="h-3.5 w-3.5" fill="currentColor" />
          {sectionBadge}
        </div>
        <h2 id="audio-samples-title" className="font-serif text-3xl sm:text-4xl font-bold text-gray-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(sectionHeadline) }} />
        <p className="text-gray-500">{sectionSubtext}</p>
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

        <div className="mt-10 pt-8 border-t border-gray-100">
          <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider mb-6">
            {otherLabel}
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
          <p className="text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ctaLine) }} />
          <Button asChild size="lg" className="h-12 px-8 rounded-xl bg-[var(--theme-accent)] font-bold shadow-lg shadow-[var(--theme-accent-soft)] hover:opacity-90">
            <Link to={themeSlug ? `/${themeSlug}/config` : '/config'} className="flex items-center gap-2">
              <span>Buat Lagunya{showPriceInButton ? ` — ${fmtCurrency(paymentAmount)}` : ''}</span>
              {showPriceInButton && <span className="text-xs font-normal line-through opacity-70 decoration-white/50">{fmtCurrency(originalAmount)}</span>}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
