import type { FastifyPluginAsync } from 'fastify'
import { OrderInputSchema } from 'shared'
import { z } from 'zod'

import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'
import { getOrCreateSettings, maybeDecrypt } from '../lib/settings'
import { normalizeEmail, normalizeWhatsappNumber } from '../lib/normalize'
import { sendMetaCapiEvent } from '../lib/metaCapi'
import { createXenditInvoice } from '../lib/xendit'

const ParamsSchema = z.object({ id: z.string().min(1) })

export const publicOrdersRoutes: FastifyPluginAsync = async (app) => {
  app.post('/orders/draft', async (req, reply) => {
    const parsed = OrderInputSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      })
    }

    const input = parsed.data
    const themeSlug = typeof (req.body as any)?.themeSlug === 'string' ? (req.body as any).themeSlug : null
    const draftKey = typeof (req.body as any)?.draftKey === 'string' && (req.body as any).draftKey.length >= 20
      ? (req.body as any).draftKey
      : null
    const customerName = input.yourName ?? input.recipientName
    const settings = await getOrCreateSettings()
    const emailLower = normalizeEmail(input.email)
    const whatsappNumber = input.whatsappNumber ? normalizeWhatsappNumber(input.whatsappNumber) : null

    let themeCD: any = null
    let upsellCatalog: Array<{ id: string; title: string; price: number; icon: string; action?: string; actionConfig?: any }> = []

    const extractUpsellCatalog = (src: any): Array<{ id: string; title: string; price: number; icon: string; action?: string; actionConfig?: any }> => {
      if (!src || typeof src !== 'object' || !src.enabled || !Array.isArray(src.items)) return []
      return src.items
        .filter((it: any) => it && typeof it === 'object' && typeof it.id === 'string' && typeof it.title === 'string' && typeof it.price === 'number' && Number.isInteger(it.price) && it.price >= 0)
        .map((it: any) => ({
          id: it.id as string,
          title: it.title as string,
          price: it.price as number,
          icon: typeof it.icon === 'string' ? it.icon : '',
          action: typeof it.action === 'string' && it.action !== 'none' ? it.action : undefined,
          actionConfig: it.action === 'express_delivery' && it.actionConfig && typeof it.actionConfig === 'object' ? it.actionConfig : undefined,
        }))
    }

    if (themeSlug) {
      const theme = await prisma.theme.findUnique({ where: { slug: themeSlug } })
      if (theme?.settings && typeof theme.settings === 'object') {
        const ts = theme.settings as any
        if (ts.creationDelivery && typeof ts.creationDelivery === 'object') {
          themeCD = ts.creationDelivery
        }
        upsellCatalog = extractUpsellCatalog(ts.upsell)
      }
    } else {
      const psc = (settings as any).publicSiteConfig
      if (psc && typeof psc === 'object') {
        upsellCatalog = extractUpsellCatalog(psc.upsell)
      }
    }

    const manualConfirmationEnabled = themeCD ? (themeCD.manualConfirmationEnabled ?? false) : ((settings as any).manualConfirmationEnabled ?? false)
    const emailOtpEnabled = themeCD ? (themeCD.emailOtpEnabled ?? true) : (settings.emailOtpEnabled ?? true)
    const whatsappEnabled = themeCD ? (themeCD.whatsappEnabled ?? true) : true
    const agreementEnabled = themeCD ? (themeCD.agreementEnabled ?? false) : (settings.agreementEnabled ?? false)

    if (agreementEnabled && !(input as { agreementAccepted?: boolean }).agreementAccepted) {
      return reply.code(400).send({ error: 'Centang persetujuan untuk melanjutkan.' })
    }

    // When manual confirmation is enabled, the public flow must NOT require email/OTP.
    // Admin will manually coordinate confirmation/delivery out-of-band.
    if (!manualConfirmationEnabled && emailOtpEnabled) {
      // Enforce that email has been verified (OTP) before creating draft order.
      const verificationId = input.emailVerificationId
      if (!verificationId) {
        return reply.code(400).send({ error: 'Email belum terverifikasi. Kirim OTP dulu.' })
      }
      const verification = await prisma.emailVerification.findUnique({
        where: { id: verificationId },
      })
      if (!verification) {
        return reply.code(400).send({ error: 'Email belum terverifikasi. Kirim OTP dulu.' })
      }
      if (verification.email !== emailLower) {
        return reply.code(400).send({ error: 'Email tidak cocok dengan OTP verifikasi.' })
      }
      if (!verification.verifiedAt) {
        return reply.code(400).send({ error: 'Email belum terverifikasi. Masukkan OTP yang benar.' })
      }
      if (verification.expiresAt.getTime() < Date.now()) {
        return reply.code(400).send({ error: 'OTP sudah kadaluarsa. Kirim ulang kode verifikasi.' })
      }
    }

    const allowMultipleOrders = (settings as any).allowMultipleOrdersPerWhatsapp ?? false

    if (whatsappEnabled) {
      if (!whatsappNumber) {
        return reply.code(400).send({ error: 'Nomor WhatsApp tidak valid.' })
      }
      if (!allowMultipleOrders) {
        const existingByWhatsapp = await prisma.customer.findUnique({
          where: { whatsappNumber },
          select: { id: true },
        })
        if (existingByWhatsapp) {
          return reply
            .code(409)
            .send({
              error: 'duplicate_whatsapp',
              message:
                'Nomor WhatsApp ini sudah terdaftar dan pernah digunakan untuk membuat pesanan. Untuk menjaga keamanan dan kualitas layanan, setiap nomor WhatsApp hanya dapat melakukan pemesanan satu kali.',
            })
        }
      }
    }
    const emailRequired = !manualConfirmationEnabled && emailOtpEnabled
    if (emailRequired) {
      if (!emailLower) return reply.code(400).send({ error: 'Email tidak valid.' })
      if (!allowMultipleOrders) {
        const existingByEmail = await prisma.customer.findFirst({
          where: { emailLower },
          select: { id: true },
        })
        if (existingByEmail) {
          return reply.code(409).send({ error: 'Email sudah terdaftar. Setiap email hanya bisa mendaftar sekali.' })
        }
      }
    }

    const normalizedInput = {
      ...input,
      ...(typeof input.email === 'string' ? { email: input.email.trim() } : {}),
      whatsappNumber,
      musicPreferences: {
        ...input.musicPreferences,
        ...(typeof input.musicPreferences.voiceStyle === 'string'
          ? { voiceStyle: input.musicPreferences.voiceStyle.toLowerCase() }
          : {}),
      },
    }

    const rawPaymentAmount = themeCD ? (themeCD.paymentAmount ?? 497000) : 497000
    let paymentAmount = typeof rawPaymentAmount === 'number' && Number.isFinite(rawPaymentAmount) && rawPaymentAmount >= 0 ? Math.floor(rawPaymentAmount) : 497000
    let appliedDiscountCode: string | null = null
    let appliedDiscountAmount: number | null = null

    const discountCodeInput = typeof (req.body as any)?.discountCode === 'string' ? (req.body as any).discountCode.toUpperCase().trim() : null
    if (discountCodeInput) {
      const discount = await prisma.discountCode.findUnique({ where: { code: discountCodeInput } })
      if (!discount || discount.status !== 'active') {
        return reply.code(400).send({ error: 'Kode diskon tidak valid.' })
      }
      const now = new Date()
      if (discount.startsAt && now < discount.startsAt) {
        return reply.code(400).send({ error: 'Kode diskon belum berlaku.' })
      }
      if (discount.endsAt && now > discount.endsAt) {
        return reply.code(400).send({ error: 'Kode diskon sudah kadaluarsa.' })
      }
      if (discount.templateSlugs) {
        const allowedSlugs = discount.templateSlugs as string[]
        if (Array.isArray(allowedSlugs) && allowedSlugs.length > 0) {
          if (!themeSlug || !allowedSlugs.includes(themeSlug)) {
            return reply.code(400).send({ error: 'Kode diskon tidak berlaku untuk produk ini.' })
          }
        }
      }
      if (discount.maxUsesPerPhone && whatsappNumber) {
        const usageCount = await prisma.order.count({
          where: {
            discountCode: discountCodeInput,
            customer: { whatsappNumber },
          },
        })
        if (usageCount >= discount.maxUsesPerPhone) {
          return reply.code(400).send({ error: 'Kode diskon sudah mencapai batas penggunaan.' })
        }
      }
      appliedDiscountCode = discountCodeInput
      appliedDiscountAmount = discount.fixedAmount
      paymentAmount = Math.max(0, paymentAmount - discount.fixedAmount)
    }

    const rawUpsells = (req.body as any)?.upsells
    let validatedUpsells: Array<{ id: string; title: string; price: number; icon: string; action?: string; actionConfig?: any }> | null = null
    if (Array.isArray(rawUpsells)) {
      if (rawUpsells.length === 0) {
        validatedUpsells = []
      } else {
        validatedUpsells = []
        const seenIds = new Set<string>()
        for (const item of rawUpsells) {
          if (!item || typeof item !== 'object') continue
          const clientId = typeof item.id === 'string' ? item.id : ''
          if (!clientId) {
            return reply.code(400).send({ error: 'Invalid upsell item.' })
          }
          if (seenIds.has(clientId)) continue
          seenIds.add(clientId)
          const catalogItem = upsellCatalog.find((c) => c.id === clientId)
          if (!catalogItem) {
            return reply.code(400).send({ error: `Unknown upsell item: ${clientId}` })
          }
          validatedUpsells.push({
            id: catalogItem.id,
            title: catalogItem.title,
            price: catalogItem.price,
            icon: catalogItem.icon,
            action: catalogItem.action,
            actionConfig: catalogItem.actionConfig,
          })
          paymentAmount += catalogItem.price
        }
      }
    }

    let customer: { id: string }
    if (allowMultipleOrders) {
      let existing: { id: string } | null = null
      if (whatsappEnabled && whatsappNumber) {
        existing = await prisma.customer.findUnique({
          where: { whatsappNumber },
          select: { id: true },
        })
      }
      if (!existing && emailRequired && emailLower) {
        existing = await prisma.customer.findFirst({
          where: { emailLower },
          select: { id: true },
        })
      }
      if (existing) {
        customer = existing
      } else {
        customer = await prisma.customer.create({
          data: {
            name: customerName,
            whatsappNumber: (whatsappEnabled ? whatsappNumber : null) as any,
            ...(emailRequired
              ? {
                  email: (normalizedInput as any).email,
                  emailLower,
                }
              : { email: null, emailLower: null }),
          },
          select: { id: true },
        })
      }
    } else {
      try {
        customer = await prisma.customer.create({
          data: {
            name: customerName,
            whatsappNumber: (whatsappEnabled ? whatsappNumber : null) as any,
            ...(emailRequired
              ? {
                  email: (normalizedInput as any).email,
                  emailLower,
                }
              : { email: null, emailLower: null }),
          },
          select: { id: true },
        })
      } catch (e: any) {
        if (e?.code === 'P2002') {
          return reply.code(409).send({ error: 'Email atau nomor WhatsApp sudah terdaftar.' })
        }
        throw e
      }
    }

    const xenditConfigured = Boolean(maybeDecrypt((settings as any).xenditSecretKeyEnc))
    const shouldCreateInvoice = xenditConfigured && paymentAmount > 0

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        inputPayload: normalizedInput,
        status: 'created',
        deliveryStatus: 'delivery_pending',
        paymentStatus: paymentAmount === 0 ? 'free' : 'pending',
        themeSlug,
        discountCode: appliedDiscountCode,
        discountAmount: appliedDiscountAmount,
        upsellItems: validatedUpsells !== null ? (validatedUpsells as any) : undefined,
      },
    })

    if (draftKey) {
      await prisma.orderDraft.updateMany({
        where: { draftKey, convertedOrderId: null },
        data: { convertedOrderId: order.id },
      }).catch(() => {})
    }

    await addOrderEvent({
      orderId: order.id,
      type: 'order_created',
      message: 'Order draft created from configurator.',
    })

    void sendMetaCapiEvent({
      req,
      eventName: 'Lead',
      eventId: `order_created:${order.id}`,
      email: manualConfirmationEnabled ? null : ((normalizedInput as any).email ?? null),
      phone: whatsappNumber,
      externalId: customer.id,
      customData: {
        order_id: order.id,
        value: 0,
        currency: 'IDR',
      },
    })

    if (shouldCreateInvoice) {
      try {
        const host = req.headers['x-forwarded-host'] || req.headers.host || ''
        const proto = req.headers['x-forwarded-proto'] || 'https'
        const baseUrl = `${proto}://${host}`

        const invoice = await createXenditInvoice({
          externalId: order.id,
          amount: paymentAmount,
          payerEmail: (normalizedInput as any).email ?? undefined,
          description: `Lagu personal untuk ${(normalizedInput as any).recipientName ?? 'pasangan'}`,
          successRedirectUrl: `${baseUrl}/order/${order.id}`,
          failureRedirectUrl: `${baseUrl}/order/${order.id}`,
        })

        await prisma.order.update({
          where: { id: order.id },
          data: {
            xenditInvoiceId: invoice.id,
            xenditInvoiceUrl: invoice.invoice_url,
          },
        })

        await addOrderEvent({
          orderId: order.id,
          type: 'xendit_invoice_created',
          message: `Xendit invoice created: ${invoice.id}`,
        })

        if (!manualConfirmationEnabled) {
          return { orderId: order.id, xenditInvoiceUrl: invoice.invoice_url }
        }
      } catch (err: any) {
        app.log.error({ err, orderId: order.id }, 'Failed to create Xendit invoice')
        if (!manualConfirmationEnabled) {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'failed', errorMessage: 'Gagal membuat invoice pembayaran.' },
          })
          return reply.code(500).send({ error: 'Gagal membuat invoice pembayaran. Silakan coba lagi.' })
        }
        await addOrderEvent({
          orderId: order.id,
          type: 'xendit_invoice_failed',
          message: `Xendit invoice creation failed (non-critical, manual mode): ${err.message ?? 'unknown'}`,
        })
      }
    }

    return { orderId: order.id }
  })

  app.get('/orders/:id', async (req, reply) => {
    const paramsParsed = ParamsSchema.safeParse(req.params)
    if (!paramsParsed.success) return reply.code(400).send({ error: 'invalid_params' })

    const order = await prisma.order.findUnique({
      where: { id: paramsParsed.data.id },
      include: {
        customer: true,
      },
    })
    if (!order) return reply.code(404).send({ error: 'not_found' })

    return {
      id: order.id,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      paymentStatus: order.paymentStatus,
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        whatsappNumber: order.customer.whatsappNumber,
      },
      inputPayload: order.inputPayload,
      lyricsText: order.lyricsText,
      moodDescription: order.moodDescription,
      trackUrl: order.trackUrl,
      confirmedAt: order.confirmedAt,
      generationCompletedAt: order.generationCompletedAt,
      deliveryScheduledAt: order.deliveryScheduledAt,
      deliveredAt: order.deliveredAt,
      errorMessage: order.errorMessage,
      themeSlug: order.themeSlug ?? null,
      xenditInvoiceUrl: order.xenditInvoiceUrl ?? null,
    }
  })

  app.post('/orders/:id/confirm', async (req, reply) => {
    const paramsParsed = ParamsSchema.safeParse(req.params)
    if (!paramsParsed.success) return reply.code(400).send({ error: 'invalid_params' })

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: paramsParsed.data.id } })
      if (!order) return null

      if (order.status === 'completed') return order
      if (order.status === 'failed') {
        // allow manual retry via admin; public confirm should not override failed state
        return order
      }

      const next = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'processing',
          confirmedAt: order.confirmedAt ?? new Date(),
          deliveryStatus: 'delivery_pending',
          errorMessage: null,
        },
      })
      return next
    })

    if (!updated) return reply.code(404).send({ error: 'not_found' })

    await addOrderEvent({
      orderId: updated.id,
      type: 'order_confirmed',
      message: 'Order confirmed from checkout.',
    })

    // Meta Conversions API (server-side): confirm ~= Purchase for this flow (value is free).
    void sendMetaCapiEvent({
      req,
      eventName: 'Purchase',
      eventId: `order_confirmed:${updated.id}`,
      // We need email/phone; fetch minimal details (non-blocking, best-effort).
      // If this fails, we still send the response.
      ...(await (async () => {
        try {
          const full = await prisma.order.findUnique({
            where: { id: updated.id },
            include: { customer: true },
          })
          const email = (full?.customer?.email ?? null) as string | null
          const phone = (full?.customer?.whatsappNumber ?? null) as string | null
          const externalId = (full?.customer?.id ?? null) as string | null
          return { email, phone, externalId }
        } catch {
          return { email: null, phone: null, externalId: null }
        }
      })()),
      customData: {
        order_id: updated.id,
        value: 0,
        currency: 'IDR',
      },
    })

    return { ok: true, orderId: updated.id, status: updated.status }
  })
}

