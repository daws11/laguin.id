import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'

const ParamsIdSchema = z.object({ id: z.string().min(1) })

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
  search: z.string().optional(),
  kind: z.enum(['all', 'customer', 'draft']).default('all'),
  sortField: z.enum(['createdAt', 'name', 'kind']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

export const adminCustomerRoutes: FastifyPluginAsync = async (app) => {
  app.get('/customers', async (req) => {
    const parsed = ListQuerySchema.safeParse(req.query)
    const { page, pageSize, search, kind, sortField, sortDir } = parsed.success
      ? parsed.data
      : { page: 1, pageSize: 100, search: undefined, kind: 'all' as const, sortField: 'createdAt' as const, sortDir: 'desc' as const }

    const q = search?.trim().toLowerCase() ?? ''

    // --- Customers ---
    const fetchCustomers = kind === 'all' || kind === 'customer'
    let customers: any[] = []
    if (fetchCustomers) {
      const customerWhere: any = q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { whatsappNumber: { contains: q } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}
      customers = await prisma.customer.findMany({
        where: customerWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { orders: true } },
          orders: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, deliveryStatus: true } },
        },
      })
    }

    // --- Drafts ---
    const fetchDrafts = kind === 'all' || kind === 'draft'
    let drafts: any[] = []
    if (fetchDrafts) {
      const draftWhere: any = { convertedOrderId: null }
      if (q) {
        draftWhere.OR = [
          { whatsappNumber: { contains: q } },
          { emailLower: { contains: q } },
        ]
      }
      drafts = await prisma.orderDraft.findMany({
        where: draftWhere,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          step: true,
          formValues: true,
          whatsappNumber: true,
          emailLower: true,
          createdAt: true,
          updatedAt: true,
          convertedOrderId: true,
        },
      })
    }

    // Build customer items
    const customerItems = customers.map((c) => ({
      kind: 'customer' as const,
      id: c.id,
      name: c.name,
      whatsappNumber: c.whatsappNumber,
      email: c.email,
      orderCount: c._count.orders,
      latestOrderStatus: c.orders[0]?.status ?? null,
      latestDeliveryStatus: c.orders[0]?.deliveryStatus ?? null,
      createdAt: c.createdAt,
      draftStep: null as number | null,
      draftUpdatedAt: null as Date | null,
    }))

    const existingWhatsapps = new Set(
      customers.map((c) => c.whatsappNumber?.trim()).filter((w): w is string => !!w && w.length > 0),
    )
    const existingEmails = new Set(
      customers.map((c) => c.email?.trim().toLowerCase()).filter((e): e is string => !!e && e.length > 0),
    )

    // Build draft items (exclude those that match an existing customer)
    const draftItems = drafts
      .filter((d) => !d.convertedOrderId)
      .map((d) => {
        const fv = (d.formValues ?? {}) as any
        const nameRaw = String(fv?.recipientName ?? fv?.yourName ?? '').trim()
        const emailRaw = String(fv?.email ?? '').trim()
        const whatsappRaw = String(fv?.whatsappNumber ?? d.whatsappNumber ?? '').trim()
        return {
          kind: 'draft' as const,
          id: `draft:${d.id}`,
          name: nameRaw || emailRaw || whatsappRaw || 'Draft registration',
          whatsappNumber: whatsappRaw,
          email: emailRaw || d.emailLower || null,
          orderCount: 0,
          latestOrderStatus: 'draft',
          latestDeliveryStatus: null,
          createdAt: d.createdAt,
          draftStep: typeof d.step === 'number' ? d.step : 0,
          draftUpdatedAt: d.updatedAt,
        }
      })
      .filter((d) => {
        if (d.whatsappNumber && existingWhatsapps.has(d.whatsappNumber)) return false
        if (d.email && existingEmails.has(d.email.toLowerCase())) return false
        return true
      })
      // Additional in-memory name search for drafts (name is inside JSON)
      .filter((d) => {
        if (!q) return true
        const hay = `${d.name} ${d.whatsappNumber ?? ''} ${d.email ?? ''}`.toLowerCase()
        return hay.includes(q)
      })

    // Combine and sort
    const combined = [...draftItems, ...customerItems]
    combined.sort((a, b) => {
      let cmp = 0
      if (sortField === 'createdAt') {
        const aTime = (a.kind === 'draft' ? (a.draftUpdatedAt ?? a.createdAt) : a.createdAt).getTime()
        const bTime = (b.kind === 'draft' ? (b.draftUpdatedAt ?? b.createdAt) : b.createdAt).getTime()
        cmp = aTime - bTime
      } else if (sortField === 'name') {
        cmp = (a.name ?? '').localeCompare(b.name ?? '')
      } else if (sortField === 'kind') {
        cmp = (a.kind ?? '').localeCompare(b.kind ?? '')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    const total = combined.length
    const skip = (page - 1) * pageSize
    const items = combined.slice(skip, skip + pageSize)

    return { items, total, page, pageSize }
  })

  app.post('/customers/bulk-delete', async (req, reply) => {
    const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', message: 'Provide an array of IDs (max 100).' })

    const customerIds: string[] = []
    const draftIds: string[] = []
    for (const id of parsed.data.ids) {
      if (id.startsWith('draft:')) {
        draftIds.push(id.slice('draft:'.length))
      } else {
        customerIds.push(id)
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let deletedCustomers = 0
      let deletedDrafts = 0

      if (customerIds.length > 0) {
        await tx.orderEvent.deleteMany({ where: { order: { customerId: { in: customerIds } } } })
        await tx.order.deleteMany({ where: { customerId: { in: customerIds } } })
        const r = await tx.customer.deleteMany({ where: { id: { in: customerIds } } })
        deletedCustomers = r.count
      }

      if (draftIds.length > 0) {
        const r = await tx.orderDraft.deleteMany({ where: { id: { in: draftIds } } })
        deletedDrafts = r.count
      }

      return deletedCustomers + deletedDrafts
    })

    return { ok: true, deleted: result }
  })

  app.get('/customers/:id', async (req, reply) => {
    const params = ParamsIdSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const customer = await prisma.customer.findUnique({
      where: { id: params.data.id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { events: { orderBy: { createdAt: 'desc' }, take: 50 } },
          take: 50,
        },
      },
    })
    if (!customer) return reply.code(404).send({ error: 'not_found' })

    return customer
  })
}
