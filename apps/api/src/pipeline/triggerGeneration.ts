import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'
import { processOrderGeneration, failOrder } from './generation'
import { deliverCompletedOrder } from '../delivery/deliver'
import { getOrCreateSettings } from '../lib/settings'

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

  if (d.message === 'terminated') return true
  if (msg.includes('fetch failed')) return true
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

export function triggerGenerationInBackground(orderId: string, logger?: { info: Function; error: Function }) {
  const log = logger ?? console

  setImmediate(async () => {
    const lockKey = `gen:${orderId}`
    let locked = false
    try {
      locked = await tryLock(lockKey)
      if (!locked) {
        log.info({ orderId }, 'Generation already in progress (lock held), skipping')
        return
      }

      log.info({ orderId }, 'Background generation triggered')
      const result = await processOrderGeneration(orderId)

      if (result && typeof result === 'object' && 'pending' in result && result.pending) {
        log.info({ orderId, reason: (result as any).reason }, 'Generation pending (waiting for music)')
        return
      }

      log.info({ orderId }, 'Generation completed, checking delivery')
      await tryDeliverOrder(orderId, log)
    } catch (e: unknown) {
      const details = toErrorDetails(e)
      const msg = details.code ? `${details.message} (${details.code})` : details.message

      log.error({ orderId, error: msg }, 'Background generation failed')

      await addOrderEvent({
        orderId,
        type: 'generation_exception',
        message: msg,
        data: details as any,
      }).catch(() => {})

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { trackUrl: true, trackMetadata: true },
      }).catch(() => null)

      const meta: any = (order?.trackMetadata && typeof order.trackMetadata === 'object' ? order.trackMetadata : null) ?? {}
      const hasTaskId = typeof meta?.taskId === 'string' && meta.taskId.length > 0
      const hasTrackUrl = typeof order?.trackUrl === 'string' && order.trackUrl.length > 0

      if (isRetryableNetworkError(details) || hasTaskId || hasTrackUrl) {
        await addOrderEvent({
          orderId,
          type: 'generation_retryable_error',
          message: msg,
          data: { ...details, hasTaskId, hasTrackUrl } as any,
        }).catch(() => {})
      } else {
        await failOrder(orderId, msg).catch(() => {})
      }
    } finally {
      if (locked) await unlock(lockKey).catch(() => {})
    }
  })
}

export async function tryDeliverOrder(orderId: string, logger?: { info: Function; error: Function }) {
  const log = logger ?? console

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, deliveryStatus: true, deliveryScheduledAt: true, deliveredAt: true },
    })

    if (!order) return
    if (order.status !== 'completed') return
    if (order.deliveredAt) return

    const settings = await getOrCreateSettings()
    const manualConfirmationEnabled = (settings as any).manualConfirmationEnabled ?? false
    if (manualConfirmationEnabled) return

    if (order.deliveryStatus === 'delivery_pending' || (order.deliveryStatus === 'delivery_scheduled' && order.deliveryScheduledAt && order.deliveryScheduledAt <= new Date())) {
      log.info({ orderId }, 'Triggering delivery')
      await deliverCompletedOrder(orderId)
      log.info({ orderId }, 'Delivery completed')
    }
  } catch (e: any) {
    log.error({ orderId, error: e?.message }, 'Delivery attempt failed')
  }
}
