import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export async function addOrderEvent(params: {
  orderId: string
  type: string
  message?: string
  data?: Prisma.InputJsonValue
}) {
  const { orderId, type, message, data } = params
  return prisma.orderEvent.create({
    data: {
      orderId,
      type,
      message,
      data,
    },
  })
}

