import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { apiPost } from '@/lib/http'
import { useThemeSlug } from '@/features/theme/ThemeContext'
import { trackPixelEvent, ensureMetaPixelLoaded, trackWishlist } from '@/features/analytics/MetaPixel'
import { CheckCircle2, Loader2 } from 'lucide-react'

type UpsellItemConfig = {
  id: string
  icon: string
  title: string
  headline: string
  description: string
  price: number
  priceLabel: string
  ctaText: string
  declineText: string
}

type UpsellLocationState = {
  formPayload: Record<string, unknown>
  upsellConfig: {
    headline: string
    footerNote: string
    items: UpsellItemConfig[]
  }
  themeColors?: {
    accentColor?: string
    buttonColor?: string
  }
  wishlistPixelId?: string | null
  manualConfirmationEnabled?: boolean
}

const fmtCurrency = (amt: number) => {
  if (amt === 0) return 'GRATIS'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amt)
}

export function UpsellRoute() {
  const themeSlug = useThemeSlug()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as UpsellLocationState | null

  const [currentIndex, setCurrentIndex] = useState(0)
  const [acceptedItems, setAcceptedItems] = useState<Array<{ id: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!state?.formPayload || !state?.upsellConfig?.items?.length) {
    const configPath = themeSlug ? `/${themeSlug}/config` : '/config'
    return <Navigate to={configPath} replace />
  }

  const { formPayload, upsellConfig, themeColors, wishlistPixelId, manualConfirmationEnabled } = state
  const items = upsellConfig.items
  const currentItem = items[currentIndex]
  const accentColor = themeColors?.accentColor || '#E11D48'
  const buttonColor = themeColors?.buttonColor || accentColor

  const submitOrder = async (finalAccepted: Array<{ id: string }>) => {
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        ...formPayload,
        upsells: finalAccepted.length > 0 ? finalAccepted : [],
      }
      const res = await apiPost<{ orderId: string; xenditInvoiceUrl?: string }>('/api/orders/draft', payload)

      trackPixelEvent('Lead', { content_name: 'Lagu Personal', currency: 'IDR', value: 0 }, `order_created:${res.orderId}`)

      if (wishlistPixelId) {
        ensureMetaPixelLoaded(wishlistPixelId)
        trackWishlist(wishlistPixelId, { content_name: 'Lagu Personal Valentine' })
      }

      if (manualConfirmationEnabled) {
        const adminNumber = '62895370231680'
        const input = formPayload as any
        const recipient = String(input?.recipientName ?? '').trim()
        const occasion = String(input?.occasion ?? '').trim()
        const wa = String(input?.whatsappNumber ?? '').trim()
        const extraNotes = String(input?.extraNotes ?? '').trim()

        const message = [
          'Halo Admin Laguin,',
          '',
          'Saya ingin melakukan konfirmasi pesanan pembuatan lagu.',
          '',
          `Order ID: ${res.orderId}`,
          `Nama penerima: ${recipient || '-'}`,
          `Momen/acara: ${occasion || '-'}`,
          `Nomor WhatsApp saya: ${wa || '-'}`,
          ...(extraNotes ? ['', `Catatan tambahan: ${extraNotes}`] : []),
          '',
          'Mohon dibantu untuk memproses pesanan ini. Terima kasih.',
        ].join('\n')

        const url = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`
        window.location.assign(url)
        return
      }

      if (res.xenditInvoiceUrl) {
        window.location.href = res.xenditInvoiceUrl
        return
      }

      navigate(`/order/${encodeURIComponent(res.orderId)}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Something went wrong.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAccept = () => {
    const newAccepted = [...acceptedItems, { id: currentItem.id }]
    setAcceptedItems(newAccepted)

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      void submitOrder(newAccepted)
    }
  }

  const handleDecline = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      void submitOrder(acceptedItems)
    }
  }

  if (!currentItem) return null

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: `linear-gradient(135deg, ${accentColor}08 0%, ${accentColor}04 100%)` }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: '#22c55e20' }}
          >
            <CheckCircle2 className="h-8 w-8" style={{ color: '#22c55e' }} />
          </div>
          <h1 className="text-center text-lg font-semibold text-gray-800">
            {currentItem.headline || upsellConfig.headline}
          </h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg space-y-4">
          <div className="text-center">
            {currentItem.icon && (
              <span className="text-2xl">{currentItem.icon}</span>
            )}
            <h2 className="text-xl font-bold text-gray-900 mt-1">{currentItem.title}</h2>
          </div>

          {currentItem.description && (
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              {currentItem.description}
            </p>
          )}

          <div
            className="rounded-xl px-4 py-3 text-center"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <div className="text-2xl font-bold" style={{ color: accentColor }}>
              {fmtCurrency(currentItem.price)}
            </div>
            {currentItem.priceLabel && (
              <div className="text-xs text-gray-500 mt-0.5">{currentItem.priceLabel}</div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleAccept}
              disabled={submitting}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: buttonColor }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                currentItem.ctaText || 'Yes, Add This'
              )}
            </button>

            <button
              onClick={handleDecline}
              disabled={submitting}
              className="w-full rounded-xl border-2 py-3 text-sm font-semibold transition-all hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: `${accentColor}40`, color: accentColor }}
            >
              {currentItem.declineText || 'No Thanks, Continue'}
            </button>
          </div>
        </div>

        {items.length > 1 && (
          <div className="flex justify-center gap-1.5">
            {items.map((_, i) => (
              <div
                key={i}
                className="h-1.5 w-6 rounded-full transition-all"
                style={{
                  backgroundColor: i === currentIndex ? accentColor : `${accentColor}30`,
                }}
              />
            ))}
          </div>
        )}

        {upsellConfig.footerNote && (
          <p className="text-center text-xs text-gray-400">{upsellConfig.footerNote}</p>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
