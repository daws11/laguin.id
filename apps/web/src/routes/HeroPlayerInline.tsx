import { useEffect, useRef, useState } from 'react'

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

      {/* Overlay */}
      <div className="absolute inset-0">
        <button
          type="button"
          aria-label="Close and stop"
          onClick={closeAndStop}
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
        />

        {/* Playing badge (toggle pause/play) */}
        <button
          type="button"
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
          className="absolute left-4 top-4 rounded-full bg-emerald-500/90 px-4 py-2 text-white text-sm font-semibold backdrop-blur"
        >
          {playing ? '▮▮ ' : '▶ '} {playingBadgeText}
        </button>

        {/* Corner badge */}
        <div className="absolute right-4 top-4 rounded-full bg-rose-500/90 px-4 py-2 text-white text-sm font-semibold backdrop-blur">
          {cornerBadgeText}
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={closeAndStop}
          className="absolute right-4 bottom-4 rounded-full bg-white/20 text-white h-10 w-10 flex items-center justify-center backdrop-blur hover:bg-white/30"
          aria-label="Close"
        >
          ×
        </button>

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <div className="flex items-end justify-between gap-6">
            <div className="max-w-[70%] text-white">
              <div className="font-serif italic text-3xl leading-tight">“{quote}”</div>
              <div className="mt-4 flex items-center gap-3">
                {authorAvatarUrl ? (
                  <img src={authorAvatarUrl} className="h-10 w-10 rounded-full border border-white/60" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-white/20 border border-white/60" />
                )}
                <div>
                  <div className="font-bold">{authorName}</div>
                  {authorSubline ? <div className="text-white/75 text-sm">{authorSubline}</div> : null}
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <div className="rounded-xl bg-white/90 px-4 py-2 text-emerald-700 text-sm font-semibold">
                ✓ {verifiedBadgeText}
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
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
        />
      ) : null}
    </div>
  )
}

