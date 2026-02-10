import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'
import { getWhatsAppProvider } from '../whatsapp'
import { sendEmail } from '../lib/mailer'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function computeBackoffSeconds(failureCount: number) {
  // failureCount is the number of failures seen so far; next attempt is failureCount+1.
  // Backoff: 60s, 120s, 240s, ... capped at 3600s (1h)
  const exp = clamp(failureCount, 0, 16)
  return clamp(60 * 2 ** exp, 60, 60 * 60)
}

function buildSongReadyEmail(params: { customerName: string; trackUrl: string }) {
  const subject = 'Lagu kamu sudah siap'
  const text = [
    `Hai ${params.customerName},`,
    '',
    'Lagu kamu sudah selesai dibuat dan sudah siap untuk didengarkan.',
    '',
    `Link lagu: ${params.trackUrl}`,
    '',
    'Terima kasih!',
  ].join('\n')

  const html = [
    `<p>Hai <b>${escapeHtml(params.customerName)}</b>,</p>`,
    `<p>Lagu kamu sudah selesai dibuat dan sudah siap untuk didengarkan.</p>`,
    `<p><a href="${escapeHtmlAttr(params.trackUrl)}">Klik di sini untuk membuka lagu</a></p>`,
    `<p>Jika link tidak bisa diklik, copy-paste ini:</p>`,
    `<p><code>${escapeHtml(params.trackUrl)}</code></p>`,
    `<p>Terima kasih!</p>`,
  ].join('\n')

  return { subject, text, html }
}

function escapeHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function escapeHtmlAttr(s: string) {
  // conservative escaping for attribute context
  return escapeHtml(s)
}

async function scheduleDeliveryRetry(params: { orderId: string; reason: string; error?: unknown }) {
  const { orderId, reason, error } = params
  const failureCount = await prisma.orderEvent.count({
    where: {
      orderId,
      type: { in: ['email_song_failed', 'whatsapp_reminder_failed', 'delivery_exception'] },
    },
  })
  const delaySeconds = computeBackoffSeconds(failureCount)
  const nextAt = new Date(Date.now() + delaySeconds * 1000)

  await prisma.order.update({
    where: { id: orderId },
    data: {
      deliveryStatus: 'delivery_pending',
      deliveryScheduledAt: nextAt,
    },
  })

  await addOrderEvent({
    orderId,
    type: 'delivery_retry_scheduled',
    message: reason,
    data: {
      delaySeconds,
      nextAt: nextAt.toISOString(),
      error: error instanceof Error ? { name: error.name, message: error.message } : (error as any),
    } as any,
  })

  return { ok: false, scheduledRetry: true, delaySeconds, nextAt }
}

async function finalizeDeliveryIfReady(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { deliveredAt: true, deliveryStatus: true },
  })
  if (!order) return { ok: false, reason: 'not_found' }
  if (order.deliveredAt || order.deliveryStatus === 'delivered') return { ok: true, alreadyDelivered: true }

  const sent = await prisma.orderEvent.findMany({
    where: { orderId, type: { in: ['email_song_sent', 'whatsapp_reminder_sent'] } },
    select: { type: true },
  })
  const types = new Set(sent.map((e) => e.type))
  const ready = types.has('email_song_sent') && types.has('whatsapp_reminder_sent')
  if (!ready) return { ok: true, ready: false }

  await prisma.order.update({
    where: { id: orderId },
    data: { deliveryStatus: 'delivered', deliveredAt: new Date() },
  })
  await addOrderEvent({
    orderId,
    type: 'delivered',
    message: 'Delivered: email song link + WhatsApp reminder sent.',
  })
  return { ok: true, ready: true, finalized: true }
}

export async function sendSongEmailForOrder(orderId: string, opts?: { force?: boolean }) {
  const force = opts?.force === true
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  })
  if (!order) throw new Error('Order not found')
  if (order.status !== 'completed') throw new Error(`Invalid status=${order.status}`)
  if (!order.trackUrl) throw new Error('Missing trackUrl (music not generated)')
  if (!order.customer.email) throw new Error('Missing customer email')

  if (!force) {
    const existing = await prisma.orderEvent.findFirst({
      where: { orderId, type: 'email_song_sent' },
      select: { id: true },
    })
    if (existing) return { ok: true, skipped: true, reason: 'already_sent' }
  }

  const { subject, text, html } = buildSongReadyEmail({
    customerName: order.customer.name,
    trackUrl: order.trackUrl,
  })

  try {
    await sendEmail({ to: order.customer.email, subject, text, html })
    await addOrderEvent({
      orderId,
      type: 'email_song_sent',
      message: `${force ? 'Resent' : 'Sent'} song via email to ${order.customer.email}`,
      data: { to: order.customer.email, force } as any,
    })
  } catch (e: unknown) {
    await addOrderEvent({
      orderId,
      type: 'email_song_failed',
      message: e instanceof Error ? e.message : String(e),
    })
    return await scheduleDeliveryRetry({ orderId, reason: 'Email send failed; scheduling retry.', error: e })
  }

  await finalizeDeliveryIfReady(orderId)
  return { ok: true }
}

export async function sendWhatsAppReminderForOrder(orderId: string, opts?: { force?: boolean }) {
  const force = opts?.force === true
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  })
  if (!order) throw new Error('Order not found')
  if (order.status !== 'completed') throw new Error(`Invalid status=${order.status}`)
  if (!order.trackUrl) throw new Error('Missing trackUrl (music not generated)')

  if (!force) {
    const existing = await prisma.orderEvent.findFirst({
      where: { orderId, type: 'whatsapp_reminder_sent' },
      select: { id: true },
    })
    if (existing) return { ok: true, skipped: true, reason: 'already_sent' }
  }

  const provider = await getWhatsAppProvider()
  const result = await provider.send({
    to: order.customer.whatsappNumber,
    message: '',
    ...({ orderId } as any),
  })

  if (!result.ok) {
    await addOrderEvent({
      orderId,
      type: 'whatsapp_reminder_failed',
      message: result.error ?? 'WhatsApp reminder send failed',
      data: { ...result, force } as any,
    })
    return await scheduleDeliveryRetry({ orderId, reason: 'WhatsApp reminder failed; scheduling retry.', error: result })
  }

  await addOrderEvent({
    orderId,
    type: 'whatsapp_reminder_sent',
    message: force ? 'Resent WhatsApp reminder' : undefined,
    data: result as any,
  })

  await finalizeDeliveryIfReady(orderId)
  return { ok: true }
}

export async function deliverCompletedOrder(
  orderId: string,
  opts?: {
    forceEmail?: boolean
    forceWhatsApp?: boolean
  }
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  })
  if (!order) throw new Error('Order not found')
  if (order.status !== 'completed') return { skipped: true, reason: `status=${order.status}` }
  if (!order.trackUrl) throw new Error('Missing trackUrl (music not generated)')

  if (!order.customer.email) {
    await prisma.order.update({
      where: { id: orderId },
      data: { deliveryStatus: 'delivery_failed' },
    })
    await addOrderEvent({
      orderId,
      type: 'delivery_failed',
      message: 'Missing customer email; cannot deliver song via email.',
    })
    return { ok: false, nonRetryable: true }
  }

  const emailRes = await sendSongEmailForOrder(orderId, { force: opts?.forceEmail === true })
  if (!(emailRes as any)?.ok) return emailRes as any

  const waRes = await sendWhatsAppReminderForOrder(orderId, { force: opts?.forceWhatsApp === true })
  if (!(waRes as any)?.ok) return waRes as any

  await finalizeDeliveryIfReady(orderId)
  return { ok: true }
}

