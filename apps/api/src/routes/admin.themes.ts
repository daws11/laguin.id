import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'
import { getOrCreateSettings } from '../lib/settings'

const SlugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{2}$/

const CreateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(SlugRegex, 'slug must be lowercase alphanumeric + hyphens only'),
  name: z.string().min(1).max(200),
  isActive: z.boolean().optional(),
  settings: z.unknown().optional(),
})

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
  settings: z.unknown().optional(),
})

const SlugParamSchema = z.object({
  slug: z.string().min(1),
})

export const adminThemeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/themes', async () => {
    const themes = await prisma.theme.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return themes
  })

  app.post('/themes', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })
    }

    const existing = await prisma.theme.findUnique({ where: { slug: parsed.data.slug } })
    if (existing) {
      return reply.code(409).send({ error: 'slug_taken', message: 'A theme with this slug already exists.' })
    }

    const theme = await prisma.theme.create({
      data: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        isActive: parsed.data.isActive ?? true,
        settings: parsed.data.settings ?? null,
      },
    })

    return theme
  })

  app.put('/themes/:slug', async (req, reply) => {
    const params = SlugParamSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })
    }

    const existing = await prisma.theme.findUnique({ where: { slug: params.data.slug } })
    if (!existing) return reply.code(404).send({ error: 'not_found' })

    const updated = await prisma.theme.update({
      where: { slug: params.data.slug },
      data: {
        name: parsed.data.name,
        isActive: parsed.data.isActive,
        settings: parsed.data.settings,
      },
    })

    return updated
  })

  app.delete('/themes/:slug', async (req, reply) => {
    const params = SlugParamSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const existing = await prisma.theme.findUnique({ where: { slug: params.data.slug } })
    if (!existing) return reply.code(404).send({ error: 'not_found' })

    const settings = await getOrCreateSettings()
    if (settings.defaultThemeSlug === params.data.slug) {
      return reply.code(400).send({ error: 'cannot_delete_default', message: 'Cannot delete the default theme.' })
    }

    await prisma.theme.delete({ where: { slug: params.data.slug } })
    return { ok: true }
  })
}
