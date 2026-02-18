import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { getOrCreateSettings, maybeDecrypt } from './settings'

function boolFromEnv(v: string | undefined, fallback: boolean) {
  if (v == null || v === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(v).trim().toLowerCase())
}

let cachedTransport: nodemailer.Transporter | null = null
let cachedResend: Resend | null = null
let lastSmtpKey = ''
let lastResendKey = ''

function buildSmtpTransport(host: string, port: number, secure: boolean, user?: string | null, pass?: string | null) {
  const key = `${host}:${port}:${secure}:${user ?? ''}`
  if (cachedTransport && lastSmtpKey === key) return cachedTransport
  lastSmtpKey = key
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  })
  return cachedTransport
}

function buildResendClient(apiKey: string) {
  if (cachedResend && lastResendKey === apiKey) return cachedResend
  lastResendKey = apiKey
  cachedResend = new Resend(apiKey)
  return cachedResend
}

async function getEmailConfig() {
  const s = await getOrCreateSettings()

  const dbProvider = (s as any).emailProvider as string | null
  const dbSmtpHost = (s as any).smtpHost as string | null
  const dbSmtpPort = (s as any).smtpPort as number | null
  const dbSmtpSecure = (s as any).smtpSecure as boolean | undefined
  const dbSmtpUser = (s as any).smtpUser as string | null
  const dbSmtpPass = maybeDecrypt((s as any).smtpPassEnc)
  const dbSmtpFrom = (s as any).smtpFrom as string | null
  const dbResendKey = maybeDecrypt((s as any).resendApiKeyEnc)
  const dbResendFrom = (s as any).resendFrom as string | null

  const provider = dbProvider || (process.env.EMAIL_PROVIDER ?? '').trim().toLowerCase() || (dbResendKey || process.env.RESEND_API_KEY ? 'resend' : 'smtp')

  return {
    provider: provider as 'smtp' | 'resend',
    smtpHost: dbSmtpHost || process.env.SMTP_HOST || null,
    smtpPort: dbSmtpPort || Number(process.env.SMTP_PORT ?? 587),
    smtpSecure: dbSmtpSecure ?? boolFromEnv(process.env.SMTP_SECURE, false),
    smtpUser: dbSmtpUser || process.env.SMTP_USER || null,
    smtpPass: dbSmtpPass || process.env.SMTP_PASS || null,
    smtpFrom: dbSmtpFrom || process.env.SMTP_FROM || 'no-reply@example.com',
    resendApiKey: dbResendKey || process.env.RESEND_API_KEY || null,
    resendFrom: dbResendFrom || process.env.RESEND_FROM || process.env.SMTP_FROM || 'onboarding@resend.dev',
  }
}

async function sendEmailSmtp(params: { to: string; subject: string; text: string; html?: string }) {
  const cfg = await getEmailConfig()
  if (!cfg.smtpHost) throw new Error('SMTP host not configured. Set it in Admin > Settings > Email.')
  const transport = buildSmtpTransport(cfg.smtpHost, cfg.smtpPort, cfg.smtpSecure, cfg.smtpUser, cfg.smtpPass)
  await transport.sendMail({
    from: cfg.smtpFrom,
    to: params.to,
    subject: params.subject,
    text: params.text,
    ...(params.html ? { html: params.html } : {}),
  })
}

async function sendEmailResend(params: { to: string; subject: string; text: string; html?: string }) {
  const cfg = await getEmailConfig()
  if (!cfg.resendApiKey) throw new Error('Resend API key not configured. Set it in Admin > Settings > Email.')
  const resend = buildResendClient(cfg.resendApiKey)

  const { data, error } = await resend.emails.send({
    from: cfg.resendFrom,
    to: [params.to],
    subject: params.subject,
    text: params.text,
    ...(params.html ? { html: params.html } : {}),
  })

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`)
  }

  return data
}

export async function sendEmail(params: { to: string; subject: string; text: string; html?: string }) {
  const cfg = await getEmailConfig()

  if (cfg.provider === 'resend') {
    await sendEmailResend(params)
    return
  }

  await sendEmailSmtp(params)
}
