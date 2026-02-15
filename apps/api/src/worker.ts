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

console.log('[worker] started')

// Every 5 seconds: attempt one generation job.
cron.schedule('*/5 * * * * *', () => {
  void generationTick()
})

// Every 10 seconds: attempt one delivery job.
cron.schedule('*/10 * * * * *', () => {
  void deliveryTick()
})

