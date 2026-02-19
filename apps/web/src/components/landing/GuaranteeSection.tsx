import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, Check } from 'lucide-react'

type Props = {
  deliveryEtaShort: string
}

export function GuaranteeSection({ deliveryEtaShort }: Props) {
  const videoRef = useRef<HTMLDivElement>(null)
  const [videoVisible, setVideoVisible] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVideoVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
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
            <span className="flex items-center gap-1"><Check className="h-4 w-4" /> Pengiriman {deliveryEtaShort}</span>
          </div>
        </div>
      </div>
      <div className="mt-6" ref={videoRef}>
        {videoVisible && (
          <video
            src="/laguin-studio.mp4"
            className="w-full rounded-2xl shadow-md"
            autoPlay
            muted
            loop
            playsInline
          />
        )}
      </div>
    </section>
  )
}
