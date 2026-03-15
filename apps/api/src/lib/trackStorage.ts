import NodeID3 from 'node-id3'
import { uploadBuffer, deleteObject } from './objectStorage'

const ALLOWED_HOSTS = ['api.kieai.com', 'cdn.kieai.com', 'kieai.com', 'aiquickdraw.com', 'storage.googleapis.com']

function isAllowedTrackUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))
  } catch {
    return false
  }
}

export interface TrackMeta {
  recipientName?: string
}

function writeId3Tags(buf: Buffer, meta: TrackMeta): Buffer {
  const tags: NodeID3.Tags = {
    title: meta.recipientName ? `${meta.recipientName} - by laguin` : 'by laguin',
    artist: 'Laguin.id',
    comment: { language: 'ind', text: 'Ubah ceritamu menjadi musik di Laguin.id' },
  }
  const tagged = NodeID3.update(tags, buf) as Buffer
  return tagged ?? buf
}

export async function downloadAndStoreTrack(orderId: string, externalUrl: string, index: number, meta?: TrackMeta): Promise<string> {
  if (!isAllowedTrackUrl(externalUrl)) {
    throw new Error(`Blocked download from disallowed host: ${externalUrl}`)
  }
  const response = await fetch(externalUrl)
  if (!response.ok) {
    throw new Error(`Failed to download track from ${externalUrl}: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  let buffer: Buffer = Buffer.from(arrayBuffer)

  const ext = guessExtension(externalUrl, response.headers.get('content-type'))

  // Write ID3 tags for MP3 files
  if (ext === 'mp3' && meta) {
    try {
      buffer = writeId3Tags(buffer, meta) as Buffer
    } catch {}
  }

  const objectKey = `tracks/${orderId}/track_${index}.${ext}`
  const localPath = await uploadBuffer(objectKey, buffer, `audio/${ext === 'mp3' ? 'mpeg' : ext}`)

  return localPath
}

export async function storeAllTracks(orderId: string, externalUrls: string[], meta?: TrackMeta): Promise<{ localUrls: string[]; errors: string[] }> {
  const localUrls: string[] = []
  const errors: string[] = []

  for (let i = 0; i < externalUrls.length; i++) {
    try {
      const localUrl = await downloadAndStoreTrack(orderId, externalUrls[i], i, meta)
      localUrls.push(localUrl)
    } catch (e: any) {
      errors.push(`Track ${i}: ${e?.message ?? 'unknown error'}`)
    }
  }

  return { localUrls, errors }
}

export async function deleteStoredTracks(orderId: string, localUrls: string[]): Promise<number> {
  let deleted = 0
  for (const url of localUrls) {
    const objectKey = url.replace(/^\/uploads\//, '')
    try {
      const ok = await deleteObject(objectKey)
      if (ok) deleted++
    } catch {}
  }
  return deleted
}

function guessExtension(url: string, contentType: string | null): string {
  if (contentType?.includes('mpeg') || contentType?.includes('mp3')) return 'mp3'
  if (contentType?.includes('wav')) return 'wav'
  if (contentType?.includes('ogg')) return 'ogg'
  if (contentType?.includes('mp4') || contentType?.includes('m4a')) return 'm4a'

  const match = url.match(/\.(\w{2,4})(?:\?|$)/)
  if (match) {
    const ext = match[1].toLowerCase()
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return ext
  }

  return 'mp3'
}
