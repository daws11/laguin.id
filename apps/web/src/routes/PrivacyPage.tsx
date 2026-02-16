import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Beranda
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kebijakan Privasi</h1>
        <p className="text-sm text-gray-400 mb-10">Terakhir diperbarui: 16 Februari 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-600 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">1. Pendahuluan</h2>
            <p>
              Laguin.id (&quot;kami&quot;, &quot;milik kami&quot;) yang dikelola oleh Langit Utama Group berkomitmen melindungi privasi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda saat Anda menggunakan layanan pembuatan lagu personal kami di laguin.id (&quot;Layanan&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">2. Informasi yang Kami Kumpulkan</h2>
            <p>Kami mengumpulkan informasi berikut saat Anda menggunakan Layanan kami:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Data Identitas:</strong> Nama lengkap, alamat email, dan nomor WhatsApp (opsional).</li>
              <li><strong>Data Pesanan:</strong> Detail cerita personal, nama penerima, preferensi musik, dan instruksi khusus yang Anda berikan untuk pembuatan lagu.</li>
              <li><strong>Data Pembayaran:</strong> Informasi transaksi yang diproses melalui penyedia pembayaran pihak ketiga (Xendit). Kami tidak menyimpan detail kartu kredit atau debit Anda secara langsung.</li>
              <li><strong>Data Teknis:</strong> Alamat IP, jenis browser, dan data analitik anonim untuk meningkatkan kualitas Layanan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">3. Penggunaan Informasi</h2>
            <p>Informasi yang kami kumpulkan digunakan untuk:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Memproses dan membuat pesanan lagu personal Anda.</li>
              <li>Mengirimkan lagu yang sudah selesai melalui email atau tautan unduhan.</li>
              <li>Menghubungi Anda terkait status pesanan atau pertanyaan terkait layanan.</li>
              <li>Meningkatkan kualitas Layanan dan pengalaman pengguna.</li>
              <li>Memenuhi kewajiban hukum yang berlaku.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">4. Penyimpanan dan Keamanan Data</h2>
            <p>
              Kami menyimpan data Anda pada server yang aman dan menerapkan langkah-langkah teknis serta organisasi yang wajar untuk melindungi informasi pribadi Anda dari akses tidak sah, kehilangan, atau penyalahgunaan. Data pesanan disimpan selama diperlukan untuk menyediakan Layanan dan memenuhi kewajiban hukum.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">5. Berbagi Data dengan Pihak Ketiga</h2>
            <p>Kami tidak menjual data pribadi Anda. Kami hanya membagikan informasi Anda dengan:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Penyedia Pembayaran:</strong> Xendit, untuk memproses transaksi pembayaran Anda secara aman.</li>
              <li><strong>Penyedia Layanan AI:</strong> Untuk menghasilkan konten musik berdasarkan instruksi Anda (tanpa mengungkap identitas pribadi).</li>
              <li><strong>Penyedia Email:</strong> Untuk mengirimkan lagu dan notifikasi terkait pesanan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">6. Cookie dan Pelacakan</h2>
            <p>
              Kami menggunakan cookie teknis dan alat analitik (termasuk Meta Pixel) untuk memahami penggunaan situs dan meningkatkan pengalaman Anda. Anda dapat mengatur preferensi cookie melalui pengaturan browser Anda.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">7. Hak Anda</h2>
            <p>Anda berhak untuk:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Mengakses data pribadi yang kami simpan tentang Anda.</li>
              <li>Meminta koreksi atas data yang tidak akurat.</li>
              <li>Meminta penghapusan data pribadi Anda, sesuai dengan ketentuan hukum yang berlaku.</li>
              <li>Menarik persetujuan atas pemrosesan data tertentu.</li>
            </ul>
            <p className="mt-3">Untuk menggunakan hak-hak ini, silakan hubungi kami di <a href="mailto:support@laguin.id" className="text-rose-500 hover:underline">support@laguin.id</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">8. Perubahan Kebijakan</h2>
            <p>
              Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan akan dipublikasikan di halaman ini dengan tanggal pembaruan terbaru. Penggunaan Layanan secara berkelanjutan setelah perubahan dianggap sebagai persetujuan Anda terhadap kebijakan yang diperbarui.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">9. Hubungi Kami</h2>
            <p>
              Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, silakan hubungi kami:
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm space-y-1">
              <p><strong>Langit Utama Group</strong></p>
              <p>Email: <a href="mailto:support@laguin.id" className="text-rose-500 hover:underline">support@laguin.id</a></p>
              <p>Website: <a href="https://laguin.id" className="text-rose-500 hover:underline">laguin.id</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
