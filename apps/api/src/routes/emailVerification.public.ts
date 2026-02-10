import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import crypto from 'node:crypto'

import { prisma } from '../lib/prisma'
import { sendEmail } from '../lib/mailer'

const StartSchema = z.object({
  email: z.string().email(),
})

const VerifySchema = z.object({
  verificationId: z.string().min(1),
  code: z.string().regex(/^\d{4}$/),
})

const OTP_EXPIRES_MINUTES = 10
const OTP_MAX_ATTEMPTS = 5
const OTP_RATE_LIMIT_WINDOW_MINUTES = 10
const OTP_RATE_LIMIT_MAX = 3

function getOtpSecret() {
  // Reuse ENCRYPTION_KEY as app secret; ensure it is set in production.
  return process.env.ENCRYPTION_KEY ?? 'dev-secret-change-me'
}

function hashOtp(code: string) {
  const salt = crypto.randomBytes(16)
  const key = crypto.pbkdf2Sync(code, Buffer.concat([salt, Buffer.from(getOtpSecret())]), 100_000, 32, 'sha256')
  return `${salt.toString('base64')}:${key.toString('base64')}`
}

function verifyOtpHash(code: string, codeHash: string) {
  const [saltB64, keyB64] = codeHash.split(':')
  if (!saltB64 || !keyB64) return false
  const salt = Buffer.from(saltB64, 'base64')
  const expected = Buffer.from(keyB64, 'base64')
  const actual = crypto.pbkdf2Sync(code, Buffer.concat([salt, Buffer.from(getOtpSecret())]), 100_000, 32, 'sha256')
  return crypto.timingSafeEqual(expected, actual)
}

function renderOtpEmailText(code: string) {
  return [
    'Kode verifikasi email kamu:',
    '',
    code,
    '',
    `Kode ini berlaku ${OTP_EXPIRES_MINUTES} menit.`,
    'Jika kamu tidak meminta kode ini, abaikan email ini.',
  ].join('\n')
}

export const emailVerificationRoutes: FastifyPluginAsync = async (app) => {
  app.post('/email-verification/start', async (req, reply) => {
    const parsed = StartSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body' })

    const email = parsed.data.email.toLowerCase()
    const now = new Date()
    const windowStart = new Date(now.getTime() - OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)

    const recentCount = await prisma.emailVerification.count({
      where: { email, createdAt: { gte: windowStart } },
    })
    if (recentCount >= OTP_RATE_LIMIT_MAX) {
      return reply.code(429).send({ error: 'Terlalu sering meminta OTP. Coba lagi beberapa menit.' })
    }

    const code = String(Math.floor(1000 + Math.random() * 9000))
    const expiresAt = new Date(now.getTime() + OTP_EXPIRES_MINUTES * 60 * 1000)
    const codeHash = hashOtp(code)

    const created = await prisma.emailVerification.create({
      data: {
        email,
        codeHash,
        expiresAt,
      },
    })

    try {
      await sendEmail({
        to: email,
        subject: 'Kode verifikasi email',
        text: renderOtpEmailText(code),
      })
    } catch (e) {
      req.log.error({ err: e }, 'Failed to send verification email')
      // Best effort cleanup so unused OTP records don't accumulate.
      await prisma.emailVerification.delete({ where: { id: created.id } }).catch(() => {})
      return reply.code(500).send({ error: 'Gagal mengirim email OTP. Coba lagi.' })
    }

    return { verificationId: created.id, expiresAt: created.expiresAt.toISOString() }
  })

  app.post('/email-verification/verify', async (req, reply) => {
    const parsed = VerifySchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_body' })

    const { verificationId, code } = parsed.data
    const rec = await prisma.emailVerification.findUnique({ where: { id: verificationId } })
    if (!rec) return reply.code(404).send({ error: 'Kode verifikasi tidak ditemukan.' })

    const now = new Date()
    if (rec.verifiedAt) return { ok: true }
    if (rec.expiresAt.getTime() < now.getTime()) return reply.code(400).send({ error: 'Kode OTP sudah kadaluarsa. Kirim ulang.' })
    if (rec.attempts >= OTP_MAX_ATTEMPTS) return reply.code(429).send({ error: 'Terlalu banyak percobaan. Kirim OTP baru.' })

    const ok = verifyOtpHash(code, rec.codeHash)
    if (!ok) {
      await prisma.emailVerification.update({
        where: { id: rec.id },
        data: { attempts: { increment: 1 } },
      })
      return reply.code(400).send({ error: 'Kode OTP salah.' })
    }

    await prisma.emailVerification.update({
      where: { id: rec.id },
      data: { verifiedAt: now },
    })

    return { ok: true }
  })
}

