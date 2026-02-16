import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import path from 'node:path'
import { uploadBuffer } from '../lib/objectStorage'

const QuerySchema = z.object({
  kind: z.enum(['image', 'video', 'audio']),
})

function extFromMime(mime: string | undefined) {
  const m = (mime ?? '').toLowerCase()
  if (m === 'image/png') return '.png'
  if (m === 'image/jpeg') return '.jpg'
  if (m === 'image/webp') return '.webp'
  if (m === 'image/gif') return '.gif'
  if (m === 'video/mp4') return '.mp4'
  if (m === 'video/webm') return '.webm'
  if (m === 'audio/mpeg') return '.mp3'
  if (m === 'audio/mp3') return '.mp3'
  if (m === 'audio/wav') return '.wav'
  if (m === 'audio/x-wav') return '.wav'
  if (m === 'audio/ogg') return '.ogg'
  if (m === 'audio/webm') return '.webm'
  return null
}

function safeNamePart(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}

export const adminUploadsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/uploads', async (req, reply) => {
    const parsed = QuerySchema.safeParse((req as any).query ?? {})
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_query', details: parsed.error.flatten() })

    const file = await (req as any).file?.()
    if (!file) return reply.code(400).send({ error: 'missing_file' })

    const kind = parsed.data.kind
    const mime = typeof file.mimetype === 'string' ? file.mimetype : undefined
    const extFromName = path.extname(file.filename ?? '').toLowerCase()
    const ext = extFromMime(mime) ?? (extFromName || null)
    if (!ext) return reply.code(400).send({ error: 'unsupported_type', mime })

    const mimeLower = (mime ?? '').toLowerCase()
    const allowedExts =
      kind === 'image'
        ? new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
        : kind === 'video'
          ? new Set(['.mp4', '.webm', '.mov', '.m4v'])
          : new Set(['.mp3', '.wav', '.ogg', '.webm'])

    const mimeOk =
      !mimeLower ||
      mimeLower === 'application/octet-stream' ||
      (kind === 'image' && mimeLower.startsWith('image/')) ||
      (kind === 'video' && mimeLower.startsWith('video/')) ||
      (kind === 'audio' && mimeLower.startsWith('audio/')) ||
      allowedExts.has(ext)

    if (!mimeOk) return reply.code(400).send({ error: 'invalid_kind_mime', kind, mime, ext })

    const base = safeNamePart(path.basename(file.filename ?? 'upload', path.extname(file.filename ?? '')))
    const stamp = Date.now()
    const rand = Math.random().toString(16).slice(2, 10)
    const filename = `${stamp}-${rand}${base ? `-${base}` : ''}${ext}`
    const objectKey = `${kind}s/${filename}`

    const buf = await file.toBuffer()
    const contentType = mime || 'application/octet-stream'

    const publicPath = await uploadBuffer(objectKey, buf, contentType)

    return {
      ok: true,
      kind,
      mime,
      size: buf.length,
      path: publicPath,
    }
  })
}
