import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma'
import { getOrCreateSettings } from '../lib/settings'

export const adminWhatsAppLogRoutes: FastifyPluginAsync = async (app) => {
  app.get('/whatsapp-logs', async (req) => {
    const query = req.query as Record<string, string | undefined>
    const page = Math.max(1, parseInt(query.page ?? '1') || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? '25') || 25))
    const typeFilter = query.type ?? null
    const validTypes = ['delivery_sent', 'delivery_failed', 'reminder_sent', 'reminder_failed']

    const where: any = {}
    if (typeFilter) {
      if (!validTypes.includes(typeFilter)) {
        return { items: [], total: 0, page, pageSize }
      }
      where.type = typeFilter
    }

    const [items, total] = await Promise.all([
      prisma.whatsAppLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          order: {
            select: { id: true },
          },
        },
      }),
      prisma.whatsAppLog.count({ where }),
    ])

    return {
      items: items.map((log) => ({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        type: log.type,
        phone: log.phone,
        templateName: log.templateName,
        templateLangCode: log.templateLangCode,
        orderId: log.orderId,
        draftId: log.draftId,
        error: log.error,
        status: log.type.endsWith('_sent') ? 'Sent' : 'Failed',
      })),
      total,
      page,
      pageSize,
    }
  })

  app.get('/whatsapp-logs/scheduled', async () => {
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

    if (reminderTemplates.length === 0) {
      return { scheduled: [] }
    }

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
    const scheduled: Array<{
      draftId: string
      phone: string
      reminderLabel: string
      templateName: string
      estimatedSendTime: string
    }> = []

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

        if (alreadySent.includes(reminderKey)) continue

        scheduled.push({
          draftId: draft.id,
          phone: draft.whatsappNumber,
          reminderLabel: reminder.label || reminder.templateName,
          templateName: reminder.templateName,
          estimatedSendTime: new Date(dueAt).toISOString(),
        })
      }
    }

    scheduled.sort((a, b) => new Date(a.estimatedSendTime).getTime() - new Date(b.estimatedSendTime).getTime())

    return { scheduled }
  })
}
