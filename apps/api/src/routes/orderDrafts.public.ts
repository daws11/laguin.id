import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'
import { normalizeEmail, normalizeWhatsappNumber } from '../lib/normalize'

const UpsertSchema = z.object({
  draftKey: z.string().min(20),
  step: z.number().int().min(0).max(4),
  relationship: z.string().max(64).optional().nullable(),
  emailVerificationId: z.string().min(1).optional().nullable(),
  formValues: z
    .object({
      yourName: z.string().optional(),
      recipientName: z.string().optional(),
      occasion: z.string().optional(),
      story: z.string().optional(),
      musicPreferences: z
        .object({
          genre: z.string().optional(),
          mood: z.string().optional(),
          vibe: z.string().optional(),
          tempo: z.string().optional(),
          voiceStyle: z.string().optional(),
          language: z.string().optional(),
        })
        .optional(),
      whatsappNumber: z.string().optional(),
      email: z.string().optional(),
      extraNotes: z.string().optional(),
      agreementAccepted: z.boolean().optional(),
      emailVerificationId: z.string().optional(),
    })
    .strict(),
})

const ParamsSchema = z.object({
  draftKey: z.string().min(20),
})

export const orderDraftsRoutes: FastifyPluginAsync = async (app) => {
  // Best-effort persistence for configurator progress.
  // `draftKey` is treated as a secret bearer token stored client-side.
  app.post('/order-drafts/upsert', async (req, reply) => {
    const parsed = UpsertSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      })
    }

    const input = parsed.data
    const emailLower = input.formValues.email ? normalizeEmail(input.formValues.email) : null
    const whatsappNumberRaw = input.formValues.whatsappNumber ?? ''
    const whatsappNumber = whatsappNumberRaw ? normalizeWhatsappNumber(whatsappNumberRaw) : null

    const row = await prisma.orderDraft.upsert({
      where: { draftKey: input.draftKey },
      create: {
        draftKey: input.draftKey,
        step: input.step,
        relationship: input.relationship ?? null,
        formValues: input.formValues,
        emailLower,
        whatsappNumber: whatsappNumber || null,
        emailVerificationId: input.emailVerificationId ?? null,
      },
      update: {
        step: input.step,
        relationship: input.relationship ?? null,
        formValues: input.formValues,
        emailLower,
        whatsappNumber: whatsappNumber || null,
        emailVerificationId: input.emailVerificationId ?? null,
      },
      select: { id: true },
    })

    return { ok: true, draftId: row.id }
  })

  // Optional recovery endpoint (requires secret `draftKey`).
  app.get('/order-drafts/:draftKey', async (req, reply) => {
    const parsed = ParamsSchema.safeParse(req.params)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_params' })

    const rec = await prisma.orderDraft.findUnique({
      where: { draftKey: parsed.data.draftKey },
      select: {
        draftKey: true,
        step: true,
        relationship: true,
        formValues: true,
        emailVerificationId: true,
        updatedAt: true,
      },
    })
    if (!rec) return reply.code(404).send({ error: 'not_found' })

    return { ok: true, draft: rec }
  })
}

