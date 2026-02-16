import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, MessageCircle, Clock } from 'lucide-react'

export function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Beranda
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hubungi Kami</h1>
        <p className="text-gray-500 mb-10">Ada pertanyaan atau butuh bantuan? Tim kami siap membantu Anda.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <a
            href="mailto:support@laguin.id"
            className="group flex flex-col items-center gap-3 rounded-xl border border-gray-200 p-6 text-center transition-all hover:border-rose-200 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition-colors group-hover:bg-rose-100">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-800">Email</h3>
            <p className="text-sm text-gray-500">Kirim email ke tim support kami</p>
            <span className="text-sm font-medium text-rose-500">support@laguin.id</span>
          </a>

          <a
            href="https://wa.me/6281234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 rounded-xl border border-gray-200 p-6 text-center transition-all hover:border-green-200 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-500 transition-colors group-hover:bg-green-100">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-800">WhatsApp</h3>
            <p className="text-sm text-gray-500">Chat langsung dengan tim kami</p>
            <span className="text-sm font-medium text-green-500">Kirim Pesan</span>
          </a>
        </div>

        <div className="space-y-8 text-gray-600 text-[15px] leading-relaxed">
          <section className="rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                <Clock className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Jam Operasional</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Senin – Jumat</span>
                <span className="font-medium text-gray-700">09:00 – 21:00 WIB</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Sabtu</span>
                <span className="font-medium text-gray-700">09:00 – 18:00 WIB</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Minggu &amp; Hari Libur</span>
                <span className="font-medium text-gray-700">10:00 – 15:00 WIB</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Pertanyaan Umum</h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-medium text-gray-800 mb-1">Berapa lama proses pembuatan lagu?</h3>
                <p className="text-sm text-gray-500">Lagu Anda akan siap dalam waktu yang ditentukan sesuai paket yang dipilih. Untuk pengiriman instan, lagu akan dikirimkan segera setelah pembayaran dikonfirmasi.</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-medium text-gray-800 mb-1">Bagaimana cara menerima lagu yang sudah jadi?</h3>
                <p className="text-sm text-gray-500">Lagu akan dikirimkan melalui email dalam bentuk tautan unduhan. Anda juga dapat mengakses lagu melalui halaman checkout pesanan Anda.</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-medium text-gray-800 mb-1">Apakah bisa request revisi?</h3>
                <p className="text-sm text-gray-500">Revisi minor dapat diakomodasi dalam batas wajar. Silakan hubungi tim support kami untuk mendiskusikan permintaan revisi Anda.</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="font-medium text-gray-800 mb-1">Metode pembayaran apa saja yang tersedia?</h3>
                <p className="text-sm text-gray-500">Kami menerima pembayaran melalui berbagai metode termasuk transfer bank, e-wallet, dan kartu kredit/debit melalui payment gateway Xendit yang aman.</p>
              </div>
            </div>
          </section>

          <section className="text-center py-6">
            <div className="p-6 rounded-xl bg-gray-50">
              <p className="font-semibold text-gray-800 mb-1">Langit Utama Group</p>
              <p className="text-sm text-gray-500">Layanan Musik Digital Personal</p>
              <a href="https://laguin.id" className="text-sm text-rose-500 hover:underline mt-2 inline-block">laguin.id</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
