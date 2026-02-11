import { loadEnv } from './lib/env'

loadEnv()

import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { publicSettingsRoutes } from './routes/settings.public'
import { publicOrdersRoutes } from './routes/orders.public'
import { kieCallbackRoutes } from './routes/kie.callback'
import { emailVerificationRoutes } from './routes/emailVerification.public'
import { adminAuthRoutes } from './routes/admin.auth'
import { adminPromptRoutes } from './routes/admin.prompts'
import { adminSettingsRoutes } from './routes/admin.settings'
import { adminCustomerRoutes } from './routes/admin.customers'
import { adminOrderRoutes } from './routes/admin.orders'
import { adminUploadsRoutes } from './routes/admin.uploads'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: true,
  credentials: true,
})

await app.register(multipart, {
  limits: {
    files: 1,
    // 100 MB max per upload (video can be big)
    fileSize: 100 * 1024 * 1024,
  },
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsRoot = path.join(__dirname, '..', 'uploads')
await app.register(fastifyStatic, {
  root: uploadsRoot,
  prefix: '/uploads/',
  decorateReply: false,
})

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
await app.register(emailVerificationRoutes, { prefix: '/api' })
await app.register(kieCallbackRoutes, { prefix: '/api' })
await app.register(adminAuthRoutes, { prefix: '/api/admin' })
await app.register(async (adminApp) => {
  adminApp.addHook('preHandler', adminAuth)
  await adminApp.register(adminPromptRoutes)
  await adminApp.register(adminSettingsRoutes)
  await adminApp.register(adminCustomerRoutes)
  await adminApp.register(adminOrderRoutes)
  await adminApp.register(adminUploadsRoutes)
}, { prefix: '/api/admin' })

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'

await app.listen({ port, host })

