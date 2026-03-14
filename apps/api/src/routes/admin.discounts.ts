import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

const CreateSchema = z.object({
  code: z.string().trim().min(1).max(100),
  fixedAmount: z.number().int().min(0),
  templateSlugs: z.array(z.string()).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  maxUsesPerPhone: z.number().int().min(1).optional().nullable(),
  status: z.enum(['active', 'paused']).optional(),
})

const UpdateSchema = z.object({
  code: z.string().trim().min(1).max(100).optional(),
  fixedAmount: z.number().int().min(0).optional(),
  templateSlugs: z.array(z.string()).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  maxUsesPerPhone: z.number().int().min(1).optional().nullable(),
  status: z.enum(['active', 'paused']).optional(),
})

const ParamsIdSchema = z.object({ id: z.string().min(1) })

export const adminDiscountRoutes: FastifyPluginAsync = async (app) => {
  app.get('/discount-codes', async () => {
    const codes = await prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return codes
  })

  app.post('/discount-codes', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })

    const code = parsed.data.code.toUpperCase()
    if (!code) return reply.code(400).send({ error: 'Code cannot be empty' })

    const existing = await prisma.discountCode.findUnique({ where: { code } })
    if (existing) return reply.code(409).send({ error: 'Code already exists' })

    const record = await prisma.discountCode.create({
      data: {
        code,
        fixedAmount: parsed.data.fixedAmount,
        templateSlugs: parsed.data.templateSlugs ?? Prisma.DbNull,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        maxUsesPerPhone: parsed.data.maxUsesPerPhone ?? null,
        status: parsed.data.status ?? 'active',
      },
    })

    return record
  })

  app.put('/discount-codes/:id', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })

    const existing = await prisma.discountCode.findUnique({ where: { id: params.data.id } })
    if (!existing) return reply.code(404).send({ error: 'not_found' })

    const updateData: Prisma.DiscountCodeUpdateInput = {}
    if (parsed.data.code !== undefined) {
      const newCode = parsed.data.code.toUpperCase()
      if (!newCode) return reply.code(400).send({ error: 'Code cannot be empty' })
      if (newCode !== existing.code) {
        const dup = await prisma.discountCode.findUnique({ where: { code: newCode } })
        if (dup) return reply.code(409).send({ error: 'Code already exists' })
      }
      updateData.code = newCode
    }
    if (parsed.data.fixedAmount !== undefined) updateData.fixedAmount = parsed.data.fixedAmount
    if (parsed.data.templateSlugs !== undefined) updateData.templateSlugs = parsed.data.templateSlugs ?? Prisma.DbNull
    if (parsed.data.startsAt !== undefined) updateData.startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null
    if (parsed.data.endsAt !== undefined) updateData.endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null
    if (parsed.data.maxUsesPerPhone !== undefined) updateData.maxUsesPerPhone = parsed.data.maxUsesPerPhone ?? null
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status

    const updated = await prisma.discountCode.update({
      where: { id: params.data.id },
      data: updateData,
    })

    return updated
  })

  app.delete('/discount-codes/:id', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const existing = await prisma.discountCode.findUnique({ where: { id: params.data.id } })
    if (!existing) return reply.code(404).send({ error: 'not_found' })

    await prisma.discountCode.delete({ where: { id: params.data.id } })
    return { ok: true }
  })
}
