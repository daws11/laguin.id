import { prisma } from '../lib/prisma'
import { addOrderEvent } from '../lib/events'
import { getWhatsAppProvider } from '../whatsapp'

export async function deliverCompletedOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  })
  if (!order) throw new Error('Order not found')
  if (order.status !== 'completed') return { skipped: true, reason: `status=${order.status}` }
  if (!order.trackUrl) throw new Error('Missing trackUrl (music not generated)')

  const provider = await getWhatsAppProvider()
  // For first-contact compliance, we send a WhatsApp *template* via the provider.
  // In this app, we pass the song link as `message` so the provider can inject it into the template variable.
  const message = order.trackUrl

  const result = await provider.send({
    to: order.customer.whatsappNumber,
    message,
    // internal metadata for mock logging
    ...(provider.name === 'mock' ? ({ orderId } as any) : {}),
  })

  if (!result.ok) {
    await prisma.order.update({
      where: { id: orderId },
      data: { deliveryStatus: 'delivery_failed' },
    })
    await addOrderEvent({
      orderId,
      type: 'delivery_failed',
      message: result.error ?? 'WhatsApp send failed',
      data: result as any,
    })
    return { ok: false }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      deliveryStatus: 'delivered',
      deliveredAt: new Date(),
    },
  })
  await addOrderEvent({ orderId, type: 'delivered', data: result as any })
  return { ok: true }
}

