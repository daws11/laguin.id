import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

function sanitizeHtml(html: string): string {
  return html.replace(/<\/?(?!strong|em|br\s*\/?)(?!span\b)([a-z][a-z0-9]*)\b[^>]*>/gi, '')
}

type Props = {
  headline: string
  subtitle: string
  fmtCurrency: (v: number | null | undefined) => string
  paymentAmount: number | null
  originalAmount: number | null
  themeSlug: string | null
  securityBadge?: string
  quotaLine?: string
}

export function FooterCtaSection({
  headline,
  subtitle,
  fmtCurrency,
  paymentAmount,
  originalAmount,
  themeSlug,
  securityBadge = '🔒 Checkout Aman',
  quotaLine = 'Hanya 11 kuota gratis tersisa',
}: Props) {
  return (
    <section className="text-center space-y-6 pb-12">
      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900">{headline}</h2>
      <p className="text-gray-600 text-base sm:text-lg" dangerouslySetInnerHTML={{ __html: sanitizeHtml(subtitle) }} />

      <div className="pt-4">
        <Button asChild size="lg" className="h-auto min-h-[4rem] px-6 py-4 sm:px-12 rounded-full bg-[var(--theme-accent)] text-lg sm:text-xl font-bold shadow-2xl shadow-[var(--theme-accent-soft)] hover:opacity-90 hover:scale-105 transition-all">
          <Link to={themeSlug ? `/${themeSlug}/config` : '/config'} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 leading-none">
            <span>Buat Lagunya — {fmtCurrency(paymentAmount)}</span>
            <span className="text-xs sm:text-sm font-normal line-through opacity-80 text-[var(--theme-accent-soft)]">{fmtCurrency(originalAmount)}</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide pt-4">
        <span>{securityBadge}</span>
        <span>{quotaLine}</span>
      </div>
    </section>
  )
}
