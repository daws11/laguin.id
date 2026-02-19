import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

type Props = {
  deliveryEtaSentence: string
  fmtCurrency: (v: number | null | undefined) => string
  paymentAmount: number | null
  originalAmount: number | null
  themeSlug: string | null
}

export function HowItWorksSection({ deliveryEtaSentence, fmtCurrency, paymentAmount, originalAmount, themeSlug }: Props) {
  return (
    <section aria-labelledby="how-it-works-title" className="space-y-10">
      <div className="text-center space-y-2">
        <h2 className="text-[var(--theme-accent)] text-sm font-bold uppercase tracking-wider">Proses Mudah</h2>
        <h2 id="how-it-works-title" className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">Tiga langkah menuju <span className="text-[var(--theme-accent)] italic">tangis bahagia</span></h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {[
          { step: 1, icon: '✍️', title: 'Ceritakan kisahmu', desc: 'Beritahu kami namanya, kenangan kalian, dan hal-hal lucu.' },
          { step: 2, icon: '🎵', title: 'Kami buatkan', desc: 'Namanya ditenun menjadi lirik & musik profesional oleh komposer kami.' },
          { step: 3, icon: '😭', title: 'Lihat dia terharu', desc: `Dikirim ${deliveryEtaSentence} via WhatsApp. Dia akan menyimpannya selamanya.` },
        ].map((s) => (
          <div key={s.step} className="flex flex-col items-center text-center gap-4 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--theme-accent-soft)] text-3xl font-bold text-[var(--theme-accent)] shadow-sm">
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
        <Button asChild size="lg" className="h-14 px-10 rounded-full bg-[var(--theme-accent)] text-lg font-bold shadow-xl shadow-[var(--theme-accent-soft)] hover:opacity-90">
          <Link to={themeSlug ? `/${themeSlug}/config` : '/config'} className="flex items-center gap-2">
            <span>Buat Lagunya — {fmtCurrency(paymentAmount)}</span>
            <span className="text-xs font-normal line-through opacity-70 decoration-white/50">{fmtCurrency(originalAmount)}</span>
          </Link>
        </Button>
      </div>
    </section>
  )
}
