/**
 * objectStorage.ts
 *
 * Selects a storage backend at runtime based on environment:
 *   - Replit  → @replit/object-storage  (when REPL_ID is set)
 *   - GCS     → @google-cloud/storage   (when GCS_BUCKET is set)
 *   - S3      → @aws-sdk/client-s3      (when S3 config exists in DB Settings)
 *   - null    → no-op, uploads throw a clear error (server still starts)
 *
 * The backend is initialised lazily on first use so a missing/wrong
 * provider never crashes the process at startup.
 */

import { prisma } from './prisma'
import { maybeDecrypt } from './settings'

interface Backend {
  upload(key: string, buf: Buffer, contentType: string): Promise<string>
  download(key: string): Promise<{ buffer: Buffer; contentType: string } | null>
  delete(key: string): Promise<boolean>
}

// ─── prefix helper (Replit private-dir compat) ───────────────────────────────

function getPrefix(): string {
  const dir = (process.env.PRIVATE_OBJECT_DIR || '').trim()
  if (!dir) return ''
  const normalized = dir.replace(/^\/+/, '').replace(/\/+$/, '')
  const parts = normalized.split('/')
  return parts.length < 2 ? '' : parts.slice(1).join('/') + '/'
}

// ─── MIME helper ─────────────────────────────────────────────────────────────

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf',
  }
  return map[ext] || 'application/octet-stream'
}

// ─── backend implementations ─────────────────────────────────────────────────

async function buildReplitBackend(): Promise<Backend> {
  const { Client } = await import('@replit/object-storage')
  const client = new Client({ bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || undefined })
  return {
    async upload(key, buf) {
      const result = await client.uploadFromBytes(key, buf)
      if (!result.ok) throw new Error(`Replit upload failed: ${JSON.stringify(result.error)}`)
      return `/uploads/${key.replace(/^.*?uploads\//, '')}`
    },
    async download(key) {
      const result = await client.downloadAsBytes(key)
      if (!result.ok) return null
      const raw = result.value
      const buffer = (Array.isArray(raw) ? raw[0] : raw) as Buffer
      const ext = key.split('.').pop()?.toLowerCase() ?? ''
      return { buffer, contentType: mimeFromExt(ext) }
    },
    async delete(key) {
      const result = await client.delete(key)
      return result.ok
    },
  }
}

async function buildGCSBackend(bucketName: string): Promise<Backend> {
  const { Storage } = await import('@google-cloud/storage')
  const storage = new Storage()
  const bucket = storage.bucket(bucketName)
  return {
    async upload(key, buf, contentType) {
      const file = bucket.file(key)
      await file.save(buf, { contentType, resumable: false })
      return `/uploads/${key.replace(/^.*?uploads\//, '')}`
    },
    async download(key) {
      const file = bucket.file(key)
      const [exists] = await file.exists()
      if (!exists) return null
      const [data] = await file.download()
      const ext = key.split('.').pop()?.toLowerCase() ?? ''
      return { buffer: data as Buffer, contentType: mimeFromExt(ext) }
    },
    async delete(key) {
      try { await bucket.file(key).delete(); return true } catch { return false }
    },
  }
}

async function buildS3Backend(
  endpoint: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string,
  region?: string,
): Promise<Backend> {
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    endpoint,
    region: region || 'auto',
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })
  console.log(`[objectStorage] S3 backend initialised (endpoint=${endpoint}, bucket=${bucket})`)
  return {
    async upload(key, buf, contentType) {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: contentType,
      }))
      return `/uploads/${key.replace(/^.*?uploads\//, '')}`
    },
    async download(key) {
      try {
        const res = await client.send(new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }))
        const body = res.Body
        if (!body) return null
        const chunks: Buffer[] = []
        for await (const chunk of body as AsyncIterable<Uint8Array>) {
          chunks.push(Buffer.from(chunk))
        }
        const buffer = Buffer.concat(chunks)
        const ext = key.split('.').pop()?.toLowerCase() ?? ''
        return { buffer, contentType: res.ContentType || mimeFromExt(ext) }
      } catch (err: any) {
        if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null
        throw err
      }
    },
    async delete(key) {
      try {
        await client.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }))
        return true
      } catch {
        return false
      }
    },
  }
}

function buildNullBackend(): Backend {
  return {
    async upload() { throw new Error('No object storage configured. Set up S3/R2 in admin settings, or set GCS_BUCKET / REPL_ID env vars.') },
    async download() { return null },
    async delete() { return false },
  }
}

// ─── lazy singleton ───────────────────────────────────────────────────────────

let _backend: Backend | null = null

/** Call this when S3 settings are updated in the admin panel to force re-init. */
export function invalidateStorageBackend() {
  _backend = null
}

async function getS3ConfigFromDB(): Promise<{
  endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string; region?: string
} | null> {
  try {
    const s = await prisma.settings.findFirst()
    if (!s) return null
    const endpoint = (s as any).s3Endpoint
    const bucket = (s as any).s3Bucket
    const accessKeyId = maybeDecrypt((s as any).s3AccessKeyEnc)
    const secretAccessKey = maybeDecrypt((s as any).s3SecretKeyEnc)
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null
    return { endpoint, bucket, accessKeyId, secretAccessKey, region: (s as any).s3Region ?? undefined }
  } catch {
    return null
  }
}

async function getBackend(): Promise<Backend> {
  if (_backend) return _backend
  if (process.env.REPL_ID) {
    _backend = await buildReplitBackend()
  } else if (process.env.GCS_BUCKET) {
    _backend = await buildGCSBackend(process.env.GCS_BUCKET)
  } else {
    // Check DB for S3-compatible config (Cloudflare R2, AWS S3, MinIO, etc.)
    const s3 = await getS3ConfigFromDB()
    if (s3) {
      _backend = await buildS3Backend(s3.endpoint, s3.bucket, s3.accessKeyId, s3.secretAccessKey, s3.region)
    } else {
      console.warn('[objectStorage] No storage backend configured. Set up S3/R2 in admin settings, or use GCS_BUCKET / REPL_ID env vars.')
      _backend = buildNullBackend()
    }
  }
  return _backend
}

// ─── public API ──────────────────────────────────────────────────────────────

export async function uploadBuffer(objectKey: string, buf: Buffer, contentType: string): Promise<string> {
  const prefix = getPrefix()
  const fullKey = `${prefix}uploads/${objectKey}`
  return (await getBackend()).upload(fullKey, buf, contentType)
}

export async function downloadBuffer(objectKey: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const prefix = getPrefix()
  const fullKey = `${prefix}uploads/${objectKey}`
  return (await getBackend()).download(fullKey)
}

export async function deleteObject(objectKey: string): Promise<boolean> {
  const prefix = getPrefix()
  const fullKey = `${prefix}uploads/${objectKey}`
  return (await getBackend()).delete(fullKey)
}
