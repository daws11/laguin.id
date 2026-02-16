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
import { adminAuthRoutes } from './routes/admin.auth'
import { adminPromptRoutes } from './routes/admin.prompts'
import { adminSettingsRoutes } from './routes/admin.settings'
import { adminCustomerRoutes } from './routes/admin.customers'
import { adminOrderDraftRoutes } from './routes/admin.orderDrafts'
import { adminOrderRoutes } from './routes/admin.orders'
import { adminUploadsRoutes } from './routes/admin.uploads'
import { adminFunnelRoutes } from './routes/admin.funnel'
import { adminThemeRoutes } from './routes/admin.themes'
import { xenditWebhookRoutes } from './routes/xendit.webhook'

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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsRoot = path.join(__dirname, '..', 'uploads')
await app.register(fastifyStatic, {
  root: uploadsRoot,
  prefix: '/uploads/',
  decorateReply: false,
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
  if (!user || user.role !== 'admin') {
    return reply.code(403).send({ error: 'forbidden' })
  }
}

app.get('/health', async () => {
  return { ok: true }
})

await app.register(publicSettingsRoutes, { prefix: '/api' })
await app.register(publicOrdersRoutes, { prefix: '/api' })
await app.register(orderDraftsRoutes, { prefix: '/api' })
await app.register(emailVerificationRoutes, { prefix: '/api' })
await app.register(trackingRoutes, { prefix: '/api' })
await app.register(kieCallbackRoutes, { prefix: '/api' })
await app.register(xenditWebhookRoutes, { prefix: '/api' })
await app.register(adminAuthRoutes, { prefix: '/api/admin' })
await app.register(async (adminApp) => {
  adminApp.addHook('preHandler', adminAuth)
  await adminApp.register(adminPromptRoutes)
  await adminApp.register(adminSettingsRoutes)
  await adminApp.register(adminCustomerRoutes)
  await adminApp.register(adminOrderDraftRoutes)
  await adminApp.register(adminOrderRoutes)
  await adminApp.register(adminUploadsRoutes)
  await adminApp.register(adminFunnelRoutes)
  await adminApp.register(adminThemeRoutes)
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

