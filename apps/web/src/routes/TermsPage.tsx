import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Beranda
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Syarat dan Ketentuan</h1>
        <p className="text-sm text-gray-400 mb-10">Terakhir diperbarui: 16 Februari 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-600 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">1. Ketentuan Umum</h2>
            <p>
              Dengan mengakses dan menggunakan layanan Laguin.id (&quot;Layanan&quot;) yang dioperasikan oleh Langit Utama Group (&quot;kami&quot;), Anda menyetujui untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak menyetujui ketentuan ini, mohon untuk tidak menggunakan Layanan kami.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">2. Deskripsi Layanan</h2>
            <p>
              Laguin.id menyediakan layanan pembuatan lagu personal yang dibuat khusus berdasarkan cerita dan preferensi yang Anda berikan. Layanan ini sepenuhnya digital — tidak ada produk fisik yang dikirimkan.
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Setiap lagu dibuat secara unik berdasarkan informasi yang Anda sampaikan.</li>
              <li>Hasil akhir berupa file audio digital yang dapat diakses melalui tautan unduhan atau dikirimkan via email.</li>
              <li>Waktu pembuatan bervariasi tergantung pada volume pesanan dan kompleksitas permintaan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">3. Pemesanan dan Pembayaran</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Pesanan dianggap resmi setelah pembayaran berhasil dikonfirmasi.</li>
              <li>Harga yang tertera sudah termasuk seluruh biaya layanan pembuatan lagu.</li>
              <li>Pembayaran diproses secara aman melalui Xendit. Kami tidak menyimpan informasi kartu pembayaran Anda.</li>
              <li>Konfirmasi pesanan akan dikirimkan melalui email yang Anda daftarkan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">4. Kebijakan Pengembalian Dana</h2>
            <p>Karena sifat produk digital yang personal dan dibuat khusus:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Pengembalian dana <strong>tidak tersedia</strong> setelah proses pembuatan lagu dimulai.</li>
              <li>Jika terdapat masalah teknis yang menyebabkan lagu tidak dapat dikirimkan, kami akan memberikan pengembalian dana penuh atau membuat ulang lagu tersebut.</li>
              <li>Permintaan revisi minor dapat diakomodasi dalam batas wajar, tergantung pada kebijakan kami.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">5. Hak Kekayaan Intelektual</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Lagu yang dibuat melalui Layanan kami dilisensikan untuk penggunaan pribadi dan non-komersial.</li>
              <li>Anda berhak membagikan lagu tersebut kepada penerima yang dituju dan di media sosial pribadi.</li>
              <li>Penggunaan komersial (iklan, penjualan ulang, distribusi massal) <strong>tidak diperkenankan</strong> tanpa izin tertulis dari kami.</li>
              <li>Hak cipta atas komposisi dan produksi tetap menjadi milik Langit Utama Group.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">6. Konten Pengguna</h2>
            <p>Dengan mengirimkan cerita, nama, dan detail lainnya untuk pembuatan lagu, Anda:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Menjamin bahwa informasi yang diberikan akurat dan tidak melanggar hak pihak ketiga.</li>
              <li>Memberikan izin kepada kami untuk menggunakan informasi tersebut dalam proses pembuatan lagu.</li>
              <li>Bertanggung jawab atas konten yang Anda kirimkan, termasuk memastikan tidak mengandung materi yang melanggar hukum atau bersifat merugikan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">7. Batasan Tanggung Jawab</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Layanan disediakan &quot;sebagaimana adanya&quot; tanpa jaminan tertentu mengenai hasil akhir.</li>
              <li>Kualitas lagu bergantung pada kelengkapan dan keakuratan informasi yang Anda berikan.</li>
              <li>Kami tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan Layanan.</li>
              <li>Tanggung jawab total kami terbatas pada jumlah yang Anda bayarkan untuk pesanan terkait.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">8. Perubahan Layanan</h2>
            <p>
              Kami berhak untuk mengubah, menangguhkan, atau menghentikan bagian mana pun dari Layanan kapan saja. Perubahan signifikan akan dikomunikasikan melalui situs web kami. Penggunaan Layanan secara berkelanjutan setelah perubahan dianggap sebagai persetujuan Anda.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">9. Hukum yang Berlaku</h2>
            <p>
              Syarat dan Ketentuan ini diatur oleh dan ditafsirkan sesuai dengan hukum yang berlaku di Republik Indonesia. Segala sengketa yang timbul akan diselesaikan melalui musyawarah terlebih dahulu, dan jika tidak tercapai kesepakatan, melalui lembaga penyelesaian sengketa yang berwenang di Indonesia.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">10. Hubungi Kami</h2>
            <p>
              Jika Anda memiliki pertanyaan tentang Syarat dan Ketentuan ini, silakan hubungi kami:
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
