import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Music, Download, FileText, Loader2, ShieldCheck, Phone,
  RefreshCw, Video, CheckCircle, ChevronDown, ChevronUp, Upload,
} from 'lucide-react'

type DeliveryConfig = {
  pageTitle?: string
  headerText?: string
  phonePromptText?: string
  processingMessage?: string
  downloadButtonText?: string
  lyricsButtonText?: string
  successMessage?: string
  accentColor?: string
  logoUrl?: string
  trackSubtitleText?: string
  unlockButtonText?: string
  // Revision section
  revisionSectionTitle?: string
  revisionSectionDescription?: string
  revisionTabDescribe?: string
  revisionTabLyrics?: string
  revisionTabNewStory?: string
  revisionSubmitButtonText?: string
  revisionUsedTitle?: string
  revisionUsedMessage?: string
  // Voice labels for revision form
  voiceKeepLabel?: string
  voiceFemaleLabel?: string
  voiceMaleLabel?: string
  // Testimonial section
  testimonialSectionTitle?: string
  testimonialSectionDescription?: string
  testimonialUploadButtonText?: string
  testimonialSuccessTitle?: string
  testimonialSuccessMessage?: string
  testimonialApprovedMessage?: string
}

type OrderStatus = {
  id: string
  status: string
  recipientName: string
  createdAt: string
  config: DeliveryConfig
}

type UnlockedOrder = {
  id: string
  status: string
  recipientName: string
  createdAt: string
  tracks: string[]
  lyricsText: string | null
  regenerationCount: number
  maxRegenerations: number
  hasTestimonial: boolean
  testimonialStatus: string | null
}

type RevisionType = 'describe' | 'lyrics' | 'new_story'

function RevisionSection({
  order,
  accent,
  phone,
  cfg,
  onRegenerated,
}: {
  order: UnlockedOrder
  accent: string
  phone: string
  cfg: DeliveryConfig
  onRegenerated: () => void
}) {
  const [revisionType, setRevisionType] = useState<RevisionType>('describe')
  const [description, setDescription] = useState('')
  const [newLyrics, setNewLyrics] = useState(order.lyricsText ?? '')
  const [musicStyle, setMusicStyle] = useState('keep')
  const [voiceStyle, setVoiceStyle] = useState('keep')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const revisionsLeft = order.maxRegenerations - order.regenerationCount
  const canRevise = revisionsLeft > 0 && order.status === 'completed'

  if (!canRevise) {
    if (order.regenerationCount >= order.maxRegenerations) {
      return (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-gray-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{cfg.revisionUsedTitle || 'Revisions Used'}</h3>
              <p className="text-xs text-gray-500">{cfg.revisionUsedMessage || `You've used all ${order.maxRegenerations} available revisions.`}</p>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/order/${encodeURIComponent(order.id)}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          revisionType,
          description: revisionType === 'describe' ? description : undefined,
          newLyrics: revisionType === 'lyrics' ? newLyrics : undefined,
          musicStyle: musicStyle !== 'keep' ? musicStyle : undefined,
          voiceStyle: voiceStyle !== 'keep' ? voiceStyle : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error === 'max_regenerations_reached' ? 'No revisions remaining.' : 'Something went wrong. Please try again.')
        return
      }
      onRegenerated()
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const tabs: { key: RevisionType; label: string }[] = [
    { key: 'describe', label: cfg.revisionTabDescribe || 'Describe changes' },
    { key: 'lyrics', label: cfg.revisionTabLyrics || 'Edit lyrics' },
    { key: 'new_story', label: cfg.revisionTabNewStory || 'New story' },
  ]

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" style={{ color: accent }} />
          <h3 className="text-sm font-semibold text-gray-900">{cfg.revisionSectionTitle || 'Want to make changes?'}</h3>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {revisionsLeft} revision{revisionsLeft !== 1 ? 's' : ''} left
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        {cfg.revisionSectionDescription || "Tell us what you'd like to change and we'll create a new version of your song. You can also change the music style or voice."}
      </p>

      <div className="flex gap-1 mb-4 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setRevisionType(t.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
              revisionType === t.key
                ? 'border-current text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={revisionType === t.key ? { borderColor: accent } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {revisionType === 'describe' && (
        <div className="space-y-2 mb-4">
          <label className="text-xs text-gray-500">Just tell us what to change — we'll handle the rest.</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={"Examples:\n- Change the name from John to Jonathan\n- Make the chorus more joyful\n- Add a mention of our trip to Paris"}
            className="w-full rounded-lg border bg-gray-50 p-3 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': accent + '60' } as React.CSSProperties}
          />
        </div>
      )}

      {revisionType === 'lyrics' && (
        <div className="space-y-2 mb-4">
          <label className="text-xs text-gray-500">Edit the lyrics directly below.</label>
          <textarea
            value={newLyrics}
            onChange={(e) => setNewLyrics(e.target.value)}
            className="w-full rounded-lg border bg-gray-50 p-3 text-sm min-h-[200px] resize-y font-mono focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': accent + '60' } as React.CSSProperties}
          />
        </div>
      )}

      {revisionType === 'new_story' && (
        <div className="space-y-2 mb-4">
          <label className="text-xs text-gray-500">We'll generate completely new lyrics and music from scratch.</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us the new story or theme you'd like for the song..."
            className="w-full rounded-lg border bg-gray-50 p-3 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': accent + '60' } as React.CSSProperties}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">MUSIC STYLE</label>
          <select
            value={musicStyle}
            onChange={(e) => setMusicStyle(e.target.value)}
            className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent appearance-none"
            style={{ '--tw-ring-color': accent + '60' } as React.CSSProperties}
          >
            <option value="keep">Keep current</option>
            <option value="Pop">Pop</option>
            <option value="R&B">R&B</option>
            <option value="Acoustic">Acoustic</option>
            <option value="Jazz">Jazz</option>
            <option value="Rock">Rock</option>
            <option value="Classical">Classical</option>
            <option value="Hip Hop">Hip Hop</option>
            <option value="Country">Country</option>
            <option value="EDM">EDM</option>
            <option value="Reggae">Reggae</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">VOICE</label>
          <select
            value={voiceStyle}
            onChange={(e) => setVoiceStyle(e.target.value)}
            className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent appearance-none"
            style={{ '--tw-ring-color': accent + '60' } as React.CSSProperties}
          >
            <option value="keep">{cfg.voiceKeepLabel || 'Tetap saat ini'}</option>
            <option value="female">{cfg.voiceFemaleLabel || 'Wanita'}</option>
            <option value="male">{cfg.voiceMaleLabel || 'Pria'}</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || (revisionType === 'describe' && !description.trim()) || (revisionType === 'lyrics' && !newLyrics.trim())}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </span>
        ) : (
          cfg.revisionSubmitButtonText || 'Submit Revision'
        )}
      </button>
    </div>
  )
}

function TestimonialSection({
  order,
  accent,
  phone,
  cfg,
}: {
  order: UnlockedOrder
  accent: string
  phone: string
  cfg: DeliveryConfig
}) {
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(order.hasTestimonial)
  const [testimonialStatus, setTestimonialStatus] = useState(order.testimonialStatus)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (order.status !== 'completed') return null

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setError('Please select a video file.')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Video must be under 100MB.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('phone', phone)

      const res = await fetch(`/api/public/order/${encodeURIComponent(order.id)}/testimonial`, {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'testimonial_already_uploaded') {
          setUploaded(true)
          setTestimonialStatus('pending')
          return
        }
        setError(data.error === 'invalid_file_type' ? 'Please upload a video file.' : 'Upload failed. Please try again.')
        return
      }

      setUploaded(true)
      setTestimonialStatus('pending')
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (uploaded) {
    return (
      <div className="rounded-2xl border bg-white p-5 shadow-sm text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="text-base font-bold text-gray-900">{cfg.testimonialSuccessTitle || 'Video uploaded!'}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {testimonialStatus === 'approved'
            ? (cfg.testimonialApprovedMessage || 'Your testimonial has been approved. Thank you!')
            : (cfg.testimonialSuccessMessage || 'Our team is reviewing your video. Thank you for sharing!')}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Video className="h-5 w-5" style={{ color: accent }} />
        <h3 className="text-sm font-semibold text-gray-900">{cfg.testimonialSectionTitle || 'Share your experience'}</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {cfg.testimonialSectionDescription || "Record a short video telling us about your experience with your personalized song. We'd love to hear from you!"}
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleUpload}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-lg border-2 border-dashed px-4 py-4 text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ borderColor: accent + '40', color: accent }}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading video...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {cfg.testimonialUploadButtonText || 'Upload Video Testimonial'}
          </>
        )}
      </button>
      <p className="text-[10px] text-gray-400 mt-2 text-center">Max 100MB. Supported formats: MP4, MOV, WebM</p>
    </div>
  )
}

export function OrderDeliveryRoute() {
  const { orderId } = useParams<{ orderId: string }>()
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [unlockedOrders, setUnlockedOrders] = useState<UnlockedOrder[] | null>(null)
  const [phone, setPhone] = useState('')
  const [verifiedPhone, setVerifiedPhone] = useState('')
  const [countryCode, setCountryCode] = useState('62')
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [lyricsExpanded, setLyricsExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetch(`/api/public/order/${encodeURIComponent(orderId)}/status`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true)
          return
        }
        const data = await res.json()
        setOrderStatus(data)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [orderId])

  const cfg = orderStatus?.config ?? {}
  const accent = cfg.accentColor || '#E11D48'

  const handleVerify = async () => {
    if (!orderId || !phone.trim()) return
    setVerifying(true)
    setError(null)

    const fullNumber = countryCode + phone.replace(/^0+/, '').replace(/\D/g, '')

    try {
      const res = await fetch(`/api/public/order/${encodeURIComponent(orderId)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullNumber }),
      })
      if (res.status === 429) {
        setError('Too many attempts. Please try again later.')
        return
      }
      if (res.status === 403) {
        setError(cfg.phonePromptText ? 'Number does not match our records.' : 'Nomor tidak cocok dengan data kami.')
        return
      }
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }
      const data = await res.json()
      setUnlockedOrders(data.orders ?? [])
      setVerifiedPhone(fullNumber)
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const refreshOrders = async () => {
    if (!orderId || !verifiedPhone) return
    try {
      const res = await fetch(`/api/public/order/${encodeURIComponent(orderId)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: verifiedPhone }),
      })
      if (res.ok) {
        const data = await res.json()
        setUnlockedOrders(data.orders ?? [])
      }
    } catch {}
  }

  const downloadLyrics = (order: UnlockedOrder) => {
    if (!order.lyricsText) return
    const blob = new Blob([order.lyricsText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lyrics-${order.recipientName || order.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const renderLogo = (size: 'lg' | 'sm' = 'lg') => {
    const dimension = size === 'lg' ? 'h-16 w-16' : 'h-10 w-10'
    const iconSize = size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'

    if (cfg.logoUrl) {
      return (
        <div className="mx-auto mb-4 flex items-center justify-center">
          <img src={cfg.logoUrl} alt="Logo" className={size === 'lg' ? 'max-h-16' : 'max-h-10'} style={{ objectFit: 'contain' }} />
        </div>
      )
    }
    return (
      <div className={`mx-auto mb-4 flex ${dimension} items-center justify-center rounded-full`} style={{ backgroundColor: accent + '15' }}>
        <Music className={iconSize} style={{ color: accent }} />
      </div>
    )
  }

  const trackSubtitle = (recipientName: string) => {
    const template = cfg.trackSubtitleText || 'Personalized for {recipientName}'
    return template.replace('{recipientName}', recipientName || 'you')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Music className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Order Not Found</h1>
          <p className="mt-2 text-sm text-gray-500">The order you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  if (!unlockedOrders && orderStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            {renderLogo('lg')}
            <h1 className="text-2xl font-bold text-gray-900">
              {cfg.pageTitle || 'Your Personalized Song'}
            </h1>
            {orderStatus.recipientName && (
              <p className="mt-1 text-sm text-gray-500">
                {(cfg.headerText || 'A special song for {recipientName}').replace('{recipientName}', orderStatus.recipientName)}
              </p>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {cfg.phonePromptText || 'Enter your phone number to access your song'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">+</span>
                  <input
                    type="tel"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ''))}
                    className="w-[72px] rounded-lg border bg-gray-50 px-3 pl-6 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': accent + '60' } as React.CSSProperties}
                    placeholder="62"
                  />
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    className="w-full rounded-lg border bg-gray-50 px-3 pl-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': accent + '60' } as React.CSSProperties}
                    placeholder="876543211"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                onClick={handleVerify}
                disabled={verifying || !phone.trim()}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                {verifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  cfg.unlockButtonText || 'Unlock My Song'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (unlockedOrders && unlockedOrders.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
        <div className="text-center max-w-sm">
          {renderLogo('lg')}
          <h1 className="text-xl font-semibold text-gray-800">No Orders Found</h1>
          <p className="mt-2 text-sm text-gray-500">We couldn't find any orders for your account.</p>
        </div>
      </div>
    )
  }

  if (unlockedOrders && unlockedOrders.length > 0) {
    const allProcessing = unlockedOrders.every((o) => o.status !== 'completed')

    if (allProcessing) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: accent + '15' }}>
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: accent }} />
            </div>
            <h1 className="text-xl font-semibold text-gray-800">
              {cfg.processingMessage || 'Your song is being created!'}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              We're working on your personalized song. Please check back soon.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            {renderLogo('lg')}
            <h1 className="text-2xl font-bold text-gray-900">
              {cfg.successMessage || 'Your Song is Ready!'}
            </h1>
          </div>

          <div className="space-y-6">
            {unlockedOrders.map((order) => {
              const isProcessing = order.status !== 'completed'

              if (isProcessing) {
                return (
                  <div key={order.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: accent + '15' }}>
                        <Loader2 className="h-5 w-5 animate-spin" style={{ color: accent }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {order.recipientName ? `Song for ${order.recipientName}` : 'Your Song'}
                        </h3>
                        <p className="text-xs text-gray-500">{cfg.processingMessage || 'Being created...'}</p>
                      </div>
                    </div>
                  </div>
                )
              }

              const isLyricsOpen = lyricsExpanded[order.id] ?? false

              return (
                <div key={order.id} className="space-y-4">
                  {unlockedOrders.length > 1 && order.recipientName && (
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-gray-700">
                        {(cfg.headerText || 'A special song for {recipientName}').replace('{recipientName}', order.recipientName)}
                      </h2>
                      <span className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Music className="h-5 w-5" style={{ color: accent }} />
                      <h3 className="text-sm font-semibold text-gray-900">Listen to your song</h3>
                    </div>

                    <div className={order.tracks.length > 1 ? 'grid grid-cols-1 gap-4' : ''}>
                      {order.tracks.map((url, idx) => (
                        <div key={`${order.id}-${idx}`} className="space-y-2">
                          {order.tracks.length > 1 && (
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Version {idx + 1}
                            </span>
                          )}
                          <audio controls className="w-full h-10" preload="metadata">
                            <source src={url} />
                          </audio>
                          <a
                            href={url}
                            download
                            className="flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: accent }}
                          >
                            <Download className="h-4 w-4" />
                            {cfg.downloadButtonText || 'Download MP3'}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.lyricsText && (
                    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                      <button
                        onClick={() => setLyricsExpanded((prev) => ({ ...prev, [order.id]: !isLyricsOpen }))}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-amber-600" />
                          <h3 className="text-sm font-semibold text-gray-900">See the lyrics</h3>
                        </div>
                        {isLyricsOpen ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      {isLyricsOpen && (
                        <div className="px-5 pb-5">
                          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                            {order.lyricsText}
                          </div>
                          <button
                            onClick={() => downloadLyrics(order)}
                            className="mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {cfg.lyricsButtonText || 'Download .txt'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <RevisionSection
                    order={order}
                    accent={accent}
                    phone={verifiedPhone}
                    cfg={cfg}
                    onRegenerated={refreshOrders}
                  />

                  <TestimonialSection
                    order={order}
                    accent={accent}
                    phone={verifiedPhone}
                    cfg={cfg}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return null
}
