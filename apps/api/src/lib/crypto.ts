import crypto from 'node:crypto'

function getKey() {
  const raw = process.env.ENCRYPTION_KEY ?? ''
  // Derive a stable 32-byte key from any string.
  return crypto.createHash('sha256').update(raw).digest()
}

export function encryptString(plaintext: string) {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    iv.toString('base64'),
    ciphertext.toString('base64'),
    tag.toString('base64'),
  ].join(':')
}

export function decryptString(payload: string) {
  const key = getKey()
  const [ivB64, ctB64, tagB64] = payload.split(':')
  if (!ivB64 || !ctB64 || !tagB64) throw new Error('Invalid encrypted payload')
  const iv = Buffer.from(ivB64, 'base64')
  const ciphertext = Buffer.from(ctB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

