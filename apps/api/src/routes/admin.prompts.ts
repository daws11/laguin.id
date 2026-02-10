import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { RecommendedPromptTemplates, SupportedPlaceholders, validatePlaceholders } from 'shared'

import { prisma } from '../lib/prisma'

const QuerySchema = z.object({
  type: z.enum(['lyrics', 'mood_description', 'music']).optional(),
})

const CreateSchema = z.object({
  type: z.enum(['lyrics', 'mood_description', 'music']),
  templateText: z.string().min(1),
  kaiSettings: z.unknown().optional(),
  makeActive: z.boolean().optional().default(true),
})

const UpdateSchema = z.object({
  templateText: z.string().min(1).optional(),
  kaiSettings: z.unknown().optional(),
})

const ParamsIdSchema = z.object({ id: z.string().min(1) })

export const adminPromptRoutes: FastifyPluginAsync = async (app) => {
  app.get('/placeholders', async () => {
    return { supported: SupportedPlaceholders }
  })

  app.post('/prompt-templates/recommended', async () => {
    const types = ['lyrics', 'mood_description', 'music'] as const
    const created = await prisma.$transaction(async (tx) => {
      const results: any[] = []
      for (const type of types) {
        const latest = await tx.promptTemplate.findFirst({
          where: { type },
          orderBy: { version: 'desc' },
        })
        const version = (latest?.version ?? 0) + 1

        const kaiSettings =
          type === 'music'
            ? {
                tags: ['valentine', 'romantic'],
                vocal: 'mixed',
              }
            : undefined

        const t = await tx.promptTemplate.create({
          data: {
            type,
            templateText: RecommendedPromptTemplates[type],
            kaiSettings,
            version,
            isActive: true,
          },
        })

        await tx.promptTemplate.updateMany({
          where: { type, id: { not: t.id } },
          data: { isActive: false },
        })

        results.push({
          ...t,
          placeholderValidation: validatePlaceholders(t.templateText),
        })
      }
      return results
    })

    return { ok: true, created }
  })

  app.get('/prompt-templates', async (req, reply) => {
    const q = QuerySchema.safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'invalid_query' })

    const items = await prisma.promptTemplate.findMany({
      where: q.data.type ? { type: q.data.type } : undefined,
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    })

    return items.map((t) => ({
      ...t,
      placeholderValidation: validatePlaceholders(t.templateText),
    }))
  })

  app.post('/prompt-templates', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })

    const { type, templateText, kaiSettings, makeActive } = parsed.data

    const latest = await prisma.promptTemplate.findFirst({
      where: { type },
      orderBy: { version: 'desc' },
    })
    const version = (latest?.version ?? 0) + 1

    const created = await prisma.promptTemplate.create({
      data: {
        type,
        templateText,
        kaiSettings: kaiSettings ?? undefined,
        version,
        isActive: makeActive,
      },
    })

    if (makeActive) {
      await prisma.promptTemplate.updateMany({
        where: {
          type,
          id: { not: created.id },
        },
        data: { isActive: false },
      })
    }

    return {
      ...created,
      placeholderValidation: validatePlaceholders(created.templateText),
    }
  })

  app.put('/prompt-templates/:id', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })

    const updated = await prisma.promptTemplate.update({
      where: { id: params.data.id },
      data: {
        templateText: parsed.data.templateText ?? undefined,
        kaiSettings: parsed.data.kaiSettings ?? undefined,
      },
    })

    return {
      ...updated,
      placeholderValidation: validatePlaceholders(updated.templateText),
    }
  })

  app.post('/prompt-templates/:id/activate', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const template = await prisma.promptTemplate.findUnique({ where: { id: params.data.id } })
    if (!template) return reply.code(404).send({ error: 'not_found' })

    await prisma.$transaction([
      prisma.promptTemplate.updateMany({
        where: { type: template.type },
        data: { isActive: false },
      }),
      prisma.promptTemplate.update({
        where: { id: template.id },
        data: { isActive: true },
      }),
    ])

    const active = await prisma.promptTemplate.findUnique({ where: { id: template.id } })
    return { ...active, placeholderValidation: validatePlaceholders(active?.templateText ?? template.templateText) }
  })
}

