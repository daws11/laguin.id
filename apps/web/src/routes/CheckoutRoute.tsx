import { useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Check, Clock, Music, Loader2, ArrowLeft } from 'lucide-react'

import { apiGet, apiPost } from '@/lib/http'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type OrderInputPayload = {
  yourName?: string
  recipientName?: string
  whatsappNumber?: string
  occasion?: string
  story?: string
  musicPreferences?: Record<string, string | undefined>
  extraNotes?: string
}

type OrderSummary = {
  id: string
  status: string
  deliveryStatus: string
  paymentStatus: string
  inputPayload: OrderInputPayload
  trackUrl?: string | null
  errorMessage?: string | null
}

function ChecklistItem({ label, status }: { label: string; status: 'pending' | 'loading' | 'completed' }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-500",
        status === 'completed' ? "bg-green-500 border-green-500 text-white" :
        status === 'loading' ? "border-[#E11D48] text-[#E11D48]" :
        // Slightly higher contrast so the dot is always visible.
        "border-rose-200 text-rose-300 bg-white"
      )}>
        {status === 'completed' ? <Check className="h-3.5 w-3.5" /> :
         status === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
         <div className="h-1.5 w-1.5 rounded-full bg-current" />}
      </div>
      <span className={cn(
        "text-sm font-medium transition-colors duration-300",
        status === 'completed' ? "text-gray-900" :
        status === 'loading' ? "text-[#E11D48]" :
        "text-gray-500"
      )}>{label}</span>
    </div>
  )
}

export function CheckoutRoute() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const orderId = useMemo(() => params.get('orderId') ?? '', [params])

  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checklistStep, setChecklistStep] = useState(0)

  const hasAttemptedAutoConfirm = useRef(false)
  const hasTrackedInitiateCheckout = useRef(false)
  const hasTrackedPurchase = useRef(false)

  // Meta Pixel: track InitiateCheckout when the checkout page is loaded.
  // Guard avoids double fire in dev StrictMode / re-mounts.
  useEffect(() => {
    if (!orderId) return
    if (hasTrackedInitiateCheckout.current) return
    hasTrackedInitiateCheckout.current = true
    ;(window as any).fbq?.('track', 'InitiateCheckout', {
      value: 497000,
      currency: 'IDR',
      num_items: 1,
      content_type: 'product',
    })
  }, [orderId])

  // Auto-confirm logic: trigger immediately when order is loaded and status is created
  useEffect(() => {
    if (orderId && order?.status === 'created' && !confirming && !hasAttemptedAutoConfirm.current) {
      hasAttemptedAutoConfirm.current = true
      confirm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, order?.status])

  // Initial Load
  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    setError(null)
    apiGet<OrderSummary>(`/api/orders/${encodeURIComponent(orderId)}`)
      .then(setOrder)
      .catch((e) => setError(e?.message ?? 'Failed to load order'))
      .finally(() => setLoading(false))
  }, [orderId])

  // Poll for updates if processing (for checklist sync mostly)
  useEffect(() => {
    if (!orderId || !order || (order.status !== 'processing' && order.status !== 'created')) return

    const handle = window.setInterval(() => {
      apiGet<OrderSummary>(`/api/orders/${encodeURIComponent(orderId)}`)
        .then((o) => {
          setOrder(o)
        })
        .catch(() => {})
    }, 3000)

    return () => window.clearInterval(handle)
  }, [orderId, order?.status])

  // Redirect after 30s if processing
  useEffect(() => {
    if (order?.status === 'processing') {
      const timer = setTimeout(() => {
        navigate('/')
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [order?.status, navigate])

  // Animation Logic
  useEffect(() => {
    if (!order) return
    
    // Reset if just created and not confirming
    if (order.status === 'created' && !confirming) {
      setChecklistStep(0)
    }

    // For best UX, if backend marks it failed, keep a "completed" looking checklist.
    if (order.status === 'failed') {
      setChecklistStep(3)
      return
    }

    // If confirming, move to step 1 (Pesanan Diterima: Done, Verifikasi: Loading)
    if (confirming && checklistStep === 0) {
      setChecklistStep(1)
    }

    // If processing, advance steps
    if (order.status === 'processing') {
      if (checklistStep === 0) setChecklistStep(1) // Catch up if needed
      
      if (checklistStep === 1) {
        const timer = setTimeout(() => setChecklistStep(2), 1000)
        return () => clearTimeout(timer)
      } else if (checklistStep === 2) {
        const timer = setTimeout(() => setChecklistStep(3), 2500)
        return () => clearTimeout(timer)
      }
    }
  }, [order?.status, confirming, checklistStep])


  async function confirm() {
    if (!orderId) return
    setConfirming(true)
    setError(null)
    try {
      await apiPost(`/api/orders/${encodeURIComponent(orderId)}/confirm`, {})

      // Meta Pixel: track Purchase only when checkout/confirm succeeds.
      // Guard to avoid double fire (auto-confirm + retries).
      if (!hasTrackedPurchase.current) {
        hasTrackedPurchase.current = true
        ;(window as any).fbq?.('track', 'Purchase', {
          value: 497000,
          currency: 'IDR',
        })
      }

      const refreshed = await apiGet<OrderSummary>(`/api/orders/${encodeURIComponent(orderId)}`)
      setOrder(refreshed)
      // Animation will trigger via effect
    } catch (e: any) {
      // Never show technical errors to end users on this route.
      setError('Pesanan kamu sudah kami terima. Silakan tunggu, kami sedang memprosesnya.')
    } finally {
      setConfirming(false)
    }
  }

  // UX rule: do not display raw backend errors (credits, JSON, stack-like messages).
  // Even when backend marks the order as failed, keep the user on a "success / in progress" experience.
  const showProgressUI = Boolean(order && (order.status === 'processing' || order.status === 'created' || order.status === 'failed' || confirming || hasAttemptedAutoConfirm.current))

  return (
    <div className="min-h-screen bg-[#FFF5F7] font-sans pb-32 pt-10 px-4">
      <div className="mx-auto max-w-lg space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
           <h1 className="font-serif text-3xl font-bold text-gray-900 flex justify-center items-center gap-2">
             <Music className="text-[#E11D48] h-8 w-8" /> Checkout
           </h1>
           <p className="text-gray-500 text-sm">Review pesananmu sebelum kami buatkan lagunya.</p>
        </div>

        {!orderId ? (
          <p className="text-center text-red-500">Order ID hilang.</p>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#E11D48]" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            
            {/* Status Card */}
            {showProgressUI && (
              <Card className="border-rose-100 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="h-1.5 bg-[#E11D48] w-full animate-pulse" />
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Status Pesanan</h3>
                  <div className="space-y-1 pl-1">
                    <ChecklistItem label="Pesanan Diterima" status={checklistStep >= 1 ? 'completed' : 'pending'} />
                    <ChecklistItem label="Verifikasi Data" status={checklistStep >= 2 ? 'completed' : checklistStep === 1 ? 'loading' : 'pending'} />
                    <ChecklistItem label="Memulai Pembuatan Lagu" status={checklistStep >= 3 ? 'completed' : checklistStep === 2 ? 'loading' : 'pending'} />
                  </div>
                  
                  <div className={cn(
                    "bg-rose-50 text-rose-800 text-sm p-4 rounded-xl flex items-start gap-3 mt-4 border border-rose-100 transition-opacity duration-500",
                    checklistStep >= 3 ? "opacity-100" : "opacity-0"
                  )}>
                    <Clock className="h-5 w-5 shrink-0 mt-0.5 text-[#E11D48]" />
                    <div>
                      <p className="font-bold text-[#E11D48]">Pesanan Berhasil Diterima</p>
                      <p className="opacity-90 mt-1">
                        Pesanan kamu sedang diproses. Lagu akan dikirim via email dan akan diberitahukan via WhatsApp setelah selesai.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Summary */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/50">
                <CardTitle className="text-base text-gray-900">Ringkasan Pesanan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-sm">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-gray-500">Untuk</span>
                  <span className="font-medium text-gray-900">{order.inputPayload.recipientName ?? '-'}</span>
                  
                  <span className="text-gray-500">Momen</span>
                  <span className="font-medium text-gray-900">{order.inputPayload.occasion ?? '-'}</span>
                </div>
                
                <Separator className="bg-gray-100" />
                
                <div className="space-y-1.5">
                  <div className="text-gray-500">Cerita</div>
                  <div className="whitespace-pre-wrap font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs leading-relaxed">
                    {order.inputPayload.story ?? '-'}
                  </div>
                </div>

                {order.inputPayload.extraNotes && (
                  <div className="space-y-1.5">
                    <div className="text-gray-500">Catatan Tambahan</div>
                    <div className="whitespace-pre-wrap text-gray-800 text-xs italic">
                      "{order.inputPayload.extraNotes}"
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions: Removed auto-confirm button. Only show if error occurs to retry. */}
            {error && order.status === 'created' ? (
               <Button 
                 className="w-full h-14 rounded-full bg-[#E11D48] text-white text-lg font-bold shadow-xl shadow-rose-200 hover:bg-rose-700 hover:scale-[1.02] transition-all duration-300" 
                 onClick={() => {
                    hasAttemptedAutoConfirm.current = true
                    confirm()
                 }} 
                 disabled={confirming}
               >
                 {confirming ? (
                   <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> Memproses...</span>
                 ) : (
                   'Coba Lagi (Konfirmasi Pesanan)'
                 )}
               </Button>
            ) : null}

          </div>
        ) : null}

        {error ? (
          <div className="bg-rose-50 text-rose-800 p-4 rounded-xl text-center text-sm font-medium border border-rose-100">
            {error}
          </div>
        ) : null}
        
        <div className="text-center pt-8">
           <Button variant="ghost" className="text-gray-400 hover:text-gray-600" onClick={() => navigate('/')}>
             <ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Beranda
           </Button>
        </div>

      </div>
    </div>
  )
}
