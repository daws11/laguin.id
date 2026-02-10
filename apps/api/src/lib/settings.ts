import { prisma } from './prisma'
import { decryptString } from './crypto'

export async function getOrCreateSettings() {
  const existing = await prisma.settings.findFirst()
  if (existing) return existing
  return prisma.settings.create({
    data: {
      instantEnabled: true,
      deliveryDelayHours: 24,
      whatsappProvider: 'mock',
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

