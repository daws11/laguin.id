import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { normalizeWhatsappNumber } from '../lib/normalize'

const ValidateSchema = z.object({
  code: z.string().min(1),
  templateSlug: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
})

export const publicDiscountRoutes: FastifyPluginAsync = async (app) => {
  app.post('/public/discount/validate', async (req, reply) => {
    const parsed = ValidateSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ valid: false, error: 'Invalid request' })

    const code = parsed.data.code.toUpperCase().trim()
    const discount = await prisma.discountCode.findUnique({ where: { code } })

    if (!discount) return { valid: false, error: 'Kode diskon tidak ditemukan.' }
    if (discount.status !== 'active') return { valid: false, error: 'Kode diskon tidak aktif.' }

    const now = new Date()
    if (discount.startsAt && now < discount.startsAt) return { valid: false, error: 'Kode diskon belum berlaku.' }
    if (discount.endsAt && now > discount.endsAt) return { valid: false, error: 'Kode diskon sudah kadaluarsa.' }

    if (discount.templateSlugs) {
      const allowedSlugs = discount.templateSlugs as string[]
      if (Array.isArray(allowedSlugs) && allowedSlugs.length > 0) {
        if (!parsed.data.templateSlug || !allowedSlugs.includes(parsed.data.templateSlug)) {
          return { valid: false, error: 'Kode diskon tidak berlaku untuk produk ini.' }
        }
      }
    }

    if (discount.maxUsesPerPhone && parsed.data.phoneNumber) {
      const normalizedPhone = normalizeWhatsappNumber(parsed.data.phoneNumber)
      const usageCount = await prisma.order.count({
        where: {
          discountCode: code,
          customer: { whatsappNumber: normalizedPhone },
        },
      })
      if (usageCount >= discount.maxUsesPerPhone) {
        return { valid: false, error: 'Kode diskon sudah mencapai batas penggunaan untuk nomor ini.' }
      }
    }

    return { valid: true, discountAmount: discount.fixedAmount }
  })
}
