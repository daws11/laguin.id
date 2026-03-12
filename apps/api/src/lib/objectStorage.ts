import { Client } from '@replit/object-storage'

const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || undefined
const client = new Client({ bucketId })

let _prefix: string | null = null

function getPrefix(): string {
  if (_prefix !== null) return _prefix

  const dir = (process.env.PRIVATE_OBJECT_DIR || '').trim()
  if (!dir) {
    console.warn('[objectStorage] PRIVATE_OBJECT_DIR not set — uploads will be stored at bucket root')
    _prefix = ''
    return _prefix
  }

  const normalized = dir.replace(/^\/+/, '').replace(/\/+$/, '')
  const parts = normalized.split('/')

  if (parts.length < 2) {
    _prefix = ''
  } else {
    _prefix = parts.slice(1).join('/') + '/'
  }

  return _prefix
}

export async function uploadBuffer(objectKey: string, buf: Buffer, _contentType: string): Promise<string> {
  const prefix = getPrefix()
  const fullKey = `${prefix}uploads/${objectKey}`
  const result = await client.uploadFromBytes(fullKey, buf)
  if (!result.ok) {
    throw new Error(`Object storage upload failed: ${JSON.stringify(result.error)}`)
  }
  return `/uploads/${objectKey}`
}

export async function downloadBuffer(objectKey: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const prefix = getPrefix()
  const fullKey = `${prefix}uploads/${objectKey}`

  const result = await client.downloadAsBytes(fullKey)
  if (!result.ok) {
    return null
  }

  const raw = result.value
  const buf = Array.isArray(raw) ? raw[0] : raw
  const ext = objectKey.split('.').pop()?.toLowerCase() ?? ''
  const contentType = mimeFromExt(ext)

  return {
    buffer: buf as Buffer,
    contentType,
  }
}

export async function deleteObject(objectKey: string): Promise<boolean> {
  const prefix = getPrefix()
  const fullKey = `${prefix}uploads/${objectKey}`
  const result = await client.delete(fullKey)
  return result.ok
}

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
  }
  return map[ext] || 'application/octet-stream'
}
