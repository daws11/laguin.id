import { Star } from 'lucide-react'

function sanitizeHtml(html: string): string {
  return html.replace(/<\/?(?!strong|em|br\s*\/?)([a-z][a-z0-9]*)\b[^>]*>/gi, '')
}

type ReviewItem = {
  style?: 'accent' | 'dark-chat' | 'white'
  quote?: string
  chatMessages?: string[]
  authorName?: string
  authorMeta?: string
  authorAvatarUrl?: string
}

type Props = {
  sectionLabel: string
  sectionHeadline: string
  sectionSubtext: string
  items: ReviewItem[]
}

export function ReviewsSection({ sectionLabel, sectionHeadline, sectionSubtext, items }: Props) {
  return (
    <section className="space-y-10">
      <div className="text-center space-y-2">
        <div className="text-[var(--theme-accent)] text-sm font-bold uppercase tracking-wider">{sectionLabel}</div>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(sectionHeadline) }} />
        <p className="text-gray-600">{sectionSubtext}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {items.map((review, idx) => {
          const transforms = ['md:-rotate-1 hover:rotate-0', 'md:translate-y-4 hover:translate-y-2', 'md:rotate-1 hover:rotate-0']
          const transform = transforms[idx % transforms.length]

          if (review.style === 'accent') {
            return (
              <div key={idx} className={`bg-[var(--theme-accent)] text-white p-8 rounded-3xl shadow-lg transform ${transform} transition-transform`}>
                <div className="flex text-yellow-300 mb-4">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="font-medium text-lg mb-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: `"${sanitizeHtml(review.quote || '')}"` }} />
                <div className="flex items-center gap-3">
                  {review.authorAvatarUrl && <img src={review.authorAvatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-white/50 object-cover" loading="lazy" />}
                  <div>
                    <div className="font-bold">{review.authorName}</div>
                    <div className="text-xs opacity-80">{review.authorMeta}</div>
                  </div>
                </div>
              </div>
            )
          }

          if (review.style === 'dark-chat') {
            const msgs = review.chatMessages || []
            return (
              <div key={idx} className={`bg-gray-900 text-white p-8 rounded-3xl shadow-lg transform ${transform} transition-transform`}>
                <div className="space-y-4 font-sans text-sm">
                  {msgs.map((msg, mi) => (
                    <div key={mi} className={mi === 0 ? "bg-white/10 rounded-2xl rounded-tl-sm p-3 self-start max-w-[90%]" : "bg-blue-600 rounded-2xl rounded-tr-sm p-3 self-end ml-auto max-w-[90%]"}>
                      {msg}
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-3 pt-6 border-t border-white/10">
                  {review.authorAvatarUrl && <img src={review.authorAvatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-white/50 object-cover" loading="lazy" />}
                  <div>
                    <div className="font-bold">{review.authorName}</div>
                    <div className="text-xs opacity-80">{review.authorMeta}</div>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={idx} className={`bg-white border border-gray-100 p-8 rounded-3xl shadow-lg transform ${transform} transition-transform`}>
              <div className="flex text-yellow-400 mb-4">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="font-medium text-gray-800 text-lg mb-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: `"${sanitizeHtml(review.quote || '')}"` }} />
              <div className="flex items-center gap-3">
                {review.authorAvatarUrl && <img src={review.authorAvatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-gray-100 object-cover" loading="lazy" />}
                <div>
                  <div className="font-bold text-gray-900">{review.authorName}</div>
                  <div className="text-xs text-gray-500">{review.authorMeta}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
