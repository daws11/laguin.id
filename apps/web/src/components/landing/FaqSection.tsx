function sanitizeHtml(html: string): string {
  return html.replace(/<\/?(?!strong|em|br\s*\/?)(?!span\b)([a-z][a-z0-9]*)\b[^>]*>/gi, '')
}

type FaqItem = { q: string; a: string }

type Props = {
  items: FaqItem[]
  sectionHeadline?: string
}

export function FaqSection({
  items,
  sectionHeadline = 'Pertanyaan <span class="text-[var(--theme-accent)] italic">Cepat</span>',
}: Props) {
  return (
    <section aria-labelledby="faq-title" className="space-y-10 max-w-3xl mx-auto pb-8">
      <h2 id="faq-title" className="text-center font-serif text-3xl font-bold text-gray-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(sectionHeadline) }} />
      <div className="space-y-4">
        {items.map((faq, i) => (
          <div key={i} className="group rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-md transition-all cursor-default">
            <h3 className="font-bold text-gray-900 text-lg mb-2 flex justify-between items-center">
              {faq.q}
              <span className="text-[var(--theme-accent-soft)] group-hover:text-[var(--theme-accent)] transition-colors text-2xl">↓</span>
            </h3>
            <p className="text-gray-600 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
