import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Music, Download, FileText, Loader2, ShieldCheck, Phone } from 'lucide-react'

type DeliveryConfig = {
  pageTitle?: string
  headerText?: string
  phonePromptText?: string
  processingMessage?: string
  downloadButtonText?: string
  lyricsButtonText?: string
  successMessage?: string
  accentColor?: string
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
}

export function OrderDeliveryRoute() {
  const { orderId } = useParams<{ orderId: string }>()
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [unlockedOrder, setUnlockedOrder] = useState<UnlockedOrder | null>(null)
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('62')
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

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
      setUnlockedOrder(data)
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const downloadLyrics = () => {
    if (!unlockedOrder?.lyricsText) return
    const blob = new Blob([unlockedOrder.lyricsText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lyrics-${unlockedOrder.recipientName || orderId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const accent = cfg.accentColor || '#E11D48'

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

  if (!unlockedOrder && orderStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: accent + '15' }}>
              <Music className="h-8 w-8" style={{ color: accent }} />
            </div>
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
                    placeholder="8113883884"
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
                  'Unlock My Song'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (unlockedOrder) {
    const isProcessing = unlockedOrder.status !== 'completed'

    if (isProcessing) {
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: accent + '15' }}>
              <Music className="h-8 w-8" style={{ color: accent }} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {cfg.successMessage || 'Your Song is Ready!'}
            </h1>
            {unlockedOrder.recipientName && (
              <p className="mt-1 text-sm text-gray-500">
                A special song for {unlockedOrder.recipientName}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {unlockedOrder.tracks.map((url, idx) => (
              <div key={idx} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: accent + '15' }}>
                    <Music className="h-5 w-5" style={{ color: accent }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {unlockedOrder.tracks.length > 1 ? `Track ${idx + 1}` : 'Your Song'}
                    </h3>
                    <p className="text-xs text-gray-500">Personalized for {unlockedOrder.recipientName || 'you'}</p>
                  </div>
                </div>

                <audio controls className="w-full mb-3 h-10" preload="metadata">
                  <source src={url} />
                </audio>

                <a
                  href={url}
                  download
                  className="flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: accent }}
                >
                  <Download className="h-4 w-4" />
                  {cfg.downloadButtonText || 'Download Song'}
                </a>
              </div>
            ))}

            {unlockedOrder.lyricsText && (
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Lyrics</h3>
                  </div>
                  <button
                    onClick={downloadLyrics}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {cfg.lyricsButtonText || 'Download .txt'}
                  </button>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {unlockedOrder.lyricsText}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
