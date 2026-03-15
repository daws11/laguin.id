import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { hashPassword } from '../lib/password'

const SECTION_SLUGS = ['orders', 'funnel', 'customers', 'settings', 'prompts', 'themes', 'testimonials', 'discounts'] as const

const CreateUserSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(6),
  role: z.enum(['admin', 'user']),
  permissions: z.array(z.enum(SECTION_SLUGS)).default([]),
})

const UpdateUserSchema = z.object({
  username: z.string().trim().min(1).max(100).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'user']).optional(),
  permissions: z.array(z.enum(SECTION_SLUGS)).optional(),
})

export const adminUserRoutes: FastifyPluginAsync = async (app) => {
  // Only admin role can manage users
  app.addHook('preHandler', async (req, reply) => {
    if ((req as any).user?.role !== 'admin') {
      return reply.code(403).send({ error: 'admin_only' })
    }
  })

  app.get('/users', async () => {
    const users = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        role: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return users
  })

  app.post('/users', async (req, reply) => {
    const parsed = CreateUserSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })

    const existing = await prisma.adminUser.findUnique({ where: { username: parsed.data.username } })
    if (existing) return reply.code(409).send({ error: 'username_taken' })

    const passwordHash = await hashPassword(parsed.data.password)
    const user = await prisma.adminUser.create({
      data: {
        username: parsed.data.username,
        passwordHash,
        role: parsed.data.role,
        permissions: parsed.data.role === 'admin' ? [] : parsed.data.permissions,
      },
      select: {
        id: true,
        username: true,
        role: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return reply.code(201).send(user)
  })

  app.put('/users/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = UpdateUserSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })

    const existing = await prisma.adminUser.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'not_found' })

    // Check username uniqueness if changing
    if (parsed.data.username && parsed.data.username !== existing.username) {
      const dup = await prisma.adminUser.findUnique({ where: { username: parsed.data.username } })
      if (dup) return reply.code(409).send({ error: 'username_taken' })
    }

    // Prevent demoting the last admin
    const newRole = parsed.data.role ?? existing.role
    if (existing.role === 'admin' && newRole !== 'admin') {
      const adminCount = await prisma.adminUser.count({ where: { role: 'admin' } })
      if (adminCount <= 1) return reply.code(400).send({ error: 'cannot_demote_last_admin' })
    }

    const data: any = {}
    if (parsed.data.username) data.username = parsed.data.username
    if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password)
    if (parsed.data.role) data.role = parsed.data.role
    if (parsed.data.permissions !== undefined) data.permissions = newRole === 'admin' ? [] : parsed.data.permissions

    const user = await prisma.adminUser.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        role: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return user
  })

  app.delete('/users/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const currentUser = (req as any).user

    // Prevent self-deletion
    if (currentUser?.userId === id) {
      return reply.code(400).send({ error: 'cannot_delete_self' })
    }

    const existing = await prisma.adminUser.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'not_found' })

    // Prevent deleting last admin
    if (existing.role === 'admin') {
      const adminCount = await prisma.adminUser.count({ where: { role: 'admin' } })
      if (adminCount <= 1) return reply.code(400).send({ error: 'cannot_delete_last_admin' })
    }

    await prisma.adminUser.delete({ where: { id } })
    return { ok: true }
  })
}
