import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'

const QuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  themeSlug: z.string().optional(),
  tzOffset: z.string().optional(),
})

export const adminFunnelRoutes: FastifyPluginAsync = async (app) => {
  app.get('/funnel', async (req) => {
    const parsed = QuerySchema.safeParse(req.query)
    const query = parsed.success ? parsed.data : {}

    const offsetMinutes = query.tzOffset ? parseInt(query.tzOffset, 10) : 0
    const offsetMs = (isNaN(offsetMinutes) ? 0 : offsetMinutes) * 60 * 1000

    const now = new Date()
    const defaultFrom = new Date(now)
    defaultFrom.setDate(defaultFrom.getDate() - 7)
    defaultFrom.setHours(0, 0, 0, 0)

    const fromDate = query.from ? new Date(new Date(query.from + 'T00:00:00.000Z').getTime() + offsetMs) : defaultFrom
    const toDate = query.to ? new Date(new Date(query.to + 'T23:59:59.999Z').getTime() + offsetMs) : now

    const fromStr = query.from ?? fromDate.toISOString().slice(0, 10)
    const toStr = query.to ?? toDate.toISOString().slice(0, 10)

    const pageViewWhere: any = {
      createdAt: { gte: fromDate, lte: toDate },
    }
    if (query.themeSlug) {
      pageViewWhere.themeSlug = query.themeSlug
    }

    const draftWhere = (minStep: number): any => ({
      step: { gte: minStep },
      createdAt: { gte: fromDate, lte: toDate },
      ...(query.themeSlug ? { themeSlug: query.themeSlug } : {}),
    })

    const orderWhere = (extra: any): any => ({
      ...extra,
      ...(query.themeSlug ? { themeSlug: query.themeSlug } : {}),
    })

    const [homepageResult, step0Count, step1Count, step2Count, step3Count, step4Count, orderCreatedCount, orderConfirmedCount] = await Promise.all([
      prisma.pageView.findMany({
        where: pageViewWhere,
        select: { sessionId: true },
        distinct: ['sessionId'],
      }),
      prisma.orderDraft.count({ where: draftWhere(0) }),
      prisma.orderDraft.count({ where: draftWhere(1) }),
      prisma.orderDraft.count({ where: draftWhere(2) }),
      prisma.orderDraft.count({ where: draftWhere(3) }),
      prisma.orderDraft.count({ where: draftWhere(4) }),
      prisma.order.count({
        where: orderWhere({ createdAt: { gte: fromDate, lte: toDate } }),
      }),
      prisma.order.count({
        where: orderWhere({ confirmedAt: { gte: fromDate, lte: toDate } }),
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

  app.get('/funnel/trend', async (req) => {
    const parsed = QuerySchema.safeParse(req.query)
    const query = parsed.success ? parsed.data : {}

    const offsetMinutes = query.tzOffset ? parseInt(query.tzOffset, 10) : 0
    const offsetMs = (isNaN(offsetMinutes) ? 0 : offsetMinutes) * 60 * 1000

    const now = new Date()
    const defaultFrom = new Date(now)
    defaultFrom.setDate(defaultFrom.getDate() - 7)
    defaultFrom.setHours(0, 0, 0, 0)

    const fromDate = query.from ? new Date(new Date(query.from + 'T00:00:00.000Z').getTime() + offsetMs) : defaultFrom
    const toDate = query.to ? new Date(new Date(query.to + 'T23:59:59.999Z').getTime() + offsetMs) : now

    const themeFilter = query.themeSlug || undefined

    const days: string[] = []
    const cursor = new Date(query.from ? query.from + 'T00:00:00.000Z' : defaultFrom.toISOString().slice(0, 10) + 'T00:00:00.000Z')
    const endLocal = query.to ?? now.toISOString().slice(0, 10)
    while (cursor.toISOString().slice(0, 10) <= endLocal) {
      days.push(cursor.toISOString().slice(0, 10))
      cursor.setDate(cursor.getDate() + 1)
    }

    const results = await Promise.all(
      days.map(async (day) => {
        const dayStart = new Date(new Date(day + 'T00:00:00.000Z').getTime() + offsetMs)
        const dayEnd = new Date(new Date(day + 'T23:59:59.999Z').getTime() + offsetMs)
        const dateRange = { gte: dayStart, lte: dayEnd }

        const pvWhere: any = { createdAt: dateRange }
        if (themeFilter) pvWhere.themeSlug = themeFilter

        const draftWhere: any = { step: { gte: 0 }, createdAt: dateRange }
        if (themeFilter) draftWhere.themeSlug = themeFilter

        const orderCreatedWhere: any = { createdAt: dateRange }
        if (themeFilter) orderCreatedWhere.themeSlug = themeFilter

        const orderConfirmedWhere: any = { confirmedAt: dateRange }
        if (themeFilter) orderConfirmedWhere.themeSlug = themeFilter

        const [pvResult, step0, orderCreated, orderConfirmed] = await Promise.all([
          prisma.pageView.findMany({ where: pvWhere, select: { sessionId: true }, distinct: ['sessionId'] }),
          prisma.orderDraft.count({ where: draftWhere }),
          prisma.order.count({ where: orderCreatedWhere }),
          prisma.order.count({ where: orderConfirmedWhere }),
        ])

        const homepage = pvResult.length
        return {
          date: day,
          homepage,
          step0: step0,
          orderCreated: orderCreated,
          orderConfirmed: orderConfirmed,
          step0Pct: homepage > 0 ? Math.round((step0 / homepage) * 1000) / 10 : 0,
          orderCreatedPct: homepage > 0 ? Math.round((orderCreated / homepage) * 1000) / 10 : 0,
          orderConfirmedPct: homepage > 0 ? Math.round((orderConfirmed / homepage) * 1000) / 10 : 0,
        }
      })
    )

    return { days: results }
  })
}
