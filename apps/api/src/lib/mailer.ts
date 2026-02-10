import nodemailer from 'nodemailer'
import { Resend } from 'resend'

function boolFromEnv(v: string | undefined, fallback: boolean) {
  if (v == null || v === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(v).trim().toLowerCase())
}

function requiredEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

let cachedTransport: nodemailer.Transporter | null = null
let cachedResend: Resend | null = null

export function getMailerTransport() {
  if (cachedTransport) return cachedTransport

  const host = requiredEnv('SMTP_HOST')
  const port = Number(process.env.SMTP_PORT ?? 587)
  const secure = boolFromEnv(process.env.SMTP_SECURE, false)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  })

  return cachedTransport
}

function getEmailProvider() {
  const v = (process.env.EMAIL_PROVIDER ?? '').trim().toLowerCase()
  if (v === 'smtp' || v === 'resend') return v

  // Safe default for existing installs: if RESEND isn't configured, keep SMTP working.
  if (process.env.RESEND_API_KEY) return 'resend'
  return 'smtp'
}

function getResendClient() {
  if (cachedResend) return cachedResend
  const apiKey = requiredEnv('RESEND_API_KEY')
  cachedResend = new Resend(apiKey)
  return cachedResend
}

async function sendEmailSmtp(params: { to: string; subject: string; text: string; html?: string }) {
  const from = process.env.SMTP_FROM ?? 'no-reply@example.com'
  const transport = getMailerTransport()
  await transport.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    ...(params.html ? { html: params.html } : {}),
  })
}

async function sendEmailResend(params: { to: string; subject: string; text: string; html?: string }) {
  const from = process.env.RESEND_FROM ?? process.env.SMTP_FROM ?? 'onboarding@resend.dev'
  const resend = getResendClient()

  const { data, error } = await resend.emails.send({
    from,
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
  const provider = getEmailProvider()

  if (provider === 'resend') {
    await sendEmailResend(params)
    return
  }

  await sendEmailSmtp(params)
}

