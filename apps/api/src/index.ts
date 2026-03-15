import { loadEnv } from './lib/env'

loadEnv()

import Fastify from 'fastify'
import cors from '@fastify/cors'
import compress from '@fastify/compress'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { publicSettingsRoutes } from './routes/settings.public'
import { publicOrdersRoutes } from './routes/orders.public'
import { orderDraftsRoutes } from './routes/orderDrafts.public'
import { kieCallbackRoutes } from './routes/kie.callback'
import { emailVerificationRoutes } from './routes/emailVerification.public'
import { trackingRoutes } from './routes/tracking.public'
import { orderDeliveryRoutes } from './routes/orderDelivery.public'
import { adminAuthRoutes } from './routes/admin.auth'
import { adminPromptRoutes } from './routes/admin.prompts'
import { adminSettingsRoutes } from './routes/admin.settings'
import { adminCustomerRoutes } from './routes/admin.customers'
import { adminOrderDraftRoutes } from './routes/admin.orderDrafts'
import { adminOrderRoutes } from './routes/admin.orders'
import { adminUploadsRoutes } from './routes/admin.uploads'
import { adminFunnelRoutes } from './routes/admin.funnel'
import { adminThemeRoutes } from './routes/admin.themes'
import { adminDiscountRoutes } from './routes/admin.discounts'
import { adminWhatsAppLogRoutes } from './routes/admin.whatsappLogs'
import { adminUserRoutes } from './routes/admin.users'
import { publicDiscountRoutes } from './routes/discount.public'
import { xenditWebhookRoutes } from './routes/xendit.webhook'
import { ycloudWebhookRoutes } from './routes/ycloud.webhook'
import { prisma } from './lib/prisma'
import { hashPassword } from './lib/password'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: true,
  credentials: true,
})

await app.register(compress, {
  global: true,
  encodings: ['br', 'gzip', 'deflate'],
  threshold: 1024,
})

await app.register(multipart, {
  limits: {
    files: 1,
    // 100 MB max per upload (video can be big)
    fileSize: 100 * 1024 * 1024,
  },
})

import fs from 'node:fs'
import { downloadBuffer } from './lib/objectStorage'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.get('/uploads/*', async (req, reply) => {
  const objectKey = (req as any).params['*'] as string
  if (!objectKey || objectKey.includes('..')) return reply.code(404).send({ error: 'Not found' })

  try {
    const result = await downloadBuffer(objectKey)
    if (!result) return reply.code(404).send({ error: 'Not found' })

    reply.header('Content-Type', result.contentType)
    reply.header('Content-Length', result.buffer.length)
    reply.header('Cache-Control', 'public, max-age=31536000, immutable')

    // Support ?download=1 to force browser download instead of inline display
    const wantDownload = (req.query as any)?.download === '1'
    if (wantDownload) {
      const ext = objectKey.split('.').pop() ?? 'bin'
      const filename = `track-${objectKey.replace(/\//g, '-').replace(/^-+/, '')}`
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
    }

    return reply.send(result.buffer)
  } catch (err) {
    req.log.error(err, 'Error serving upload')
    return reply.code(500).send({ error: 'Failed to serve file' })
  }
})

const webDistRoot = path.join(__dirname, '..', '..', 'web', 'dist')
const hasWebDist = fs.existsSync(webDistRoot)
if (hasWebDist) {
  await app.register(fastifyStatic, {
    root: webDistRoot,
    prefix: '/',
    decorateReply: false,
    wildcard: false,
    setHeaders(res, filePath) {
      if (/\/assets\//.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600')
      }
    },
  })
}

const adminJwtSecret = process.env.ADMIN_JWT_SECRET
if (!adminJwtSecret) {
  throw new Error('ADMIN_JWT_SECRET is required in production (and recommended in dev).')
}

await app.register(jwt, {
  secret: adminJwtSecret,
})

async function adminAuth(req: any, reply: any) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'unauthorized' })
  }

  const user = (req as any).user
  if (!user || !['admin', 'user'].includes(user.role)) {
    return reply.code(403).send({ error: 'forbidden' })
  }
}

function requireSection(...sections: string[]) {
  return async function (req: any, reply: any) {
    const user = (req as any).user
    if (!user) return reply.code(401).send({ error: 'unauthorized' })
    if (user.role === 'admin') return
    const perms: string[] = Array.isArray(user.permissions) ? user.permissions : []
    const has = sections.some((s) => perms.includes(s))
    if (!has) {
      return reply.code(403).send({ error: 'forbidden', message: 'insufficient_permissions' })
    }
  }
}

app.get('/health', async () => {
  return { ok: true }
})

await app.register(publicSettingsRoutes, { prefix: '/api' })
await app.register(publicOrdersRoutes, { prefix: '/api' })
await app.register(publicDiscountRoutes, { prefix: '/api' })
await app.register(orderDraftsRoutes, { prefix: '/api' })
await app.register(emailVerificationRoutes, { prefix: '/api' })
await app.register(trackingRoutes, { prefix: '/api' })
await app.register(orderDeliveryRoutes, { prefix: '/api' })
await app.register(kieCallbackRoutes, { prefix: '/api' })
await app.register(xenditWebhookRoutes, { prefix: '/api' })
await app.register(ycloudWebhookRoutes, { prefix: '/api' })
await app.register(adminAuthRoutes, { prefix: '/api/admin' })
await app.register(async (adminApp) => {
  adminApp.addHook('preHandler', adminAuth)

  // Orders + Testimonials (testimonial routes are inside adminOrderRoutes)
  await adminApp.register(async (section) => {
    section.addHook('preHandler', requireSection('orders', 'testimonials'))
    await section.register(adminOrderRoutes)
    await section.register(adminWhatsAppLogRoutes)
  })

  // Funnel
  await adminApp.register(async (section) => {
    section.addHook('preHandler', requireSection('funnel'))
    await section.register(adminFunnelRoutes)
  })

  // Customers
  await adminApp.register(async (section) => {
    section.addHook('preHandler', requireSection('customers'))
    await section.register(adminCustomerRoutes)
    await section.register(adminOrderDraftRoutes)
  })

  // Settings
  await adminApp.register(async (section) => {
    section.addHook('preHandler', requireSection('settings'))
    await section.register(adminSettingsRoutes)
    await section.register(adminUploadsRoutes)
  })

  // Prompts
  await adminApp.register(async (section) => {
    section.addHook('preHandler', requireSection('prompts'))
    await section.register(adminPromptRoutes)
  })

  // Themes
  await adminApp.register(async (section) => {
    section.addHook('preHandler', requireSection('themes'))
    await section.register(adminThemeRoutes)
  })

  // Discounts
  await adminApp.register(async (section) => {
    section.addHook('preHandler', requireSection('discounts'))
    await section.register(adminDiscountRoutes)
  })

  // Users (admin-only, enforced inside the route file)
  await adminApp.register(adminUserRoutes)
}, { prefix: '/api/admin' })

if (hasWebDist) {
  const indexHtmlPath = path.join(webDistRoot, 'index.html')
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/uploads/')) {
      reply.code(404).send({ error: 'Not found' })
    } else {
      reply.header('Content-Type', 'text/html; charset=utf-8').header('Cache-Control', 'no-cache').send(indexHtmlContent)
    }
  })
}

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'

await app.listen({ port, host })

// Auto-seed default admin user on first startup
try {
  const adminCount = await prisma.adminUser.count()
  if (adminCount === 0) {
    const pw = process.env.ADMIN_PASSWORD
    if (pw) {
      const hash = await hashPassword(pw)
      await prisma.adminUser.create({
        data: { username: 'admin', passwordHash: hash, role: 'admin', permissions: [] },
      })
      app.log.info('Default admin user created from ADMIN_PASSWORD')
    }
  }
} catch (e) {
  app.log.warn(e, 'Failed to auto-seed admin user (migration may not have run yet)')
}
