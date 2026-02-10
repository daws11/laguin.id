import { loadEnv } from '../src/lib/env'

loadEnv()

import { PrismaClient, PromptTemplateType } from '@prisma/client'
import { RecommendedPromptTemplates } from 'shared'

const prisma = new PrismaClient()

async function ensureSingletonSettings() {
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

async function upsertActivePromptTemplate(type: PromptTemplateType, templateText: string, kaiSettings?: unknown) {
  const existingActive = await prisma.promptTemplate.findFirst({ where: { type, isActive: true } })
  if (existingActive) return existingActive

  const created = await prisma.promptTemplate.create({
    data: {
      type,
      templateText,
      kaiSettings: kaiSettings ?? undefined,
      version: 1,
      isActive: true,
    },
  })
  return created
}

async function main() {
  await ensureSingletonSettings()

  await upsertActivePromptTemplate(
    'lyrics',
    RecommendedPromptTemplates.lyrics,
  )

  await upsertActivePromptTemplate(
    'mood_description',
    RecommendedPromptTemplates.mood_description,
  )

  await upsertActivePromptTemplate(
    'music',
    RecommendedPromptTemplates.music,
    {
      tags: ['valentine', 'romantic'],
      vocal: 'mixed',
    },
  )
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

