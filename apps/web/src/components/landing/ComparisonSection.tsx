import { Check } from 'lucide-react'

function sanitizeHtml(html: string): string {
  return html.replace(/<\/?(?!strong|em|br\s*\/?)(?!span\b)([a-z][a-z0-9]*)\b[^>]*>/gi, '')
}

type GiftItem = { icon: string; name: string; price: string }
type ChecklistItem = { text: string }

type Props = {
  fmtCurrency: (v: number | null | undefined) => string
  paymentAmount: number | null
  originalAmount: number | null
  showPrice?: boolean
  deliveryEtaSentence: string
  headline?: string
  giftItems?: GiftItem[]
  forgottenLabel?: string
  foreverLabel?: string
  bestPriceBadge?: string
  productTitle?: string
  checklistItems?: ChecklistItem[]
}

const defaultGiftItems: GiftItem[] = [
  { icon: '🧴', name: 'Parfum', price: 'Rp 1jt+' },
  { icon: '⌚', name: 'Jam Tangan', price: 'Rp 2jt+' },
  { icon: '👔', name: 'Baju', price: 'Rp 500rb+' },
  { icon: '🎮', name: 'Gadget', price: 'Rp 3jt+' },
]

const defaultChecklistItems: ChecklistItem[] = [
  { text: '<strong>Namanya</strong> dalam lirik' },
  { text: 'Cerita & kenangan kalian' },
  { text: 'Audio kualitas studio' },
]

export function ComparisonSection({
  fmtCurrency,
  paymentAmount,
  originalAmount,
  showPrice = true,
  deliveryEtaSentence,
  headline = 'Kado yang akan dia <span class="text-gray-400 line-through decoration-[var(--theme-accent)]">lupakan</span> vs. yang akan dia <span class="text-[var(--theme-accent)] italic">putar ulang</span>',
  giftItems = defaultGiftItems,
  forgottenLabel = 'Dilupakan bulan depan ❌',
  foreverLabel = 'Diputar Selamanya ✅',
  bestPriceBadge = 'HARGA TERBAIK',
  productTitle = 'Lagu Personal Untuknya',
  checklistItems = defaultChecklistItems,
}: Props) {
  const allChecklistItems = [...checklistItems, { text: `Dikirim ${deliveryEtaSentence}` }]

  return (
    <section aria-labelledby="comparison-title" className="space-y-10 text-center max-w-5xl mx-auto">
      <div className="space-y-2">
        <h2 id="comparison-title" className="font-serif text-3xl sm:text-4xl font-bold text-gray-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(headline) }} />
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-stretch">
        <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-8 opacity-60 grayscale-[50%]">
            {giftItems.map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className="text-4xl mb-2">{item.icon}</span>
                <span className="font-medium text-gray-900">{item.name}</span>
                <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded text-gray-600">{item.price}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 font-bold text-gray-400 uppercase tracking-widest text-sm">{forgottenLabel}</div>
        </div>

        <div className="bg-white rounded-3xl p-8 border-2 border-[var(--theme-accent)] shadow-xl relative overflow-hidden transform md:scale-105 z-10">
          <div className="absolute top-4 right-4 bg-[var(--theme-accent)] text-white text-[10px] font-bold px-3 py-1 rounded-full">{bestPriceBadge}</div>
          <div className="h-full flex flex-col items-center justify-center space-y-6">
            <div className="h-20 w-20 bg-[var(--theme-accent-soft)] rounded-full flex items-center justify-center text-4xl shadow-inner">
              🎵
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-gray-900">{productTitle}</h3>
              {showPrice && <div className="text-[var(--theme-accent)] font-bold text-3xl">{fmtCurrency(paymentAmount)} <span className="text-gray-300 line-through text-lg font-normal">{fmtCurrency(originalAmount)}</span></div>}
            </div>
            <ul className="text-left space-y-3 text-gray-600 bg-[var(--theme-accent-soft)] p-6 rounded-2xl w-full">
              {allChecklistItems.map((item, i) => (
                <li key={i} className="flex items-center gap-2"><Check className="h-5 w-5 text-[var(--theme-accent)]" /> <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.text) }} /></li>
              ))}
            </ul>
            <div className="font-bold text-[var(--theme-accent)] uppercase tracking-widest text-sm">{foreverLabel}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
