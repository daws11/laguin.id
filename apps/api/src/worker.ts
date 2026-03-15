import { loadEnv } from './lib/env'

loadEnv()

if (!process.env.DATABASE_URL) {
  console.error('[worker] Missing DATABASE_URL. Create apps/api/.env from apps/api/.env.example')
  process.exit(1)
}

import cron from 'node-cron'

import { prisma } from './lib/prisma'
import { addOrderEvent } from './lib/events'
import { processOrderGeneration, failOrder } from './pipeline/generation'
import { deliverCompletedOrder } from './delivery/deliver'
import { getOrCreateSettings } from './lib/settings'

function toErrorDetails(e: unknown): {
  name: string
  message: string
  code?: string
  cause?: { name?: string; message?: string; code?: string }
} {
  const anyE = e as any
  const name = typeof anyE?.name === 'string' ? anyE.name : 'Error'
  const message = typeof anyE?.message === 'string' ? anyE.message : String(e)
  const codeRaw = anyE?.code ?? anyE?.cause?.code
  const code = typeof codeRaw === 'string' ? codeRaw : undefined

  const cause = anyE?.cause
  const causeObj =
    cause && typeof cause === 'object'
      ? {
          name: typeof (cause as any).name === 'string' ? (cause as any).name : undefined,
          message: typeof (cause as any).message === 'string' ? (cause as any).message : undefined,
          code: typeof (cause as any).code === 'string' ? (cause as any).code : undefined,
        }
      : undefined

  return { name, message, code, cause: causeObj }
}

function isRetryableNetworkError(d: { name: string; message: string; code?: string; cause?: { code?: string; message?: string } }) {
  const msg = `${d.name}: ${d.message}`.toLowerCase()
  const code = (d.code ?? d.cause?.code ?? '').toLowerCase()
  const causeMsg = (d.cause?.message ?? '').toLowerCase()

  // Common transient/network-ish failures (undici/node fetch often surfaces "terminated").
  if (d.message === 'terminated') return true
  if (msg.includes('fetch failed')) return true

  // Socket/connectivity hiccups.
  if (code.includes('econnreset')) return true
  if (code.includes('etimedout')) return true
  if (code.includes('eai_again')) return true
  if (code.includes('enotfound')) return true
  if (code.includes('econnrefused')) return true

  if (causeMsg.includes('socket')) return true
  if (causeMsg.includes('timeout')) return true

  return false
}

async function tryLock(key: string) {
  const rows = (await prisma.$queryRaw`SELECT pg_try_advisory_lock(hashtext(${key})) as locked`) as Array<{
    locked: boolean
  }>
  return rows[0]?.locked === true
}

async function unlock(key: string) {
  await prisma.$executeRaw`SELECT pg_advisory_unlock(hashtext(${key}))`
}

async function pickNextProcessingOrderId() {
  const order = await prisma.order.findFirst({
    where: {
      status: 'processing',
      generationCompletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  return order?.id ?? null
}

async function pickNextDeliverableOrderId() {
  const now = new Date()
  const order = await prisma.order.findFirst({
    where: {
      status: 'completed',
      deliveredAt: null,
      deliveryScheduledAt: { lte: now },
      deliveryStatus: { in: ['delivery_pending', 'delivery_scheduled'] },
    },
    orderBy: { deliveryScheduledAt: 'asc' },
    select: { id: true },
  })
  return order?.id ?? null
}

async function generationTick() {
  const orderId = await pickNextProcessingOrderId()
  if (!orderId) return

  const lockKey = `gen:${orderId}`
  const locked = await tryLock(lockKey)
  if (!locked) return

  try {
    await processOrderGeneration(orderId)
  } catch (e: unknown) {
    const details = toErrorDetails(e)
    const msg = details.code ? `${details.message} (${details.code})` : details.message

    await addOrderEvent({
      orderId,
      type: 'generation_exception',
      message: msg,
      data: details as any,
    })

    // If this is a transient error (or the task is already in-flight), do NOT mark the order failed.
    // Let the next cron tick retry (and/or wait for Kie.ai callback to populate trackUrl).
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { trackUrl: true, trackMetadata: true },
    })
    const meta: any = (order?.trackMetadata && typeof order.trackMetadata === 'object' ? order.trackMetadata : null) ?? {}
    const hasTaskId = typeof meta?.taskId === 'string' && meta.taskId.length > 0
    const hasTrackUrl = typeof order?.trackUrl === 'string' && order.trackUrl.length > 0

    if (isRetryableNetworkError(details) || hasTaskId || hasTrackUrl) {
      await addOrderEvent({
        orderId,
        type: 'generation_retryable_error',
        message: msg,
        data: { ...details, hasTaskId, hasTrackUrl } as any,
      })
    } else {
      await failOrder(orderId, msg)
    }
  } finally {
    await unlock(lockKey)
  }
}

async function deliveryTick() {
  const settings = await getOrCreateSettings()
  const manualConfirmationEnabled = (settings as any).manualConfirmationEnabled ?? false
  if (manualConfirmationEnabled) return

  const orderId = await pickNextDeliverableOrderId()
  if (!orderId) return

  const lockKey = `del:${orderId}`
  const locked = await tryLock(lockKey)
  if (!locked) return

  try {
    await deliverCompletedOrder(orderId)
  } catch (e: any) {
    const msg = e?.message ?? String(e)
    await addOrderEvent({ orderId, type: 'delivery_exception', message: msg })
    // Do not permanently park the order in delivery_failed on unexpected exceptions.
    // Schedule a retry with backoff so it can recover after transient issues or config fixes.
    const exceptionCount = await prisma.orderEvent.count({
      where: { orderId, type: 'delivery_exception' },
    })
    const delaySeconds = Math.min(60 * 2 ** Math.max(0, Math.min(exceptionCount - 1, 16)), 60 * 60)
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
      message: `Delivery exception; retry scheduled in ${delaySeconds}s`,
      data: { delaySeconds, nextAt: nextAt.toISOString() } as any,
    })
  } finally {
    await unlock(lockKey)
  }
}

async function reminderTick() {
  const lockKey = 'reminder-tick'
  const locked = await tryLock(lockKey)
  if (!locked) return

  try {
    const settings = await getOrCreateSettings()
    const cfg =
      settings.whatsappConfig && typeof settings.whatsappConfig === 'object'
        ? (settings.whatsappConfig as any)
        : {}
    const reminderTemplates: Array<{
      label: string
      delayMinutes: number
      templateName: string
      templateLangCode: string
    }> = Array.isArray(cfg.reminderTemplates) ? cfg.reminderTemplates : []

    if (reminderTemplates.length === 0) return

    const ycloud = cfg.ycloud ?? {}
    const { maybeDecrypt } = await import('./lib/settings')
    const apiKey = maybeDecrypt(ycloud.apiKeyEnc) ?? maybeDecrypt(ycloud.apiKey) ?? null
    const from: string | null = typeof ycloud.from === 'string' ? ycloud.from : null

    if (!apiKey || !from) return

    const drafts = await prisma.orderDraft.findMany({
      where: {
        whatsappCapturedAt: { not: null },
        whatsappNumber: { not: null },
        convertedOrderId: null,
      },
      select: {
        id: true,
        whatsappNumber: true,
        whatsappCapturedAt: true,
        remindersSent: true,
      },
    })

    const now = Date.now()

    // Build a list of all due reminders across all drafts.
    type ReminderTask = {
      draft: typeof drafts[number]
      reminder: typeof reminderTemplates[number]
      reminderKey: string
      alreadySent: string[]
    }
    const tasks: ReminderTask[] = []

    for (const draft of drafts) {
      if (!draft.whatsappCapturedAt || !draft.whatsappNumber) continue

      const capturedAt = new Date(draft.whatsappCapturedAt).getTime()
      const alreadySent: string[] = Array.isArray(draft.remindersSent)
        ? (draft.remindersSent as string[])
        : []

      for (const reminder of reminderTemplates) {
        if (!reminder.templateName || !reminder.templateLangCode || !reminder.delayMinutes) continue

        const dueAt = capturedAt + reminder.delayMinutes * 60 * 1000
        const reminderKey = `${reminder.templateName}:${reminder.templateLangCode}:${reminder.delayMinutes}`

        if (now < dueAt) continue
        if (alreadySent.includes(reminderKey)) continue

        tasks.push({ draft, reminder, reminderKey, alreadySent })
      }
    }

    // Process reminders in parallel batches (concurrency limit of 10).
    const BATCH_SIZE = 10
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE)
      await Promise.allSettled(
        batch.map(async ({ draft, reminder, reminderKey, alreadySent }) => {
          try {
            const payload = {
              from,
              to: draft.whatsappNumber,
              type: 'template',
              template: {
                name: reminder.templateName,
                language: { code: reminder.templateLangCode },
              },
              externalId: `reminder:${draft.id}:${reminderKey}`,
            }

            const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
              },
              body: JSON.stringify(payload),
            })

            if (res.ok) {
              const updatedSent = [...alreadySent, reminderKey]
              await prisma.orderDraft.update({
                where: { id: draft.id },
                data: { remindersSent: updatedSent },
              })
              console.log(
                `[worker] Reminder sent: draft=${draft.id} template=${reminder.templateName} delay=${reminder.delayMinutes}m`,
              )
              await prisma.whatsAppLog.create({
                data: {
                  type: 'reminder_sent',
                  phone: draft.whatsappNumber!,
                  templateName: reminder.templateName,
                  templateLangCode: reminder.templateLangCode,
                  draftId: draft.id,
                },
              })
            } else {
              const body = await res.json().catch(() => null)
              console.error(
                `[worker] Reminder send failed: draft=${draft.id} status=${res.status}`,
                body,
              )
              await prisma.whatsAppLog.create({
                data: {
                  type: 'reminder_failed',
                  phone: draft.whatsappNumber!,
                  templateName: reminder.templateName,
                  templateLangCode: reminder.templateLangCode,
                  draftId: draft.id,
                  error: `HTTP ${res.status}: ${JSON.stringify(body)}`,
                },
              })
            }
          } catch (err: any) {
            console.error(
              `[worker] Reminder exception: draft=${draft.id} template=${reminder.templateName}`,
              err?.message,
            )
            await prisma.whatsAppLog.create({
              data: {
                type: 'reminder_failed',
                phone: draft.whatsappNumber!,
                templateName: reminder.templateName,
                templateLangCode: reminder.templateLangCode,
                draftId: draft.id,
                error: err?.message ?? String(err),
              },
            }).catch(() => {})
          }
        }),
      )
    }
  } catch (err: any) {
    console.error('[worker] reminderTick error:', err?.message)
  } finally {
    await unlock(lockKey)
  }
}

async function exportTick() {
  const lockKey = 'export-tick'
  const locked = await tryLock(lockKey)
  if (!locked) return

  try {
    const job = await prisma.exportJob.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    })
    if (!job) return

    try {
      const params = (job.params && typeof job.params === 'object' ? job.params : {}) as Record<string, string | number | undefined>
      const offsetMs = (typeof params.tzOffset === 'number' ? params.tzOffset : 0) * 60 * 1000

      const now = new Date()
      const defaultFrom = new Date(now)
      defaultFrom.setDate(defaultFrom.getDate() - 7)
      defaultFrom.setHours(0, 0, 0, 0)

      const fromDate = params.from
        ? new Date(new Date(params.from + 'T00:00:00.000Z').getTime() + offsetMs)
        : defaultFrom
      const toDate = params.to
        ? new Date(new Date(params.to + 'T23:59:59.999Z').getTime() + offsetMs)
        : now

      const where: { createdAt: { gte: Date; lte: Date }; themeSlug?: string } = {
        createdAt: { gte: fromDate, lte: toDate },
        ...(params.themeSlug ? { themeSlug: String(params.themeSlug) } : {}),
      }

      const totalCount = await prisma.order.count({ where })
      if (totalCount === 0) {
        await prisma.exportJob.update({
          where: { id: job.id },
          data: { status: 'failed', error: 'No orders found for the selected date range.' },
        })
        return
      }

      function sanitize(val: string): string {
        let s = val
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
        if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
          return '"' + s.replace(/"/g, '""') + '"'
        }
        return s
      }

      const fs = await import('fs')
      const os = await import('os')
      const path = await import('path')
      const tmpFile = path.join(os.tmpdir(), `export_${job.id}.csv`)

      try {
        const header = ['Order ID', 'Created At', 'Theme', 'Customer Name', 'Email', 'WhatsApp', 'Status', 'Recipient', 'Relationship', 'Story']
        fs.writeFileSync(tmpFile, header.join(',') + '\r\n')

        let cursor: string | undefined = undefined
        const BATCH_SIZE = 100

        type ExportOrderRow = {
          id: string
          createdAt: Date
          themeSlug: string | null
          inputPayload: unknown
          status: string
          customer: { name: string; email: string | null; whatsappNumber: string | null }
        }

        while (true) {
          const orderSelect = {
            id: true, createdAt: true, themeSlug: true, inputPayload: true, status: true,
            customer: { select: { name: true, email: true, whatsappNumber: true } },
          } as const
          let batch: ExportOrderRow[]
          if (cursor) {
            batch = await prisma.order.findMany({ where, orderBy: { id: 'asc' }, take: BATCH_SIZE, skip: 1, cursor: { id: cursor }, select: orderSelect })
          } else {
            batch = await prisma.order.findMany({ where, orderBy: { id: 'asc' }, take: BATCH_SIZE, select: orderSelect })
          }

          if (batch.length === 0) break

          let batchCsv = ''
          for (const o of batch) {
            const ip = (o.inputPayload && typeof o.inputPayload === 'object' ? o.inputPayload : {}) as Record<string, unknown>
            const row = [
              o.id,
              o.createdAt.toISOString(),
              o.themeSlug ?? '',
              o.customer?.name ?? '',
              o.customer?.email ?? '',
              o.customer?.whatsappNumber ?? '',
              o.status,
              ip.recipientName ?? ip.recipient ?? '',
              ip.relationship ?? '',
              ip.story ?? '',
            ].map(v => sanitize(String(v)))
            batchCsv += row.join(',') + '\r\n'
          }
          fs.appendFileSync(tmpFile, batchCsv)

          cursor = batch[batch.length - 1].id
          if (batch.length < BATCH_SIZE) break
        }

        const { uploadBuffer } = await import('./lib/objectStorage')
        const fileKey = `exports/stories_${job.id}.csv`
        const fileContent = fs.readFileSync(tmpFile)
        await uploadBuffer(fileKey, fileContent, 'text/csv')

        const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
        await prisma.exportJob.update({
          where: { id: job.id },
          data: { status: 'done', fileKey, expiresAt },
        })

        console.log(`[worker] Export job ${job.id} completed: ${totalCount} orders`)
      } finally {
        try { fs.unlinkSync(tmpFile) } catch {}
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[worker] Export job ${job.id} failed:`, msg)
      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: msg.slice(0, 500) },
      })
    }
  } catch (err: unknown) {
    console.error('[worker] exportTick error:', err instanceof Error ? err.message : String(err))
  } finally {
    await unlock(lockKey)
  }
}

async function exportCleanupTick() {
  try {
    const expired = await prisma.exportJob.findMany({
      where: {
        expiresAt: { lte: new Date() },
        status: 'done',
        fileKey: { not: null },
      },
    })

    for (const job of expired) {
      if (job.fileKey) {
        const { deleteObject } = await import('./lib/objectStorage')
        await deleteObject(job.fileKey).catch(() => {})
      }
    }

    await prisma.exportJob.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: new Date() } },
          { status: 'failed', createdAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      },
    })
  } catch (err: any) {
    console.error('[worker] exportCleanupTick error:', err?.message)
  }
}

console.log('[worker] started')

// Every 15 seconds: attempt one generation job.
cron.schedule('*/15 * * * * *', () => {
  void generationTick()
})

// Every 30 seconds: attempt one delivery job.
cron.schedule('*/30 * * * * *', () => {
  void deliveryTick()
})

// Every 60 seconds: check for due reminders.
cron.schedule('* * * * *', () => {
  void reminderTick()
})

// Every 30 seconds: process export jobs.
cron.schedule('*/30 * * * * *', () => {
  void exportTick()
})

// Every 5 minutes: cleanup expired export jobs.
cron.schedule('*/5 * * * *', () => {
  void exportCleanupTick()
})

