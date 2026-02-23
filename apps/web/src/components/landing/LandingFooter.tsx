import { Link } from 'react-router-dom'

type Props = {
  logoUrl: string
  themeSlug: string | null
  activeThemes: Array<{ slug: string; name: string }>
  tagline?: string
  companyName?: string
  email?: string
  disclaimer?: string
  copyrightLine?: string
}

export function LandingFooter({
  logoUrl,
  themeSlug,
  activeThemes,
  tagline = 'Membuat pria menangis sejak 2024',
  companyName = 'Langit Utama Group',
  email = 'support@laguin.id',
  disclaimer = 'Laguin.id menyediakan layanan musik digital yang dipersonalisasi. Seluruh lagu dibuat secara khusus berdasarkan informasi yang diberikan oleh pelanggan. Tidak terdapat pengiriman produk fisik. Kualitas dan hasil akhir dapat bervariasi bergantung pada kelengkapan serta keakuratan informasi yang disampaikan. Layanan ini tidak berafiliasi dengan, tidak disponsori, dan tidak didukung oleh Facebook, Inc. atau Meta Platforms, Inc.',
  copyrightLine = 'Langit Utama Group. All rights reserved.',
}: Props) {
  return (
    <footer className="border-t border-gray-100 bg-white py-12 text-sm text-gray-400">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
          <div className="flex flex-col items-center sm:items-start gap-3">
            <Link to={themeSlug ? `/${themeSlug}` : '/'} className="flex items-center gap-2">
              <img src={logoUrl} alt="Laguin.id - Lagumu, Ceritamu" className="h-10 w-auto object-contain opacity-70" loading="lazy" />
            </Link>
            <p className="text-gray-500 text-xs">{tagline}</p>
            <div className="text-xs space-y-1 text-gray-400">
              <p className="font-medium text-gray-500">{companyName}</p>
              <a href={`mailto:${email}`} className="hover:text-gray-600 transition-colors">{email}</a>
            </div>
          </div>

          {activeThemes.length > 0 && (
            <div className="flex flex-col items-center sm:items-start gap-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Koleksi Lagu</h4>
              <div className="flex flex-col gap-1.5">
                {activeThemes.map((t) => (
                  <Link key={t.slug} to={`/${t.slug}`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center sm:items-start gap-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Informasi</h4>
            <div className="flex flex-col gap-1.5">
              <Link to="/privasi" className="text-xs hover:text-gray-600 transition-colors">Privasi</Link>
              <Link to="/ketentuan" className="text-xs hover:text-gray-600 transition-colors">Ketentuan</Link>
              <Link to="/kontak" className="text-xs hover:text-gray-600 transition-colors">Kontak</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <p className="max-w-2xl mx-auto text-[10px] sm:text-xs text-gray-400 leading-relaxed">
            <strong className="text-gray-500">Disclaimer:</strong> {disclaimer}
          </p>
          <p className="mt-4 text-[10px] text-gray-300">&copy; {new Date().getFullYear()} {copyrightLine}</p>
        </div>
      </div>
    </footer>
  )
}
