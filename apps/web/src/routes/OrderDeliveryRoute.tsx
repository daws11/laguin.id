import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Music, Download, FileText, Loader2, Clock,
  RefreshCw, Video, CheckCircle, ChevronDown, ChevronUp, Upload, Sparkles,
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

type OrderProcessingPageConfig = {
  headline?: string
  subtitle?: string
  countdownLabel?: string
  bottomText?: string
  upsellItemIds?: string[]
}

type ProcessingUpsellItem = {
  id: string
  icon?: string
  title?: string
  headline?: string
  description?: string
  price?: number
  priceLabel?: string
  ctaText?: string
  action?: string
  actionConfig?: { deliveryTimeMinutes?: number }
}

type OrderStatus = {
  id: string
  status: string
  recipientName: string
  createdAt: string
  config: DeliveryConfig
  confirmedAt?: string | null
  deliveryScheduledAt?: string | null
  deliveryDelayHours?: number
  orderProcessingPage?: OrderProcessingPageConfig
  processingUpsellItems?: ProcessingUpsellItem[]
  purchasedUpsells?: any[]
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
  revisionSubmittedAt: string | null
}

const REVISION_WAIT_MS = 24 * 60 * 60 * 1000 // 24 hours

function useCountdown(targetTime: number | null) {
  const [remaining, setRemaining] = useState(() => {
    if (!targetTime) return 0
    return Math.max(0, targetTime - Date.now())
  })

  useEffect(() => {
    if (!targetTime) return
    const tick = () => setRemaining(Math.max(0, targetTime - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetTime])

  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

  return { remaining, hours, minutes, seconds }
}

function RevisionWaitScreen({ order, accent, cfg }: { order: UnlockedOrder; accent: string; cfg: DeliveryConfig }) {
  const submittedAt = order.revisionSubmittedAt ? new Date(order.revisionSubmittedAt).getTime() : null
  const targetTime = submittedAt ? submittedAt + REVISION_WAIT_MS : null
  const { hours, minutes, seconds } = useCountdown(targetTime)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: accent + '15' }}>
          <Clock className="h-8 w-8" style={{ color: accent }} />
        </div>
        <h1 className="text-xl font-semibold text-gray-800">
          {cfg.processingMessage || 'Revisi Anda sedang diproses!'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Kami sedang mengerjakan versi baru lagu Anda. Perkiraan waktu selesai:
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {[
            { value: hours, label: 'Jam' },
            { value: minutes, label: 'Menit' },
            { value: seconds, label: 'Detik' },
          ].map((unit) => (
            <div key={unit.label} className="flex flex-col items-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {String(unit.value).padStart(2, '0')}
              </div>
              <span className="mt-1 text-xs text-gray-500">{unit.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OrderProcessingScreen({
  orderStatus,
  accent,
}: {
  orderStatus: OrderStatus
  accent: string
}) {
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  const opp = orderStatus.orderProcessingPage ?? {}
  const upsells = orderStatus.processingUpsellItems ?? []
  const purchasedIds = (orderStatus.purchasedUpsells ?? []).map((u: any) => u?.id).filter(Boolean)

  // Calculate countdown target
  let targetTime: number | null = null
  if (orderStatus.deliveryScheduledAt) {
    targetTime = new Date(orderStatus.deliveryScheduledAt).getTime()
  } else if (orderStatus.confirmedAt && orderStatus.deliveryDelayHours) {
    targetTime = new Date(orderStatus.confirmedAt).getTime() + orderStatus.deliveryDelayHours * 60 * 60 * 1000
  }

  const { hours, minutes, seconds } = useCountdown(targetTime)

  const handleUpsellPurchase = async (upsellId: string) => {
    setPurchasingId(upsellId)
    setPurchaseError(null)
    try {
      const res = await fetch(`/api/public/order/${encodeURIComponent(orderStatus.id)}/upsell-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upsellItemId: upsellId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setPurchaseError(data.error === 'already_purchased' ? 'Anda sudah membeli add-on ini.' : 'Terjadi kesalahan. Silakan coba lagi.')
        return
      }
      const data = await res.json()
      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl
      }
    } catch {
      setPurchaseError('Kesalahan koneksi. Silakan coba lagi.')
    } finally {
      setPurchasingId(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12">
      <div className="text-center max-w-md w-full">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: accent + '15' }}>
          <Clock className="h-8 w-8" style={{ color: accent }} />
        </div>
        <h1 className="text-xl font-semibold text-gray-800">
          {opp.headline || 'Lagu Anda Sedang Dibuat!'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {opp.subtitle || 'Tim kami sedang membuat lagu spesial untuk Anda'}
        </p>

        {targetTime && (
          <>
            <p className="mt-5 text-xs font-medium text-gray-400 uppercase tracking-wider">
              {opp.countdownLabel || 'Estimasi selesai dalam'}
            </p>
            <div className="mt-3 flex justify-center gap-3">
              {[
                { value: hours, label: 'Jam' },
                { value: minutes, label: 'Menit' },
                { value: seconds, label: 'Detik' },
              ].map((unit) => (
                <div key={unit.label} className="flex flex-col items-center">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {String(unit.value).padStart(2, '0')}
                  </div>
                  <span className="mt-1 text-xs text-gray-500">{unit.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-6 text-sm text-gray-500 max-w-xs mx-auto">
          {opp.bottomText || 'Kami akan mengirimkan notifikasi via WhatsApp ketika lagu Anda sudah siap.'}
        </p>

        {/* Upsell Cards */}
        {upsells.length > 0 && (
          <div className="mt-8 space-y-4">
            {purchaseError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{purchaseError}</p>
            )}
            {upsells.map((upsell) => {
              const isPurchased = purchasedIds.includes(upsell.id)
              if (isPurchased) {
                return (
                  <div key={upsell.id} className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-green-800">{upsell.title} — Aktif!</p>
                  </div>
                )
              }
              return (
                <div key={upsell.id} className="rounded-2xl border bg-white p-5 shadow-sm text-left">
                  <div className="flex items-start gap-3">
                    {upsell.icon && <span className="text-2xl">{upsell.icon}</span>}
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-gray-900">{upsell.title}</h3>
                      {upsell.description && (
                        <p className="mt-1 text-xs text-gray-500">{upsell.description}</p>
                      )}
                      {upsell.action === 'express_delivery' && upsell.actionConfig?.deliveryTimeMinutes && (
                        <p className="mt-1 text-xs font-medium" style={{ color: accent }}>
                          Terima lagu Anda dalam {upsell.actionConfig.deliveryTimeMinutes < 60
                            ? `${upsell.actionConfig.deliveryTimeMinutes} menit`
                            : `${Math.round(upsell.actionConfig.deliveryTimeMinutes / 60)} jam`
                          }!
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpsellPurchase(upsell.id)}
                    disabled={purchasingId !== null}
                    className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: accent }}
                  >
                    {purchasingId === upsell.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {upsell.ctaText || `Beli — ${upsell.priceLabel || `Rp ${(upsell.price ?? 0).toLocaleString()}`}`}
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

type RevisionType = 'describe' | 'lyrics' | 'new_story'

function RevisionSection({
  order,
  accent,
  cfg,
  onRegenerated,
}: {
  order: UnlockedOrder
  accent: string
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
              <h3 className="text-sm font-semibold text-gray-900">{cfg.revisionUsedTitle || 'Revisi Digunakan'}</h3>
              <p className="text-xs text-gray-500">{cfg.revisionUsedMessage || `Anda telah menggunakan semua ${order.maxRegenerations} revisi yang tersedia.`}</p>
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
          revisionType,
          description: revisionType === 'describe' ? description : undefined,
          newLyrics: revisionType === 'lyrics' ? newLyrics : undefined,
          musicStyle: musicStyle !== 'keep' ? musicStyle : undefined,
          voiceStyle: voiceStyle !== 'keep' ? voiceStyle : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error === 'max_regenerations_reached' ? 'Tidak ada revisi yang tersisa.' : 'Terjadi kesalahan. Silakan coba lagi.')
        return
      }
      onRegenerated()
    } catch {
      setError('Kesalahan koneksi. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const tabs: { key: RevisionType; label: string }[] = [
    { key: 'describe', label: cfg.revisionTabDescribe || 'Jelaskan perubahan' },
    { key: 'lyrics', label: cfg.revisionTabLyrics || 'Edit lirik' },
    { key: 'new_story', label: cfg.revisionTabNewStory || 'Cerita baru' },
  ]

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" style={{ color: accent }} />
          <h3 className="text-sm font-semibold text-gray-900">{cfg.revisionSectionTitle || 'Ingin membuat perubahan?'}</h3>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {revisionsLeft} revisi {revisionsLeft !== 1 ? 'tersisa' : 'tersisa'}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        {cfg.revisionSectionDescription || "Beritahu kami apa yang ingin Anda ubah dan kami akan membuat versi baru lagu Anda. Anda juga dapat mengubah gaya musik atau suara."}
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
          <label className="text-xs text-gray-500">Beritahu kami apa yang ingin diubah — kami akan menangani sisanya.</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={"Contoh:\n- Ubah nama dari John menjadi Jonathan\n- Buat chorus lebih ceria\n- Tambahkan penyebutan perjalanan kami ke Paris"}
            className="w-full rounded-lg border bg-gray-50 p-3 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': accent + '60' } as React.CSSProperties}
          />
        </div>
      )}

      {revisionType === 'lyrics' && (
        <div className="space-y-2 mb-4">
          <label className="text-xs text-gray-500">Edit lirik di bawah ini.</label>
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
          <label className="text-xs text-gray-500">Kami akan menghasilkan lirik dan musik baru sepenuhnya dari awal.</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beritahu kami cerita atau tema baru yang Anda inginkan untuk lagu..."
            className="w-full rounded-lg border bg-gray-50 p-3 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': accent + '60' } as React.CSSProperties}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">GAYA MUSIK</label>
          <select
            value={musicStyle}
            onChange={(e) => setMusicStyle(e.target.value)}
            className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent appearance-none"
            style={{ '--tw-ring-color': accent + '60' } as React.CSSProperties}
          >
            <option value="keep">Tetap saat ini</option>
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
          <label className="text-xs font-medium text-gray-600 mb-1 block">SUARA</label>
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
            Mengirim...
          </span>
        ) : (
          cfg.revisionSubmitButtonText || 'Kirim Revisi'
        )}
      </button>
    </div>
  )
}

function TestimonialSection({
  order,
  accent,
  cfg,
}: {
  order: UnlockedOrder
  accent: string
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
      setError('Silakan pilih file video.')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Video harus di bawah 100MB.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const fd = new FormData()
      fd.append('file', file)

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
        setError(data.error === 'invalid_file_type' ? 'Silakan unggah file video.' : 'Unggahan gagal. Silakan coba lagi.')
        return
      }

      setUploaded(true)
      setTestimonialStatus('pending')
    } catch {
      setError('Kesalahan koneksi. Silakan coba lagi.')
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
        <h3 className="text-base font-bold text-gray-900">{cfg.testimonialSuccessTitle || 'Video telah diunggah!'}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {testimonialStatus === 'approved'
            ? (cfg.testimonialApprovedMessage || 'Testimonial Anda telah disetujui. Terima kasih!')
            : (cfg.testimonialSuccessMessage || 'Tim kami sedang meninjau video Anda. Terima kasih telah berbagi!')}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Video className="h-5 w-5" style={{ color: accent }} />
        <h3 className="text-sm font-semibold text-gray-900">{cfg.testimonialSectionTitle || 'Bagikan pengalaman Anda'}</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {cfg.testimonialSectionDescription || "Rekam video pendek yang menceritakan pengalaman Anda dengan lagu pribadi Anda. Kami ingin mendengar dari Anda!"}
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
            Mengunggah video...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {cfg.testimonialUploadButtonText || 'Unggah Video Testimonial'}
          </>
        )}
      </button>
      <p className="text-[10px] text-gray-400 mt-2 text-center">Maks 100MB. Format yang didukung: MP4, MOV, WebM</p>
    </div>
  )
}

export function OrderDeliveryRoute() {
  const { orderId } = useParams<{ orderId: string }>()
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [unlockedOrders, setUnlockedOrders] = useState<UnlockedOrder[] | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const hasAutoConfirmed = useRef(false)
  const [lyricsExpanded, setLyricsExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/public/order/${encodeURIComponent(orderId)}/status`),
      fetch(`/api/public/order/${encodeURIComponent(orderId)}/content`),
    ])
      .then(async ([statusRes, contentRes]) => {
        if (!statusRes.ok || !contentRes.ok) {
          setNotFound(true)
          return
        }
        const [statusData, contentData] = await Promise.all([statusRes.json(), contentRes.json()])
        setOrderStatus(statusData)
        setUnlockedOrders(contentData.orders ?? [])
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [orderId])

  // Auto-confirm order if status is 'created' (not yet confirmed)
  useEffect(() => {
    if (!orderId || !orderStatus) return
    if (orderStatus.status !== 'created') return
    if (hasAutoConfirmed.current) return
    hasAutoConfirmed.current = true

    fetch(`/api/orders/${encodeURIComponent(orderId)}/confirm`, { method: 'POST' })
      .then(async () => {
        const statusRes = await fetch(`/api/public/order/${encodeURIComponent(orderId)}/status`)
        if (statusRes.ok) setOrderStatus(await statusRes.json())
      })
      .catch(() => {})
  }, [orderId, orderStatus?.status])

  // Poll for status updates while order is processing
  useEffect(() => {
    if (!orderId || !orderStatus) return
    const isProcessing = orderStatus.status === 'processing' || orderStatus.status === 'created'
    if (!isProcessing) return

    const poll = async () => {
      try {
        const [statusRes, contentRes] = await Promise.all([
          fetch(`/api/public/order/${encodeURIComponent(orderId)}/status`),
          fetch(`/api/public/order/${encodeURIComponent(orderId)}/content`),
        ])
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setOrderStatus(statusData)
        }
        if (contentRes.ok) {
          const contentData = await contentRes.json()
          setUnlockedOrders(contentData.orders ?? [])
        }
      } catch {}
    }

    const id = setInterval(poll, 10000)
    return () => clearInterval(id)
  }, [orderId, orderStatus?.status])

  const cfg = orderStatus?.config ?? {}
  const accent = cfg.accentColor || '#E11D48'

  const refreshOrders = async () => {
    if (!orderId) return
    try {
      const res = await fetch(`/api/public/order/${encodeURIComponent(orderId)}/content`)
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
          <h1 className="text-xl font-semibold text-gray-800">Pesanan Tidak Ditemukan</h1>
          <p className="mt-2 text-sm text-gray-500">Pesanan yang Anda cari tidak ada atau telah dihapus.</p>
        </div>
      </div>
    )
  }

  if (unlockedOrders && unlockedOrders.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
        <div className="text-center max-w-sm">
          {renderLogo('lg')}
          <h1 className="text-xl font-semibold text-gray-800">Tidak Ada Pesanan yang Ditemukan</h1>
          <p className="mt-2 text-sm text-gray-500">Kami tidak dapat menemukan pesanan untuk akun Anda.</p>
        </div>
      </div>
    )
  }

  if (unlockedOrders && unlockedOrders.length > 0) {
    // Check if any order is within 24h revision wait period
    const revisionWaitOrder = unlockedOrders.find((o) => {
      if (!o.revisionSubmittedAt || o.regenerationCount === 0) return false
      const elapsed = Date.now() - new Date(o.revisionSubmittedAt).getTime()
      return elapsed < REVISION_WAIT_MS
    })

    if (revisionWaitOrder) {
      return <RevisionWaitScreen order={revisionWaitOrder} accent={accent} cfg={cfg} />
    }

    const allProcessing = unlockedOrders.every((o) => o.status !== 'completed')

    if (allProcessing && orderStatus) {
      return <OrderProcessingScreen orderStatus={orderStatus} accent={accent} />
    }

    return (
      <div className="flex min-h-screen justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            {renderLogo('lg')}
            <h1 className="text-2xl font-bold text-gray-900">
              {cfg.successMessage || 'Lagu Anda Siap!'}
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
                          {order.recipientName ? `Lagu untuk ${order.recipientName}` : 'Lagu Anda'}
                        </h3>
                        <p className="text-xs text-gray-500">{cfg.processingMessage || 'Sedang dibuat...'}</p>
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
                        {(cfg.headerText || 'Lagu spesial untuk {recipientName}').replace('{recipientName}', order.recipientName)}
                      </h2>
                      <span className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Music className="h-5 w-5" style={{ color: accent }} />
                      <h3 className="text-sm font-semibold text-gray-900">Dengarkan lagu Anda</h3>
                    </div>

                    <div className={order.tracks.length > 1 ? 'grid grid-cols-1 gap-4' : ''}>
                      {order.tracks.map((url, idx) => (
                        <div key={`${order.id}-${idx}`} className="space-y-2">
                          {order.tracks.length > 1 && (
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Versi {idx + 1}
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
                            {cfg.downloadButtonText || 'Unduh MP3'}
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
                          <h3 className="text-sm font-semibold text-gray-900">Lihat lirik</h3>
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
                            {cfg.lyricsButtonText || 'Unduh .txt'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <RevisionSection
                    order={order}
                    accent={accent}
                    cfg={cfg}
                    onRegenerated={refreshOrders}
                  />

                  <TestimonialSection
                    order={order}
                    accent={accent}
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
