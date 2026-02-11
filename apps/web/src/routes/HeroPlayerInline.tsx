import { useEffect, useRef, useState } from 'react'

const LANDING_AUDIO_EVENT = 'landing-audio-playing'
const SOURCE_HERO = 'hero'
const SOURCE_SAMPLES = 'samples'

type Props = {
  onClose: () => void
  videoUrl: string | null
  imageUrl: string
  audioUrl: string | null
  playingBadgeText: string
  cornerBadgeText: string
  verifiedBadgeText: string
  quote: string
  authorName: string
  authorSubline: string
  authorAvatarUrl: string | null
}

export function HeroPlayerInline({
  onClose,
  videoUrl,
  imageUrl,
  audioUrl,
  playingBadgeText,
  cornerBadgeText,
  verifiedBadgeText,
  quote,
  authorName,
  authorSubline,
  authorAvatarUrl,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const closeAndStop = () => {
    const a = audioRef.current
    if (a) a.pause()
    setPlaying(false)
    onClose()
  }

  useEffect(() => {
    // best-effort autoplay after user-initiated click opened the player
    if (!audioUrl) return
    const a = audioRef.current
    if (!a) return
    a.currentTime = 0
    a.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false))
  }, [audioUrl])

  // Pause when samples player starts (only one audio at a time)
  useEffect(() => {
    const handler = (e: CustomEvent<{ source: string }>) => {
      if (e.detail?.source === SOURCE_SAMPLES) {
        const a = audioRef.current
        if (a) a.pause()
        setPlaying(false)
      }
    }
    window.addEventListener(LANDING_AUDIO_EVENT, handler as EventListener)
    return () => window.removeEventListener(LANDING_AUDIO_EVENT, handler as EventListener)
  }, [])

  const dispatchPlaying = () => {
    window.dispatchEvent(new CustomEvent(LANDING_AUDIO_EVENT, { detail: { source: SOURCE_HERO } }))
  }

  return (
    <div className="relative h-full w-full">
      {/* Media layer */}
      <div className="absolute inset-0">
        {videoUrl ? (
          <video className="h-full w-full object-cover" src={videoUrl} autoPlay muted loop playsInline />
        ) : (
          <img className="h-full w-full object-cover" src={imageUrl} alt="Hero media" />
        )}
      </div>

      {/* Overlay: klik area video = pause/play lagu; tutup pakai tombol × */}
      <div className="absolute inset-0">
        <button
          type="button"
          aria-label={playing ? 'Jeda lagu' : 'Putar lagu'}
          onClick={() => {
            if (!audioUrl) return
            const a = audioRef.current
            if (!a) return
            if (playing) {
              a.pause()
              setPlaying(false)
            } else {
              a.play()
                .then(() => setPlaying(true))
                .catch(() => setPlaying(false))
            }
          }}
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
        />

        {/* Playing badge (toggle pause/play) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
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
          className="absolute left-3 top-3 sm:left-4 sm:top-4 rounded-full bg-emerald-500/90 px-3 py-1.5 sm:px-4 sm:py-2 text-white text-xs sm:text-sm font-semibold backdrop-blur"
        >
          {playing ? '▮▮ ' : '▶ '} {playingBadgeText}
        </button>

        {/* Corner badge */}
        <div className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full bg-rose-500/90 px-3 py-1.5 sm:px-4 sm:py-2 text-white text-xs sm:text-sm font-semibold backdrop-blur">
          {cornerBadgeText}
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            closeAndStop()
          }}
          className="absolute right-3 bottom-3 sm:right-4 sm:bottom-4 rounded-full bg-white/20 text-white h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center backdrop-blur hover:bg-white/30"
          aria-label="Tutup pemutar"
        >
          ×
        </button>

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <div className="flex items-end justify-between gap-4 sm:gap-6">
            <div className="max-w-[75%] sm:max-w-[70%] text-white">
              <div className="font-serif italic text-xl sm:text-3xl leading-tight">“{quote}”</div>
              <div className="mt-2 sm:mt-4 flex items-center gap-2 sm:gap-3">
                {authorAvatarUrl ? (
                  <img src={authorAvatarUrl} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-white/60" />
                ) : (
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/20 border border-white/60" />
                )}
                <div>
                  <div className="font-bold text-sm sm:text-base">{authorName}</div>
                  {authorSubline ? <div className="text-white/75 text-xs sm:text-sm">{authorSubline}</div> : null}
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <div className="rounded-xl bg-white/90 px-3 py-1.5 sm:px-4 sm:py-2 text-emerald-700 text-xs sm:text-sm font-semibold">
                ✓ <span className="hidden sm:inline">{verifiedBadgeText}</span><span className="sm:hidden">Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {audioUrl ? (
        <audio
          ref={(el) => {
            audioRef.current = el
          }}
          src={audioUrl}
          preload="auto"
          loop
          onPlay={dispatchPlaying}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
        />
      ) : null}
    </div>
  )
}

