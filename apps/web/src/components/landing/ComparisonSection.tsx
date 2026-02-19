import { Check } from 'lucide-react'

type Props = {
  fmtCurrency: (v: number | null | undefined) => string
  paymentAmount: number | null
  originalAmount: number | null
  deliveryEtaSentence: string
}

export function ComparisonSection({ fmtCurrency, paymentAmount, originalAmount, deliveryEtaSentence }: Props) {
  return (
    <section aria-labelledby="comparison-title" className="space-y-10 text-center max-w-5xl mx-auto">
      <div className="space-y-2">
        <h2 id="comparison-title" className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">
          Kado yang akan dia <span className="text-gray-400 line-through decoration-[var(--theme-accent)]">lupakan</span> vs. yang akan dia <span className="text-[var(--theme-accent)] italic">putar ulang</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-stretch">
        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-8 opacity-60 grayscale-[50%]">
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl mb-2">🧴</span>
              <span className="font-medium text-gray-900">Parfum</span>
              <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">Rp 1jt+</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl mb-2">⌚</span>
              <span className="font-medium text-gray-900">Jam Tangan</span>
              <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">Rp 2jt+</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl mb-2">👔</span>
              <span className="font-medium text-gray-900">Baju</span>
              <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">Rp 500rb+</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl mb-2">🎮</span>
              <span className="font-medium text-gray-900">Gadget</span>
              <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">Rp 3jt+</span>
            </div>
          </div>
          <div className="mt-8 font-bold text-gray-400 uppercase tracking-widest text-sm">Dilupakan bulan depan ❌</div>
        </div>

        <div className="bg-white rounded-3xl p-8 border-2 border-[var(--theme-accent)] shadow-xl relative overflow-hidden transform md:scale-105 z-10">
          <div className="absolute top-4 right-4 bg-[var(--theme-accent)] text-white text-[10px] font-bold px-3 py-1 rounded-full">HARGA TERBAIK</div>
          <div className="h-full flex flex-col items-center justify-center space-y-6">
            <div className="h-20 w-20 bg-[var(--theme-accent-soft)] rounded-full flex items-center justify-center text-4xl shadow-inner">
              🎵
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-gray-900">Lagu Personal Untuknya</h3>
              <div className="text-[var(--theme-accent)] font-bold text-3xl">{fmtCurrency(paymentAmount)} <span className="text-gray-300 line-through text-lg font-normal">{fmtCurrency(originalAmount)}</span></div>
            </div>
            <ul className="text-left space-y-3 text-gray-600 bg-[var(--theme-accent-soft)] p-6 rounded-2xl w-full">
              <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[var(--theme-accent)]" /> <strong>Namanya</strong> dalam lirik</li>
              <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[var(--theme-accent)]" /> Cerita & kenangan kalian</li>
              <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[var(--theme-accent)]" /> Audio kualitas studio</li>
              <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[var(--theme-accent)]" /> Dikirim {deliveryEtaSentence}</li>
            </ul>
            <div className="font-bold text-[var(--theme-accent)] uppercase tracking-widest text-sm">Diputar Selamanya ✅</div>
          </div>
        </div>
      </div>
    </section>
  )
}
