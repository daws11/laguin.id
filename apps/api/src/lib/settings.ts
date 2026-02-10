import { prisma } from './prisma'
import { decryptString } from './crypto'

const defaultPublicSiteConfig = {
  landing: {
    heroMedia: {
      imageUrl:
        'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=2940&auto=format&fit=crop',
      videoUrl: null,
    },
    heroOverlay: {
      quote: 'Dia menangis sebelum chorus berakhir',
      authorName: 'Rina M.',
      authorLocation: 'Jakarta',
      authorAvatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    heroPlayer: {
      enabled: true,
      playingBadgeText: 'Playing',
      cornerBadgeText: "Valentine's Special",
      verifiedBadgeText: 'Verified Purchase',
      quote: 'He tried not to cry. He failed.',
      authorName: 'Rachel M.',
      authorSubline: "London • Valentine's 2025",
      authorAvatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      audioUrl: null,
    },
    audioSamples: {
      nowPlaying: {
        name: 'Untuk Budi, Sepanjang Masa',
        quote: 'Setiap momen bersamamu Budi, dari kencan pertama yang gugup itu...',
        time: '3:24',
        metaText: 'London • Verified',
        audioUrl: null,
      },
      playlist: [
        { title: 'Untuk Rizky, Segalanya Bagiku', subtitle: 'Country • 3:12', ctaLabel: 'PUTAR' },
        { title: 'Untuk Dimas, 10 Tahun Bersama', subtitle: 'Acoustic • 2:58', ctaLabel: 'PUTAR' },
        { title: 'Untuk Andi, Petualangan Kita', subtitle: 'Pop Ballad • 3:45', ctaLabel: 'PUTAR' },
      ],
    },
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
} as const

export async function getOrCreateSettings() {
  const existing = await prisma.settings.findFirst()
  if (existing) return existing
  return prisma.settings.create({
    data: {
      instantEnabled: true,
      deliveryDelayHours: 24,
      whatsappProvider: 'mock',
      publicSiteConfig: defaultPublicSiteConfig as any,
    },
  })
}

export function maybeDecrypt(value: string | null | undefined) {
  if (!value) return null
  try {
    return decryptString(value)
  } catch {
    // Backward-compatible: allow storing plaintext in DB for early MVP
    return value
  }
}

export async function getOpenAIApiKey() {
  const settings = await getOrCreateSettings()
  return maybeDecrypt(settings.openaiApiKeyEnc) ?? process.env.OPENAI_API_KEY ?? null
}

export async function getKaiAiApiKey() {
  const settings = await getOrCreateSettings()
  return maybeDecrypt(settings.kaiAiApiKeyEnc) ?? process.env.KAI_AI_KEY ?? null
}

