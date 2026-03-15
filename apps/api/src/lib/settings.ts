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

// --- In-memory settings cache (TTL-based) ---
let _cachedSettings: Awaited<ReturnType<typeof _fetchSettings>> | null = null
let _cacheExpiresAt = 0
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function _fetchSettings() {
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

export async function getOrCreateSettings() {
  const now = Date.now()
  if (_cachedSettings && now < _cacheExpiresAt) return _cachedSettings
  const settings = await _fetchSettings()
  _cachedSettings = settings
  _cacheExpiresAt = now + SETTINGS_CACHE_TTL_MS
  return settings
}

/** Call after any settings update to force the next read to hit the DB. */
export function invalidateSettingsCache() {
  _cachedSettings = null
  _cacheExpiresAt = 0
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

export async function getOpenAIModel() {
  const settings = await getOrCreateSettings()
  return settings.openaiModel ?? null
}

export async function getKaiAiApiKey() {
  const settings = await getOrCreateSettings()
  return maybeDecrypt(settings.kaiAiApiKeyEnc) ?? process.env.KAI_AI_KEY ?? null
}

