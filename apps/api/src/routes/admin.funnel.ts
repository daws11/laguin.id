import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'

const QuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

export const adminFunnelRoutes: FastifyPluginAsync = async (app) => {
  app.get('/funnel', async (req) => {
    const parsed = QuerySchema.safeParse(req.query)
    const query = parsed.success ? parsed.data : {}

    const now = new Date()
    const defaultFrom = new Date(now)
    defaultFrom.setDate(defaultFrom.getDate() - 7)
    defaultFrom.setHours(0, 0, 0, 0)

    const fromDate = query.from ? new Date(query.from + 'T00:00:00.000Z') : defaultFrom
    const toDate = query.to ? new Date(query.to + 'T23:59:59.999Z') : now

    const fromStr = fromDate.toISOString().slice(0, 10)
    const toStr = toDate.toISOString().slice(0, 10)

    const [homepageResult, step0Count, step1Count, step2Count, step3Count, step4Count, orderCreatedCount, orderConfirmedCount] = await Promise.all([
      prisma.pageView.findMany({
        where: {
          path: '/',
          createdAt: { gte: fromDate, lte: toDate },
        },
        select: { sessionId: true },
        distinct: ['sessionId'],
      }),
      prisma.orderDraft.count({
        where: {
          step: { gte: 0 },
          createdAt: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.orderDraft.count({
        where: {
          step: { gte: 1 },
          createdAt: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.orderDraft.count({
        where: {
          step: { gte: 2 },
          createdAt: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.orderDraft.count({
        where: {
          step: { gte: 3 },
          createdAt: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.orderDraft.count({
        where: {
          step: { gte: 4 },
          createdAt: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.order.count({
        where: {
          confirmedAt: { gte: fromDate, lte: toDate },
        },
      }),
    ])

    return {
      dateRange: { from: fromStr, to: toStr },
      steps: [
        { key: 'homepage', label: 'Homepage Views', count: homepageResult.length },
        { key: 'step0', label: 'Step 0: Announcement', count: step0Count },
        { key: 'step1', label: 'Step 1: Recipient', count: step1Count },
        { key: 'step2', label: 'Step 2: Music', count: step2Count },
        { key: 'step3', label: 'Step 3: Story', count: step3Count },
        { key: 'step4', label: 'Step 4: Contact', count: step4Count },
        { key: 'order_created', label: 'Order Created', count: orderCreatedCount },
        { key: 'order_confirmed', label: 'Order Confirmed', count: orderConfirmedCount },
      ],
    }
  })
}
