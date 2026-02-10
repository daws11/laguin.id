import { loadEnv } from '../lib/env'

loadEnv()

import { prisma } from '../lib/prisma'
import { getOrCreateSettings } from '../lib/settings'
import { addOrderEvent } from '../lib/events'

async function main() {
  const settings = await getOrCreateSettings()
  const dryRun = String(process.env.DRY_RUN ?? '1') !== '0'

  // Orders that have a trackUrl + generationCompletedAt but are still stuck in processing.
  const stuck = await prisma.order.findMany({
    where: {
      status: 'processing',
      generationCompletedAt: { not: null },
      trackUrl: { not: null },
    },
    select: {
      id: true,
      generationCompletedAt: true,
      deliveryScheduledAt: true,
      deliveryStatus: true,
    },
    take: 500,
  })

  console.log(`[backfill] found ${stuck.length} stuck orders (dryRun=${dryRun})`)
  for (const o of stuck) {
    const generationCompletedAt = o.generationCompletedAt ?? new Date()
    const deliveryScheduledAt =
      o.deliveryScheduledAt ??
      (settings.instantEnabled
        ? generationCompletedAt
        : new Date(generationCompletedAt.getTime() + (settings.deliveryDelayHours ?? 24) * 60 * 60 * 1000))

    const nextDeliveryStatus = settings.instantEnabled ? 'delivery_pending' : 'delivery_scheduled'

    if (dryRun) {
      console.log(
        JSON.stringify({
          orderId: o.id,
          action: 'would_update',
          status: 'completed',
          deliveryStatus: nextDeliveryStatus,
          deliveryScheduledAt: deliveryScheduledAt.toISOString(),
        }),
      )
      continue
    }

    await prisma.order.update({
      where: { id: o.id },
      data: {
        status: 'completed',
        deliveryStatus: nextDeliveryStatus,
        deliveryScheduledAt,
      },
    })
    await addOrderEvent({
      orderId: o.id,
      type: 'backfill_completed',
      message: 'Backfill: status set to completed to enable auto-delivery.',
      data: { deliveryScheduledAt: deliveryScheduledAt.toISOString(), instantEnabled: settings.instantEnabled } as any,
    })

    console.log(`[backfill] updated orderId=${o.id}`)
  }
}

main().catch((e) => {
  console.error(e?.message ?? e)
  process.exit(1)
})

