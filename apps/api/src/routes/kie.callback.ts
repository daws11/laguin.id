import type { FastifyPluginAsync } from 'fastify'
import crypto from 'node:crypto'

import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'

function verifyKieWebhookSignature(params: {
  webhookHmacKey: string
  taskId: string
  timestampSeconds: string
  receivedSignature: string
}) {
  const message = `${params.taskId}.${params.timestampSeconds}`
  const computed = crypto.createHmac('sha256', params.webhookHmacKey).update(message).digest('base64')
  if (computed.length !== params.receivedSignature.length) return false
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(params.receivedSignature))
}

export const kieCallbackRoutes: FastifyPluginAsync = async (app) => {
  // Public endpoint used by Kie.ai callbacks. Must respond quickly with 200.
  app.post('/kie/callback', async (req, reply) => {
    const body: any = req.body ?? {}
    const taskId: string | null = body?.data?.task_id ?? null

    if (!taskId) {
      return reply.code(400).send({ error: 'missing_task_id' })
    }

    const webhookHmacKey = process.env.WEBHOOK_HMAC_KEY
    const timestamp = req.headers['x-webhook-timestamp']
    const signature = req.headers['x-webhook-signature']

    // Optional signature verification (recommended in prod).
    if (webhookHmacKey && typeof timestamp === 'string' && typeof signature === 'string') {
      const ok = verifyKieWebhookSignature({
        webhookHmacKey,
        taskId,
        timestampSeconds: timestamp,
        receivedSignature: signature,
      })
      if (!ok) return reply.code(401).send({ error: 'invalid_signature' })
    }

    // Try to attach callback to an order by matching trackMetadata.taskId.
    const order = await prisma.order.findFirst({
      where: {
        trackMetadata: {
          path: ['taskId'],
          equals: taskId,
        },
      },
    })

    if (!order) {
      // Still acknowledge; Kie.ai only cares about 200 response.
      return reply.code(200).send({ status: 'received', taskId, order: 'not_found' })
    }

    const callbackType: string | null = body?.data?.callbackType ?? null
    const code: number | null = body?.code ?? null
    const audioUrl: string | null = body?.data?.data?.[0]?.audio_url ?? null

    const currentMeta: any =
      (order.trackMetadata && typeof order.trackMetadata === 'object' ? order.trackMetadata : null) ?? {}

    // Persist callback payload for debugging/audit
    await prisma.order.update({
      where: { id: order.id },
      data: {
        trackMetadata: {
          ...currentMeta,
          taskId,
          callbackType,
          callback: body,
          status: audioUrl ? 'SUCCESS' : currentMeta?.status,
        } as any,
        trackUrl: order.trackUrl ?? audioUrl ?? undefined,
      },
    })

    await addOrderEvent({
      orderId: order.id,
      type: 'music_callback_received',
      data: { taskId, callbackType, code, hasAudioUrl: Boolean(audioUrl) },
    })

    if (!order.trackUrl && audioUrl && callbackType === 'complete') {
      await addOrderEvent({
        orderId: order.id,
        type: 'music_generated',
        data: { taskId, source: 'callback' },
      })
    }

    return reply.code(200).send({ status: 'received', taskId, orderId: order.id })
  })
}

