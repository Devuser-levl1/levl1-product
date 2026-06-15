import crypto from 'crypto'

// AES-256-GCM encryption for board credentials at rest. The key is derived from
// ENCRYPTION_KEY (preferred) or JWT_SECRET so we don't store plaintext creds.
// Output format: base64(iv).base64(authTag).base64(ciphertext)

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'levl1-dev-encryption-key-change-me'
  return crypto.createHash('sha256').update(secret).digest() // 32 bytes
}

export function encryptJson(value: unknown): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`
}

export function decryptJson<T = unknown>(blob: string): T | null {
  try {
    const [ivB64, tagB64, dataB64] = blob.split('.')
    if (!ivB64 || !tagB64 || !dataB64) return null
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
    return JSON.parse(plaintext.toString('utf8')) as T
  } catch (e) {
    console.error('[jobboards/crypto] decrypt failed:', e)
    return null
  }
}
