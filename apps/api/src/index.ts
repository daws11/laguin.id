import { loadEnv } from './lib/env'

loadEnv()

import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { publicOrdersRoutes } from './routes/orders.public'
import { kieCallbackRoutes } from './routes/kie.callback'
import { emailVerificationRoutes } from './routes/emailVerification.public'
import { adminAuthRoutes } from './routes/admin.auth'
import { adminPromptRoutes } from './routes/admin.prompts'
import { adminSettingsRoutes } from './routes/admin.settings'
import { adminCustomerRoutes } from './routes/admin.customers'
import { adminOrderRoutes } from './routes/admin.orders'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: true,
  credentials: true,
})

await app.register(jwt, {
  secret: process.env.ADMIN_JWT_SECRET ?? 'dev-secret-change-me',
})

async function adminAuth(req: any, reply: any) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'unauthorized' })
  }
}

app.get('/health', async () => {
  return { ok: true }
})

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
}, { prefix: '/api/admin' })

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'

await app.listen({ port, host })

