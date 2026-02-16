import { Storage } from '@google-cloud/storage'

const REPLIT_SIDECAR_ENDPOINT = 'http://127.0.0.1:1106'

export const storageClient = new Storage({
  credentials: {
    audience: 'replit',
    subject_token_type: 'access_token',
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: 'external_account',
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: 'json',
        subject_token_field_name: 'access_token',
      },
    },
    universe_domain: 'googleapis.com',
  } as any,
  projectId: '',
})

function parseObjectPath(p: string) {
  if (!p.startsWith('/')) p = `/${p}`
  const parts = p.split('/')
  if (parts.length < 3) throw new Error('Invalid object path')
  return { bucketName: parts[1], objectName: parts.slice(2).join('/') }
}

function getPrivateDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || ''
  if (!dir) throw new Error('PRIVATE_OBJECT_DIR not set')
  return dir
}

export async function uploadBuffer(objectKey: string, buf: Buffer, contentType: string): Promise<string> {
  const privateDir = getPrivateDir()
  const fullPath = `${privateDir}/uploads/${objectKey}`
  const { bucketName, objectName } = parseObjectPath(fullPath)
  const bucket = storageClient.bucket(bucketName)
  const file = bucket.file(objectName)
  await file.save(buf, { contentType, resumable: false })
  return `/uploads/${objectKey}`
}

export async function downloadToStream(objectKey: string): Promise<{ stream: NodeJS.ReadableStream; contentType: string; size: number } | null> {
  const privateDir = getPrivateDir()
  const fullPath = `${privateDir}/uploads/${objectKey}`
  const { bucketName, objectName } = parseObjectPath(fullPath)
  const bucket = storageClient.bucket(bucketName)
  const file = bucket.file(objectName)

  const [exists] = await file.exists()
  if (!exists) return null

  const [metadata] = await file.getMetadata()
  const stream = file.createReadStream()
  return {
    stream,
    contentType: (metadata.contentType as string) || 'application/octet-stream',
    size: Number(metadata.size) || 0,
  }
}
