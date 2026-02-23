import type { PublicSiteDraft, Settings, ToastItem } from './types'

export const defaultThemeColors = {
  accentColor: '#E11D48',
  bgColor1: '#FFF5F7',
  bgColor2: '#FFFFFF',
}

export const defaultPublicSiteDraft: PublicSiteDraft = {
  logoUrl: '/logo.webp',
  colors: { ...defaultThemeColors },
  landing: {
    heroHeadline: {
      line1: 'Valentine kali ini,',
      line2: 'buat dia menangis.',
    },
    heroSubtext: 'Lagu personal dengan <strong>namanya</strong> di lirik. Dikirim dalam 24 jam.',
    footerCta: {
      headline: 'Jangan biarkan Valentine berlalu',
      subtitle: 'Beri dia hadiah yang tak akan pernah dia lupakan. Gabung <strong>2,847 wanita</strong> yang membuat pasangannya menangis terharu.',
      securityBadge: '🔒 Checkout Aman',
      quotaLine: 'Hanya 11 kuota gratis tersisa',
    },
    heroMedia: {
      mode: 'image',
      imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=2940&auto=format&fit=crop',
      videoUrl: '',
    },
    heroOverlay: {
      quote: 'Dia menangis sebelum chorus berakhir',
      authorName: 'Rina',
      authorLocation: 'Jakarta',
      authorAvatarUrl: 'https://images.unsplash.com/photo-1530254541043-129f4c372200?w=200&h=200&fit=crop',
    },
    heroPlayer: {
      enabled: true,
      playingBadgeText: 'Playing',
      cornerBadgeText: "Valentine's Special",
      verifiedBadgeText: 'Verified Purchase',
      quote: 'He tried not to cry. He failed.',
      authorName: 'Rachel',
      authorSubline: "London • Valentine's 2025",
      authorAvatarUrl: 'https://images.unsplash.com/photo-1530254541043-129f4c372200?w=200&h=200&fit=crop',
      audioUrl: '',
    },
    audioSamples: {
      nowPlaying: {
        name: 'Untuk Budi, Sepanjang Masa',
        quote: 'Setiap momen bersamamu Budi, dari kencan pertama yang gugup itu...',
        time: '3:24',
        metaText: 'London • Verified',
        audioUrl: '',
      },
      playlist: [
        { title: 'Untuk Rizky, Segalanya Bagiku', subtitle: 'Country • 3:12', ctaLabel: 'PUTAR', audioUrl: '' },
        { title: 'Untuk Dimas, 10 Tahun Bersama', subtitle: 'Acoustic • 2:58', ctaLabel: 'PUTAR', audioUrl: '' },
        { title: 'Untuk Andi, Petualangan Kita', subtitle: 'Pop Ballad • 3:45', ctaLabel: 'PUTAR', audioUrl: '' },
      ],
    },
  },
  promoBanner: {
    enabled: true,
    countdownLabel: "💝 Valentine's dalam",
    countdownTargetDate: '2027-02-14',
    promoBadgeText: '💝 Spesial Valentine',
    quotaBadgeText: '11 kuota!',
    evergreenEnabled: false,
    evergreenCycleHours: 24,
  },
  reviews: {
    sectionLabel: 'Reaksi Nyata',
    sectionHeadline: '"Dia <span class="text-[var(--theme-accent)] italic">tidak pernah</span> menangis"',
    sectionSubtext: '...mereka semua bilang begitu. 98% salah.',
    items: [
      {
        style: 'accent',
        quote: 'Suami saya itu mantan TNI, orangnya keras. 12 tahun nikah, <strong>GAK PERNAH nangis.</strong> Eh, pas denger lagu ini, dia langsung mewek bahkan sebelum masuk reff.',
        authorName: 'Rina',
        authorMeta: 'Jakarta • Feb 2025',
        authorAvatarUrl: 'https://images.unsplash.com/photo-1562904403-a5106bef8319?w=100&h=100&fit=crop',
      },
      {
        style: 'dark-chat',
        quote: '',
        chatMessages: [
          'Ka, lagunya baru masuk 😭😭😭',
          'Sumpah ini aku gemeteran!!',
          'Dia bakal MELELEH besok 🥺',
        ],
        authorName: 'Sinta',
        authorMeta: 'WhatsApp • Kemarin',
        authorAvatarUrl: 'https://images.unsplash.com/photo-1630758664435-72a78888fb9d?w=100&h=100&fit=crop',
      },
      {
        style: 'white',
        quote: 'Doi terpaksa <strong>minggirin mobil</strong> — katanya burem kena air mata. 15 tahun nikah, akhirnya bisa bikin doi nangis juga 😂',
        authorName: 'Ema',
        authorMeta: 'Surabaya • Jan 2025',
        authorAvatarUrl: 'https://images.unsplash.com/photo-1613447895590-97f008b7fff3?w=100&h=100&fit=crop',
      },
    ],
  },
  heroCheckmarks: ['Kualitas Studio', '98% Menangis', 'Revisi Gratis'],
  trustBadges: {
    badge1: '24h Delivery',
    badge2: 'Secure',
    badge3: '11 kuota sisa',
  },
  statsBar: {
    items: [
      { val: '99%', label: 'Menangis' },
      { val: '24h', label: 'Pengiriman' },
      { val: '2,847', label: 'Lagu Terkirim' },
    ],
  },
  activityToast: {
    enabled: true,
    intervalMs: 10000,
    durationMs: 4500,
    items: [
      { fullName: 'Abdurrahman Firdaus', city: 'Bandung', recipientName: 'Salsa' },
      { fullName: 'Nabila Putri', city: 'Jakarta', recipientName: 'Rizky' },
      { fullName: 'Andreas Wijaya', city: 'Surabaya', recipientName: 'Dima' },
    ],
  },
  creationDelivery: {
    instantEnabled: true,
    emailOtpEnabled: true,
    whatsappEnabled: true,
    agreementEnabled: false,
    manualConfirmationEnabled: false,
    deliveryDelayHours: 24,
    deliveryDelayUnit: 'hours' as 'hours' | 'days',
    paymentAmount: 497000,
    originalAmount: 497000,
  },
  audioSamplesSection: {
    badge: 'Tekan Putar',
    headline: 'Dengar <span class="text-[var(--theme-accent)] italic">namanya</span> di lagu asli',
    subtext: 'Lagu asli yang kami buat. Nama asli. Air mata asli.',
    otherLabel: 'Contoh Lainnya',
    ctaLine: 'Bayangkan mendengar <span class="text-[var(--theme-accent)] font-medium italic">namanya</span> di lagu seperti ini...',
  },
  comparisonSection: {
    headline: 'Kado yang akan dia <span class="text-gray-400 line-through decoration-[var(--theme-accent)]">lupakan</span> vs. yang akan dia <span class="text-[var(--theme-accent)] italic">putar ulang</span>',
    giftItems: [
      { icon: '🧴', name: 'Parfum', price: 'Rp 1jt+' },
      { icon: '⌚', name: 'Jam Tangan', price: 'Rp 2jt+' },
      { icon: '👔', name: 'Baju', price: 'Rp 500rb+' },
      { icon: '🎮', name: 'Gadget', price: 'Rp 3jt+' },
    ],
    forgottenLabel: 'Dilupakan bulan depan ❌',
    foreverLabel: 'Diputar Selamanya ✅',
    bestPriceBadge: 'HARGA TERBAIK',
    productTitle: 'Lagu Personal Untuknya',
    checklistItems: [
      { text: '<strong>Namanya</strong> dalam lirik' },
      { text: 'Cerita & kenangan kalian' },
      { text: 'Audio kualitas studio' },
    ],
  },
  howItWorksSection: {
    label: 'Proses Mudah',
    headline: 'Tiga langkah menuju <span class="text-[var(--theme-accent)] italic">tangis bahagia</span>',
    steps: [
      { icon: '✍️', title: 'Ceritakan kisahmu', desc: 'Beritahu kami namanya, kenangan kalian, dan hal-hal lucu.' },
      { icon: '🎵', title: 'Kami buatkan', desc: 'Namanya ditenun menjadi lirik & musik profesional oleh komposer kami.' },
      { icon: '😭', title: 'Lihat dia terharu', desc: 'Dia akan menyimpannya selamanya.' },
    ],
  },
  guaranteeSection: {
    badge: '100% Bebas Risiko',
    headline: 'Garansi "Tangis Bahagia"',
    description: 'Jika lagunya tidak membuatnya emosional, kami akan <strong class="text-gray-900">membuat ulang gratis</strong> atau memberikan <strong class="text-gray-900">pengembalian dana penuh</strong>. Tanpa banyak tanya.',
    badges: ['Revisi gratis', 'Refund penuh'],
    videoUrl: '/laguin-studio.mp4',
  },
  faqSection: {
    headline: 'Pertanyaan <span class="text-[var(--theme-accent)] italic">Cepat</span>',
    items: [
      { q: 'Dia bukan tipe yang emosional...', a: "Itu yang MEREKA SEMUA katakan! 98% menangis — mantan militer, ayah yang kaku, pacar 'aku gak main perasaan'. Semakin tangguh mereka, semakin dalam jatuhnya. 😉" },
      { q: 'Bagaimana dia menerima lagunya?', a: 'Kamu menerima link download via email. Putar untuknya secara langsung, kirim via WhatsApp, atau jadikan kejutan! Ini file MP3 yang bisa diputar di mana saja.' },
      { q: 'Berapa lama prosesnya?', a: 'Kamu akan dapat notifikasi email saat sudah siap.' },
      { q: 'Kalau aku gak suka gimana?', a: 'Revisi gratis tanpa batas sampai kamu suka. Masih gak puas? Refund penuh, tanpa tanya-tanya. 💕' },
      { q: 'Benarkah GRATIS?', a: 'Ya! Spesial untuk 100 orang pertama. Tanpa biaya tersembunyi. Satu kesempatan, hadiah tak terlupakan.' },
    ],
  },
  footer: {
    tagline: 'Membuat pria menangis sejak 2024',
    companyName: 'Langit Utama Group',
    email: 'support@laguin.id',
    disclaimer: 'Laguin.id menyediakan layanan musik digital yang dipersonalisasi. Seluruh lagu dibuat secara khusus berdasarkan informasi yang diberikan oleh pelanggan. Tidak terdapat pengiriman produk fisik. Kualitas dan hasil akhir dapat bervariasi bergantung pada kelengkapan serta keakuratan informasi yang disampaikan. Layanan ini tidak berafiliasi dengan, tidak disponsori, dan tidak didukung oleh Facebook, Inc. atau Meta Platforms, Inc.',
    copyrightLine: 'Langit Utama Group. All rights reserved.',
  },
  miscText: {
    heroStarLine: '2,847 menangis bahagia',
    ctaButtonText: 'Buat Lagunya',
    heroCtaButtonText: 'Buat Lagu',
    mobileCtaQuotaBadge: '(11 sisa)',
  },
  configSteps: {
    step0: {
      enabled: true,
      bannerHeadline: 'Kado Valentine Paling Romantis',
      mainHeadline: 'Rekam emosi mereka saat mendengar lagu untuk menang <span class="text-[var(--theme-accent)]">Rp 1.000.000!</span>',
      guaranteeTitle: 'GARANSI UANG TUNAI',
      guaranteeText: 'Setiap video reaksi yang jelas <span class="font-bold underline decoration-green-500/50">pasti dapat Rp 75.000</span>.',
      howItWorksTitle: 'Cara Ikutan',
      howItWorksSteps: [
        { title: 'Buat Lagu Gratis', subtitle: 'Hemat 100%' },
        { title: 'Rekam Reaksinya', subtitle: 'Wajib Video!' },
        { title: 'Kirim & Menang', subtitle: 'Dapat Cuan!' },
      ],
      bottomCtaText: 'Klik tombol di bawah untuk mulai 👇',
    },
    step1: {
      headline: 'Siapa penerimanya?',
      subtitle: 'Namanya akan ada di dalam lirik',
      relationshipChips: [
        { label: 'Pasangan', icon: '💕', value: 'Pasangan' },
        { label: 'Suami', icon: '💍', value: 'Suami' },
        { label: 'Pacar', icon: '❤️', value: 'Pacar' },
        { label: 'Tunangan', icon: '💎', value: 'Tunangan' },
        { label: 'Istri', icon: '👰', value: 'Istri' },
      ],
      nameFieldLabel: 'Nama Panggilannya',
      nameFieldPlaceholder: 'cth. Salsa',
      occasionFieldLabel: 'Untuk momen apa?',
      occasionFieldPlaceholder: 'cth. Anniversary, Ultah, Wisuda',
      socialProofText: 'Bergabung dengan 2,847 orang yang membuat pasangannya menangis bahagia',
    },
    step2: {
      headline: 'Pilih Vibe',
      subtitle: 'Sesuaikan dengan selera musiknya',
      vibeChips: [
        { id: 'Country', label: 'Country', desc: 'Bercerita & tulus', icon: '🤠' },
        { id: 'Acoustic', label: 'Acoustic', desc: 'Hangat & intim', icon: '🎸' },
        { id: 'Pop Ballad', label: 'Pop Ballad', desc: 'Modern & emosional', icon: '🎹', badge: 'Best' },
        { id: 'R&B Soul', label: 'R&B Soul', desc: 'Halus & romantis', icon: '🌙' },
        { id: 'Rock', label: 'Rock', desc: 'Kuat & penuh gairah', icon: '⚡' },
        { id: 'Piano Ballad', label: 'Piano Ballad', desc: 'Elegan & abadi', icon: '🎻' },
      ],
      voiceLabel: 'Suara Penyanyi',
      voiceOptions: [
        { value: 'Female', label: 'Wanita' },
        { value: 'Male', label: 'Pria' },
        { value: 'Surprise me', label: 'Bebas' },
      ],
      languageLabel: 'Bahasa lirik',
      languageOptions: [
        { value: 'English', label: 'English' },
        { value: 'Indonesian', label: 'Bahasa Indonesia' },
      ],
    },
    step3: {
      headline: 'Ceritakan kisahmu',
      subtitle: 'Ini akan menjadi lirik. <span class="text-[var(--theme-accent)] font-medium">Beberapa kalimat saja!</span>',
      tipBullets: [
        'Semakin kaya detail, semakin kuat emosinya.',
        'Ceritakan pertemuan, hal yang dicintai, atau kenangan lucu.',
      ],
      storyPrompts: [
        { label: 'Awal bertemu', icon: '💞' },
        { label: 'Yang aku suka darinya', icon: '😍' },
        { label: 'Jokes internal kami', icon: '😂' },
        { label: 'Mimpi masa depan', icon: '🔮' },
      ],
      textareaPlaceholder: 'Mulai ketik ceritamu di sini...',
    },
    step4: {
      headline: 'Semua siap!',
      subtitleTemplate: 'Kirim lagu {recipient} ke mana?',
      manualSubtitle: 'Konfirmasi pesanan via WhatsApp',
      orderSummaryLabel: 'Ringkasan Pesanan',
      whatsappLabel: 'Nomor WhatsApp',
      whatsappPlaceholder: 'Masukkan nomor WhatsApp',
      emailLabel: 'Alamat Email',
      emailPlaceholder: 'nama@email.com',
      nextStepsTitle: 'Apa selanjutnya?',
      nextSteps: [
        { text: 'Kami membuat lagu personalmu' },
        { text: 'Dikirim via email & WA {delivery}' },
        { text: 'Putar untuknya dan lihat dia menangis 😭' },
      ],
      manualNextSteps: [
        { text: 'Admin memproses pesanan' },
        { text: 'Lanjut chat admin WhatsApp untuk konfirmasi.' },
        { text: 'Putar untuknya dan lihat dia menangis 😭' },
      ],
      securityBadges: ['Checkout aman', '{delivery}'],
      draftTimerText: 'Cerita tersimpan selama {timer} — selesaikan checkout untuk menyimpannya',
      checkoutButtonText: 'Ke checkout',
      manualCheckoutButtonText: 'Konfirmasi via WhatsApp',
      showPriceInButton: true,
      checkoutImageUrl: '/images/checkout-studio.png',
      showCheckoutImage: true,
    },
  },
}

function asString(v: unknown, fallback: string) {
  return typeof v === 'string' ? v : fallback
}

function asNumber(v: unknown, fallback: number) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function asBool(v: unknown, fallback: boolean) {
  return typeof v === 'boolean' ? v : fallback
}

function safeArr<T>(v: unknown, map: (x: any) => T): T[] {
  if (!Array.isArray(v)) return []
  return v.map(map)
}

export function clampInt(n: number, min: number, max: number) {
  const x = Math.floor(n)
  return Math.min(max, Math.max(min, x))
}

export function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = [...arr]
  const item = copy.splice(from, 1)[0]
  copy.splice(to, 0, item)
  return copy
}

export function parseToastItemsJson(raw: string): ToastItem[] {
  const parsed = JSON.parse(raw) as any
  const arr = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? parsed.items : null
  if (!Array.isArray(arr)) return []
  return safeArr(arr, (x) => ({
    fullName: asString(x?.fullName, '').trim(),
    city: asString(x?.city, '').trim(),
    recipientName: asString(x?.recipientName, '').trim(),
  })).filter((x) => x.fullName || x.city || x.recipientName)
}

export function buildDraftFromSettings(s: Settings | null): PublicSiteDraft {
  const cfg = s?.publicSiteConfig && typeof s.publicSiteConfig === 'object' ? (s.publicSiteConfig as any) : {}
  const landing = cfg?.landing && typeof cfg.landing === 'object' ? cfg.landing : {}
  const heroMedia = landing?.heroMedia && typeof landing.heroMedia === 'object' ? landing.heroMedia : {}
  const heroOverlay = landing?.heroOverlay && typeof landing.heroOverlay === 'object' ? landing.heroOverlay : {}
  const heroPlayer = landing?.heroPlayer && typeof landing.heroPlayer === 'object' ? landing.heroPlayer : {}
  const audioSamples = landing?.audioSamples && typeof landing.audioSamples === 'object' ? landing.audioSamples : {}
  const nowPlaying =
    audioSamples?.nowPlaying && typeof audioSamples.nowPlaying === 'object' ? audioSamples.nowPlaying : {}

  const playlist = safeArr(audioSamples?.playlist, (x) => ({
    title: asString(x?.title, ''),
    subtitle: asString(x?.subtitle, ''),
    ctaLabel: asString(x?.ctaLabel, 'PUTAR'),
    audioUrl: asString(x?.audioUrl, ''),
  })).filter((x) => x.title || x.subtitle || x.audioUrl)

  const heroHeadline = landing?.heroHeadline && typeof landing.heroHeadline === 'object' ? landing.heroHeadline : {}
  const footerCta = landing?.footerCta && typeof landing.footerCta === 'object' ? landing.footerCta : {}
  const colors = cfg?.colors && typeof cfg.colors === 'object' ? cfg.colors : {}
  const cd = cfg?.creationDelivery && typeof cfg.creationDelivery === 'object' ? cfg.creationDelivery : {}
  const toast = cfg?.activityToast && typeof cfg.activityToast === 'object' ? cfg.activityToast : {}
  const pb = cfg?.promoBanner && typeof cfg.promoBanner === 'object' ? cfg.promoBanner : {} as any
  const rv = cfg?.reviews && typeof cfg.reviews === 'object' ? cfg.reviews : {} as any
  const reviewItems = safeArr(rv?.items, (x: any) => ({
    style: (['accent', 'dark-chat', 'white'].includes(x?.style) ? x.style : 'white') as 'accent' | 'dark-chat' | 'white',
    quote: asString(x?.quote, ''),
    chatMessages: Array.isArray(x?.chatMessages) ? x.chatMessages.filter((m: any) => typeof m === 'string' && m.trim()) : undefined,
    authorName: asString(x?.authorName, ''),
    authorMeta: asString(x?.authorMeta, ''),
    authorAvatarUrl: asString(x?.authorAvatarUrl, ''),
  }))
  const heroCheckmarksRaw = safeArr(cfg?.heroCheckmarks, (x) => typeof x === 'string' ? x : '').filter((x: string) => x.trim())
  const tb = cfg?.trustBadges && typeof cfg.trustBadges === 'object' ? cfg.trustBadges : {}
  const sb = cfg?.statsBar && typeof cfg.statsBar === 'object' ? cfg.statsBar : {}
  const toastItems = safeArr(toast?.items, (x) => ({
    fullName: asString(x?.fullName, ''),
    city: asString(x?.city, ''),
    recipientName: asString(x?.recipientName, ''),
  })).filter((x) => x.fullName || x.city || x.recipientName)

  const imageUrl = asString(heroMedia?.imageUrl, defaultPublicSiteDraft.landing.heroMedia.imageUrl)
  const videoUrl = asString(heroMedia?.videoUrl, '')
  const mode: 'image' | 'video' =
    heroMedia?.videoUrl && typeof heroMedia.videoUrl === 'string' && heroMedia.videoUrl.trim() ? 'video' : 'image'

  return {
    logoUrl: asString(cfg?.logoUrl, defaultPublicSiteDraft.logoUrl),
    colors: {
      accentColor: asString(colors?.accentColor, defaultThemeColors.accentColor),
      bgColor1: asString(colors?.bgColor1, defaultThemeColors.bgColor1),
      bgColor2: asString(colors?.bgColor2, defaultThemeColors.bgColor2),
    },
    landing: {
      heroHeadline: {
        line1: asString(heroHeadline?.line1, defaultPublicSiteDraft.landing.heroHeadline.line1),
        line2: asString(heroHeadline?.line2, defaultPublicSiteDraft.landing.heroHeadline.line2),
      },
      heroSubtext: asString(landing?.heroSubtext, defaultPublicSiteDraft.landing.heroSubtext),
      footerCta: {
        headline: asString(footerCta?.headline, defaultPublicSiteDraft.landing.footerCta.headline),
        subtitle: asString(footerCta?.subtitle, defaultPublicSiteDraft.landing.footerCta.subtitle),
        securityBadge: asString(footerCta?.securityBadge, defaultPublicSiteDraft.landing.footerCta.securityBadge),
        quotaLine: asString(footerCta?.quotaLine, defaultPublicSiteDraft.landing.footerCta.quotaLine),
      },
      heroMedia: {
        mode,
        imageUrl: imageUrl.trim() ? imageUrl : defaultPublicSiteDraft.landing.heroMedia.imageUrl,
        videoUrl: videoUrl ?? '',
      },
      heroOverlay: {
        quote: asString(heroOverlay?.quote, defaultPublicSiteDraft.landing.heroOverlay.quote),
        authorName: asString(heroOverlay?.authorName, defaultPublicSiteDraft.landing.heroOverlay.authorName),
        authorLocation: asString(heroOverlay?.authorLocation, defaultPublicSiteDraft.landing.heroOverlay.authorLocation),
        authorAvatarUrl: asString(heroOverlay?.authorAvatarUrl, defaultPublicSiteDraft.landing.heroOverlay.authorAvatarUrl),
      },
      heroPlayer: {
        enabled: asBool(heroPlayer?.enabled, defaultPublicSiteDraft.landing.heroPlayer.enabled),
        playingBadgeText: asString(heroPlayer?.playingBadgeText, defaultPublicSiteDraft.landing.heroPlayer.playingBadgeText),
        cornerBadgeText: asString(heroPlayer?.cornerBadgeText, defaultPublicSiteDraft.landing.heroPlayer.cornerBadgeText),
        verifiedBadgeText: asString(heroPlayer?.verifiedBadgeText, defaultPublicSiteDraft.landing.heroPlayer.verifiedBadgeText),
        quote: asString(heroPlayer?.quote, defaultPublicSiteDraft.landing.heroPlayer.quote),
        authorName: asString(heroPlayer?.authorName, defaultPublicSiteDraft.landing.heroPlayer.authorName),
        authorSubline: asString(heroPlayer?.authorSubline, defaultPublicSiteDraft.landing.heroPlayer.authorSubline),
        authorAvatarUrl: asString(heroPlayer?.authorAvatarUrl, defaultPublicSiteDraft.landing.heroPlayer.authorAvatarUrl),
        audioUrl: asString(heroPlayer?.audioUrl, defaultPublicSiteDraft.landing.heroPlayer.audioUrl),
      },
      audioSamples: {
        nowPlaying: {
          name: asString(nowPlaying?.name, defaultPublicSiteDraft.landing.audioSamples.nowPlaying.name),
          quote: asString(nowPlaying?.quote, defaultPublicSiteDraft.landing.audioSamples.nowPlaying.quote),
          time: asString(nowPlaying?.time, defaultPublicSiteDraft.landing.audioSamples.nowPlaying.time),
          metaText: asString(nowPlaying?.metaText, defaultPublicSiteDraft.landing.audioSamples.nowPlaying.metaText),
          audioUrl: asString(nowPlaying?.audioUrl, defaultPublicSiteDraft.landing.audioSamples.nowPlaying.audioUrl),
        },
        playlist: playlist.length ? playlist : defaultPublicSiteDraft.landing.audioSamples.playlist,
      },
    },
    promoBanner: {
      enabled: typeof pb?.enabled === 'boolean' ? pb.enabled : defaultPublicSiteDraft.promoBanner.enabled,
      countdownLabel: asString(pb?.countdownLabel, defaultPublicSiteDraft.promoBanner.countdownLabel),
      countdownTargetDate: asString(pb?.countdownTargetDate, defaultPublicSiteDraft.promoBanner.countdownTargetDate),
      promoBadgeText: asString(pb?.promoBadgeText, defaultPublicSiteDraft.promoBanner.promoBadgeText),
      quotaBadgeText: asString(pb?.quotaBadgeText, defaultPublicSiteDraft.promoBanner.quotaBadgeText),
      evergreenEnabled: typeof pb?.evergreenEnabled === 'boolean' ? pb.evergreenEnabled : defaultPublicSiteDraft.promoBanner.evergreenEnabled,
      evergreenCycleHours: typeof pb?.evergreenCycleHours === 'number' ? pb.evergreenCycleHours : defaultPublicSiteDraft.promoBanner.evergreenCycleHours,
    },
    reviews: {
      sectionLabel: asString(rv?.sectionLabel, defaultPublicSiteDraft.reviews.sectionLabel),
      sectionHeadline: asString(rv?.sectionHeadline, defaultPublicSiteDraft.reviews.sectionHeadline),
      sectionSubtext: asString(rv?.sectionSubtext, defaultPublicSiteDraft.reviews.sectionSubtext),
      items: reviewItems.length ? reviewItems : defaultPublicSiteDraft.reviews.items,
    },
    heroCheckmarks: heroCheckmarksRaw.length ? heroCheckmarksRaw : defaultPublicSiteDraft.heroCheckmarks,
    trustBadges: {
      badge1: asString(tb?.badge1, defaultPublicSiteDraft.trustBadges.badge1),
      badge2: asString(tb?.badge2, defaultPublicSiteDraft.trustBadges.badge2),
      badge3: asString(tb?.badge3, defaultPublicSiteDraft.trustBadges.badge3),
    },
    statsBar: {
      items: (() => {
        const raw = safeArr(sb?.items, (x) => ({
          val: asString(x?.val, ''),
          label: asString(x?.label, ''),
        })).filter((x) => x.val || x.label)
        return raw.length ? raw : defaultPublicSiteDraft.statsBar.items
      })(),
    },
    activityToast: {
      enabled: asBool(toast?.enabled, defaultPublicSiteDraft.activityToast.enabled),
      intervalMs: clampInt(asNumber(toast?.intervalMs, defaultPublicSiteDraft.activityToast.intervalMs), 2000, 120000),
      durationMs: clampInt(asNumber(toast?.durationMs, defaultPublicSiteDraft.activityToast.durationMs), 1000, 60000),
      items: toastItems.length ? toastItems : defaultPublicSiteDraft.activityToast.items,
    },
    creationDelivery: {
      instantEnabled: asBool(cd?.instantEnabled, defaultPublicSiteDraft.creationDelivery.instantEnabled),
      emailOtpEnabled: asBool(cd?.emailOtpEnabled, defaultPublicSiteDraft.creationDelivery.emailOtpEnabled),
      whatsappEnabled: asBool(cd?.whatsappEnabled, defaultPublicSiteDraft.creationDelivery.whatsappEnabled),
      agreementEnabled: asBool(cd?.agreementEnabled, defaultPublicSiteDraft.creationDelivery.agreementEnabled),
      manualConfirmationEnabled: asBool(cd?.manualConfirmationEnabled, defaultPublicSiteDraft.creationDelivery.manualConfirmationEnabled),
      deliveryDelayHours: asNumber(cd?.deliveryDelayHours, defaultPublicSiteDraft.creationDelivery.deliveryDelayHours),
      deliveryDelayUnit: (cd?.deliveryDelayUnit === 'days' ? 'days' : 'hours') as 'hours' | 'days',
      paymentAmount: asNumber(cd?.paymentAmount, defaultPublicSiteDraft.creationDelivery.paymentAmount),
      originalAmount: asNumber(cd?.originalAmount, defaultPublicSiteDraft.creationDelivery.originalAmount),
    },
    configSteps: buildConfigSteps(cfg?.configSteps),
    audioSamplesSection: buildAudioSamplesSection(cfg?.audioSamplesSection),
    comparisonSection: buildComparisonSection(cfg?.comparisonSection),
    howItWorksSection: buildHowItWorksSection(cfg?.howItWorksSection),
    guaranteeSection: buildGuaranteeSection(cfg?.guaranteeSection),
    faqSection: buildFaqSection(cfg?.faqSection),
    footer: buildFooter(cfg?.footer),
    miscText: buildMiscText(cfg?.miscText),
  }
}

function buildAudioSamplesSection(raw: any) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const d = defaultPublicSiteDraft.audioSamplesSection
  return {
    badge: asString(s?.badge, d.badge),
    headline: asString(s?.headline, d.headline),
    subtext: asString(s?.subtext, d.subtext),
    otherLabel: asString(s?.otherLabel, d.otherLabel),
    ctaLine: asString(s?.ctaLine, d.ctaLine),
  }
}

function buildComparisonSection(raw: any) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const d = defaultPublicSiteDraft.comparisonSection
  const giftItems = safeArr(s?.giftItems, (x: any) => ({
    icon: asString(x?.icon, '🎁'),
    name: asString(x?.name, ''),
    price: asString(x?.price, ''),
  })).filter((x: any) => x.name)
  const checklistItems = safeArr(s?.checklistItems, (x: any) => ({
    text: asString(x?.text, ''),
  })).filter((x: any) => x.text)
  return {
    headline: asString(s?.headline, d.headline),
    giftItems: giftItems.length ? giftItems : d.giftItems,
    forgottenLabel: asString(s?.forgottenLabel, d.forgottenLabel),
    foreverLabel: asString(s?.foreverLabel, d.foreverLabel),
    bestPriceBadge: asString(s?.bestPriceBadge, d.bestPriceBadge),
    productTitle: asString(s?.productTitle, d.productTitle),
    checklistItems: checklistItems.length ? checklistItems : d.checklistItems,
  }
}

function buildHowItWorksSection(raw: any) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const d = defaultPublicSiteDraft.howItWorksSection
  const steps = safeArr(s?.steps, (x: any) => ({
    icon: asString(x?.icon, '📌'),
    title: asString(x?.title, ''),
    desc: asString(x?.desc, ''),
  })).filter((x: any) => x.title)
  return {
    label: asString(s?.label, d.label),
    headline: asString(s?.headline, d.headline),
    steps: steps.length ? steps : d.steps,
  }
}

function buildGuaranteeSection(raw: any) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const d = defaultPublicSiteDraft.guaranteeSection
  const badges = safeArr(s?.badges, (x: any) => typeof x === 'string' ? x : '').filter((x: string) => x.trim())
  return {
    badge: asString(s?.badge, d.badge),
    headline: asString(s?.headline, d.headline),
    description: asString(s?.description, d.description),
    badges: badges.length ? badges : d.badges,
    videoUrl: asString(s?.videoUrl, d.videoUrl),
  }
}

function buildFaqSection(raw: any) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const d = defaultPublicSiteDraft.faqSection
  const items = safeArr(s?.items, (x: any) => ({
    q: asString(x?.q, ''),
    a: asString(x?.a, ''),
  })).filter((x: any) => x.q)
  return {
    headline: asString(s?.headline, d.headline),
    items: items.length ? items : d.items,
  }
}

function buildFooter(raw: any) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const d = defaultPublicSiteDraft.footer
  return {
    tagline: asString(s?.tagline, d.tagline),
    companyName: asString(s?.companyName, d.companyName),
    email: asString(s?.email, d.email),
    disclaimer: asString(s?.disclaimer, d.disclaimer),
    copyrightLine: asString(s?.copyrightLine, d.copyrightLine),
  }
}

function buildMiscText(raw: any) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const d = defaultPublicSiteDraft.miscText
  return {
    heroStarLine: asString(s?.heroStarLine, d.heroStarLine),
    ctaButtonText: asString(s?.ctaButtonText, d.ctaButtonText),
    heroCtaButtonText: asString(s?.heroCtaButtonText, d.heroCtaButtonText),
    mobileCtaQuotaBadge: asString(s?.mobileCtaQuotaBadge, d.mobileCtaQuotaBadge),
  }
}

function buildConfigSteps(raw: any): PublicSiteDraft['configSteps'] {
  const cs = raw && typeof raw === 'object' ? raw : {}
  const s0 = cs?.step0 && typeof cs.step0 === 'object' ? cs.step0 : {}
  const s1 = cs?.step1 && typeof cs.step1 === 'object' ? cs.step1 : {}
  const s2 = cs?.step2 && typeof cs.step2 === 'object' ? cs.step2 : {}
  const s3 = cs?.step3 && typeof cs.step3 === 'object' ? cs.step3 : {}
  const s4 = cs?.step4 && typeof cs.step4 === 'object' ? cs.step4 : {}
  const d = defaultPublicSiteDraft.configSteps

  const relChips = safeArr(s1?.relationshipChips, (x: any) => ({
    label: asString(x?.label, ''),
    icon: asString(x?.icon, '✨'),
    value: asString(x?.value, ''),
  })).filter((x: any) => x.label && x.value)

  const howSteps = safeArr(s0?.howItWorksSteps, (x: any) => ({
    title: asString(x?.title, ''),
    subtitle: asString(x?.subtitle, ''),
  })).filter((x: any) => x.title)

  const tipBullets = safeArr(s3?.tipBullets, (x: any) => typeof x === 'string' ? x : '').filter((x: string) => x.trim())

  const storyPrompts = safeArr(s3?.storyPrompts, (x: any) => ({
    label: asString(x?.label, ''),
    icon: asString(x?.icon, '💡'),
  })).filter((x: any) => x.label)

  const vibeChips = safeArr(s2?.vibeChips, (x: any) => ({
    id: asString(x?.id, ''),
    label: asString(x?.label, ''),
    desc: asString(x?.desc, ''),
    icon: asString(x?.icon, '🎵'),
    badge: x?.badge ? asString(x.badge, '') : undefined,
  })).filter((x: any) => x.id && x.label)

  const voiceOptions = safeArr(s2?.voiceOptions, (x: any) => ({
    value: asString(x?.value, ''),
    label: asString(x?.label, ''),
  })).filter((x: any) => x.value && x.label)

  const languageOptions = safeArr(s2?.languageOptions, (x: any) => ({
    value: asString(x?.value, ''),
    label: asString(x?.label, ''),
  })).filter((x: any) => x.value && x.label)

  const nextSteps = safeArr(s4?.nextSteps, (x: any) => ({
    text: asString(x?.text, ''),
  })).filter((x: any) => x.text)

  const manualNextSteps = safeArr(s4?.manualNextSteps, (x: any) => ({
    text: asString(x?.text, ''),
  })).filter((x: any) => x.text)

  const securityBadges = safeArr(s4?.securityBadges, (x: any) => typeof x === 'string' ? x : '').filter((x: string) => x.trim())

  return {
    step0: {
      enabled: asBool(s0?.enabled, d.step0.enabled),
      bannerHeadline: asString(s0?.bannerHeadline, d.step0.bannerHeadline),
      mainHeadline: asString(s0?.mainHeadline, d.step0.mainHeadline),
      guaranteeTitle: asString(s0?.guaranteeTitle, d.step0.guaranteeTitle),
      guaranteeText: asString(s0?.guaranteeText, d.step0.guaranteeText),
      howItWorksTitle: asString(s0?.howItWorksTitle, d.step0.howItWorksTitle),
      howItWorksSteps: howSteps.length ? howSteps : d.step0.howItWorksSteps,
      bottomCtaText: asString(s0?.bottomCtaText, d.step0.bottomCtaText),
    },
    step1: {
      headline: asString(s1?.headline, d.step1.headline),
      subtitle: asString(s1?.subtitle, d.step1.subtitle),
      relationshipChips: relChips.length ? relChips : d.step1.relationshipChips,
      nameFieldLabel: asString(s1?.nameFieldLabel, d.step1.nameFieldLabel),
      nameFieldPlaceholder: asString(s1?.nameFieldPlaceholder, d.step1.nameFieldPlaceholder),
      occasionFieldLabel: asString(s1?.occasionFieldLabel, d.step1.occasionFieldLabel),
      occasionFieldPlaceholder: asString(s1?.occasionFieldPlaceholder, d.step1.occasionFieldPlaceholder),
      socialProofText: asString(s1?.socialProofText, d.step1.socialProofText),
    },
    step2: {
      headline: asString(s2?.headline, d.step2.headline),
      subtitle: asString(s2?.subtitle, d.step2.subtitle),
      vibeChips: vibeChips.length ? vibeChips : d.step2.vibeChips,
      voiceLabel: asString(s2?.voiceLabel, d.step2.voiceLabel),
      voiceOptions: voiceOptions.length ? voiceOptions : d.step2.voiceOptions,
      languageLabel: asString(s2?.languageLabel, d.step2.languageLabel),
      languageOptions: languageOptions.length ? languageOptions : d.step2.languageOptions,
    },
    step3: {
      headline: asString(s3?.headline, d.step3.headline),
      subtitle: asString(s3?.subtitle, d.step3.subtitle),
      tipBullets: tipBullets.length ? tipBullets : d.step3.tipBullets,
      storyPrompts: storyPrompts.length ? storyPrompts : d.step3.storyPrompts,
      textareaPlaceholder: asString(s3?.textareaPlaceholder, d.step3.textareaPlaceholder),
    },
    step4: {
      headline: asString(s4?.headline, d.step4.headline),
      subtitleTemplate: asString(s4?.subtitleTemplate, d.step4.subtitleTemplate),
      manualSubtitle: asString(s4?.manualSubtitle, d.step4.manualSubtitle),
      orderSummaryLabel: asString(s4?.orderSummaryLabel, d.step4.orderSummaryLabel),
      whatsappLabel: asString(s4?.whatsappLabel, d.step4.whatsappLabel),
      whatsappPlaceholder: asString(s4?.whatsappPlaceholder, d.step4.whatsappPlaceholder),
      emailLabel: asString(s4?.emailLabel, d.step4.emailLabel),
      emailPlaceholder: asString(s4?.emailPlaceholder, d.step4.emailPlaceholder),
      nextStepsTitle: asString(s4?.nextStepsTitle, d.step4.nextStepsTitle),
      nextSteps: nextSteps.length ? nextSteps : d.step4.nextSteps,
      manualNextSteps: manualNextSteps.length ? manualNextSteps : d.step4.manualNextSteps,
      securityBadges: securityBadges.length ? securityBadges : d.step4.securityBadges,
      draftTimerText: asString(s4?.draftTimerText, d.step4.draftTimerText),
      checkoutButtonText: asString(s4?.checkoutButtonText, d.step4.checkoutButtonText),
      manualCheckoutButtonText: asString(s4?.manualCheckoutButtonText, d.step4.manualCheckoutButtonText),
      showPriceInButton: asBool(s4?.showPriceInButton, d.step4.showPriceInButton),
      checkoutImageUrl: asString(s4?.checkoutImageUrl, d.step4.checkoutImageUrl),
      showCheckoutImage: asBool(s4?.showCheckoutImage, d.step4.showCheckoutImage),
    },
  }
}

export function buildPublicSiteConfigPayload(draft: PublicSiteDraft) {
  const nextLanding: any = {
    heroHeadline: {
      line1: draft.landing.heroHeadline.line1.trim(),
      line2: draft.landing.heroHeadline.line2.trim(),
    },
    heroSubtext: draft.landing.heroSubtext.trim(),
    footerCta: {
      headline: draft.landing.footerCta.headline.trim(),
      subtitle: draft.landing.footerCta.subtitle.trim(),
    },
    heroMedia: {
      imageUrl: draft.landing.heroMedia.imageUrl.trim(),
      videoUrl: draft.landing.heroMedia.mode === 'video' ? draft.landing.heroMedia.videoUrl.trim() || null : null,
    },
    heroOverlay: {
      quote: draft.landing.heroOverlay.quote.trim(),
      authorName: draft.landing.heroOverlay.authorName.trim(),
      authorLocation: draft.landing.heroOverlay.authorLocation.trim(),
      authorAvatarUrl: draft.landing.heroOverlay.authorAvatarUrl.trim() || null,
    },
    heroPlayer: {
      enabled: draft.landing.heroPlayer.enabled,
      playingBadgeText: draft.landing.heroPlayer.playingBadgeText.trim(),
      cornerBadgeText: draft.landing.heroPlayer.cornerBadgeText.trim(),
      verifiedBadgeText: draft.landing.heroPlayer.verifiedBadgeText.trim(),
      quote: draft.landing.heroPlayer.quote.trim(),
      authorName: draft.landing.heroPlayer.authorName.trim(),
      authorSubline: draft.landing.heroPlayer.authorSubline.trim(),
      authorAvatarUrl: draft.landing.heroPlayer.authorAvatarUrl.trim() || null,
      audioUrl: draft.landing.heroPlayer.audioUrl.trim() || null,
    },
    audioSamples: {
      nowPlaying: {
        name: draft.landing.audioSamples.nowPlaying.name.trim(),
        quote: draft.landing.audioSamples.nowPlaying.quote.trim(),
        time: draft.landing.audioSamples.nowPlaying.time.trim(),
        metaText: draft.landing.audioSamples.nowPlaying.metaText.trim() || null,
        audioUrl: draft.landing.audioSamples.nowPlaying.audioUrl.trim() || null,
      },
      playlist: draft.landing.audioSamples.playlist.map((x) => ({
        title: x.title.trim(),
        subtitle: x.subtitle.trim(),
        ctaLabel: x.ctaLabel.trim() || 'PUTAR',
        audioUrl: x.audioUrl.trim() || null,
      })),
    },
  }

  const nextToast: any = {
    enabled: draft.activityToast.enabled,
    intervalMs: clampInt(draft.activityToast.intervalMs, 2000, 120000),
    durationMs: clampInt(draft.activityToast.durationMs, 1000, 60000),
    items: draft.activityToast.items.map((x) => ({
      fullName: x.fullName.trim(),
      city: x.city.trim(),
      recipientName: x.recipientName.trim(),
    })),
  }

  const nextCreationDelivery = {
    instantEnabled: draft.creationDelivery.instantEnabled,
    emailOtpEnabled: draft.creationDelivery.emailOtpEnabled,
    whatsappEnabled: draft.creationDelivery.whatsappEnabled,
    agreementEnabled: draft.creationDelivery.agreementEnabled,
    manualConfirmationEnabled: draft.creationDelivery.manualConfirmationEnabled,
    deliveryDelayHours: draft.creationDelivery.deliveryDelayHours,
    paymentAmount: draft.creationDelivery.paymentAmount,
    originalAmount: draft.creationDelivery.originalAmount,
  }

  const nextColors = {
    accentColor: draft.colors.accentColor.trim() || defaultThemeColors.accentColor,
    bgColor1: draft.colors.bgColor1.trim() || defaultThemeColors.bgColor1,
    bgColor2: draft.colors.bgColor2.trim() || defaultThemeColors.bgColor2,
  }

  const logoUrl = draft.logoUrl.trim() || defaultPublicSiteDraft.logoUrl

  const nextTrustBadges = {
    badge1: draft.trustBadges.badge1.trim(),
    badge2: draft.trustBadges.badge2.trim(),
    badge3: draft.trustBadges.badge3.trim(),
  }

  const nextStatsBar = {
    items: draft.statsBar.items.map((x) => ({
      val: x.val.trim(),
      label: x.label.trim(),
    })).filter((x) => x.val || x.label),
  }

  const nextHeroCheckmarks = draft.heroCheckmarks.map((x) => x.trim()).filter((x) => x)

  const nextReviews = {
    sectionLabel: draft.reviews.sectionLabel.trim(),
    sectionHeadline: draft.reviews.sectionHeadline.trim(),
    sectionSubtext: draft.reviews.sectionSubtext.trim(),
    items: draft.reviews.items.map((x) => ({
      style: x.style,
      quote: x.quote.trim(),
      ...(x.style === 'dark-chat' && x.chatMessages ? { chatMessages: x.chatMessages.filter((m) => m.trim()) } : {}),
      authorName: x.authorName.trim(),
      authorMeta: x.authorMeta.trim(),
      authorAvatarUrl: x.authorAvatarUrl.trim(),
    })),
  }

  const nextPromoBanner = {
    enabled: draft.promoBanner.enabled,
    countdownLabel: draft.promoBanner.countdownLabel.trim(),
    countdownTargetDate: draft.promoBanner.countdownTargetDate.trim(),
    promoBadgeText: draft.promoBanner.promoBadgeText.trim(),
    quotaBadgeText: draft.promoBanner.quotaBadgeText.trim(),
    evergreenEnabled: draft.promoBanner.evergreenEnabled,
    evergreenCycleHours: draft.promoBanner.evergreenCycleHours,
  }

  const nextConfigSteps = {
    step0: {
      enabled: draft.configSteps.step0.enabled,
      bannerHeadline: draft.configSteps.step0.bannerHeadline.trim(),
      mainHeadline: draft.configSteps.step0.mainHeadline.trim(),
      guaranteeTitle: draft.configSteps.step0.guaranteeTitle.trim(),
      guaranteeText: draft.configSteps.step0.guaranteeText.trim(),
      howItWorksTitle: draft.configSteps.step0.howItWorksTitle.trim(),
      howItWorksSteps: draft.configSteps.step0.howItWorksSteps.map((s) => ({ title: s.title.trim(), subtitle: s.subtitle.trim() })).filter((s) => s.title),
      bottomCtaText: draft.configSteps.step0.bottomCtaText.trim(),
    },
    step1: {
      headline: draft.configSteps.step1.headline.trim(),
      subtitle: draft.configSteps.step1.subtitle.trim(),
      relationshipChips: draft.configSteps.step1.relationshipChips.map((c) => ({ label: c.label.trim(), icon: c.icon.trim(), value: c.value.trim() })).filter((c) => c.label && c.value),
      nameFieldLabel: draft.configSteps.step1.nameFieldLabel.trim(),
      nameFieldPlaceholder: draft.configSteps.step1.nameFieldPlaceholder.trim(),
      occasionFieldLabel: draft.configSteps.step1.occasionFieldLabel.trim(),
      occasionFieldPlaceholder: draft.configSteps.step1.occasionFieldPlaceholder.trim(),
      socialProofText: draft.configSteps.step1.socialProofText.trim(),
    },
    step2: {
      headline: draft.configSteps.step2.headline.trim(),
      subtitle: draft.configSteps.step2.subtitle.trim(),
      vibeChips: draft.configSteps.step2.vibeChips.map((c) => ({ id: c.id.trim(), label: c.label.trim(), desc: c.desc.trim(), icon: c.icon.trim(), ...(c.badge ? { badge: c.badge.trim() } : {}) })).filter((c) => c.id && c.label),
      voiceLabel: draft.configSteps.step2.voiceLabel.trim(),
      voiceOptions: draft.configSteps.step2.voiceOptions.map((o) => ({ value: o.value.trim(), label: o.label.trim() })).filter((o) => o.value && o.label),
      languageLabel: draft.configSteps.step2.languageLabel.trim(),
      languageOptions: draft.configSteps.step2.languageOptions.map((o) => ({ value: o.value.trim(), label: o.label.trim() })).filter((o) => o.value && o.label),
    },
    step3: {
      headline: draft.configSteps.step3.headline.trim(),
      subtitle: draft.configSteps.step3.subtitle.trim(),
      tipBullets: draft.configSteps.step3.tipBullets.map((b) => b.trim()).filter((b) => b),
      storyPrompts: draft.configSteps.step3.storyPrompts.map((p) => ({ label: p.label.trim(), icon: p.icon.trim() })).filter((p) => p.label),
      textareaPlaceholder: draft.configSteps.step3.textareaPlaceholder.trim(),
    },
    step4: {
      headline: draft.configSteps.step4.headline.trim(),
      subtitleTemplate: draft.configSteps.step4.subtitleTemplate.trim(),
      manualSubtitle: draft.configSteps.step4.manualSubtitle.trim(),
      orderSummaryLabel: draft.configSteps.step4.orderSummaryLabel.trim(),
      whatsappLabel: draft.configSteps.step4.whatsappLabel.trim(),
      whatsappPlaceholder: draft.configSteps.step4.whatsappPlaceholder.trim(),
      emailLabel: draft.configSteps.step4.emailLabel.trim(),
      emailPlaceholder: draft.configSteps.step4.emailPlaceholder.trim(),
      nextStepsTitle: draft.configSteps.step4.nextStepsTitle.trim(),
      nextSteps: draft.configSteps.step4.nextSteps.map((s) => ({ text: s.text.trim() })).filter((s) => s.text),
      manualNextSteps: draft.configSteps.step4.manualNextSteps.map((s) => ({ text: s.text.trim() })).filter((s) => s.text),
      securityBadges: draft.configSteps.step4.securityBadges.map((b) => b.trim()).filter((b) => b),
      draftTimerText: draft.configSteps.step4.draftTimerText.trim(),
      checkoutButtonText: draft.configSteps.step4.checkoutButtonText.trim(),
      manualCheckoutButtonText: draft.configSteps.step4.manualCheckoutButtonText.trim(),
      showPriceInButton: draft.configSteps.step4.showPriceInButton,
      checkoutImageUrl: draft.configSteps.step4.checkoutImageUrl.trim(),
      showCheckoutImage: draft.configSteps.step4.showCheckoutImage,
    },
  }

  return { logoUrl, colors: nextColors, landing: nextLanding, activityToast: nextToast, creationDelivery: nextCreationDelivery, heroCheckmarks: nextHeroCheckmarks, trustBadges: nextTrustBadges, statsBar: nextStatsBar, reviews: nextReviews, promoBanner: nextPromoBanner, configSteps: nextConfigSteps }
}

