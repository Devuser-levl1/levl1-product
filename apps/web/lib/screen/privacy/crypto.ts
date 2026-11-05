import crypto from 'crypto'

// ── Captured-data encryption at rest (Screen-scoped, server-only) ──────────
// Candidate photo, interview audio, transcript, per-question responses, the
// live transcript tail and second-voice snippets are encrypted with
// AES-256-GCM BEFORE they reach Postgres. Render already encrypts its disks,
// but this also covers the app↔DB hop (Render's internal connection is not
// TLS) and DB-level access (backups, dumps, console reads).
//
// Key (first one set wins):
//   1. SCREEN_DATA_KEY   — dedicated key (recommended; any string ≥32 chars)
//   2. ENCRYPTION_KEY    — the platform's general encryption key
//   3. JWT_SECRET        — HKDF-derived sub-key (domain-separated), so prod is
//                          never left on plaintext while a dedicated key is added
// A 1-byte key id travels with every ciphertext, so moving from (3) to (1)
// later keeps old rows readable as long as the old secret is still present.
// Never a hardcoded fallback in production.
//
// Formats
//   string : "lv1e:<kid>:<iv b64>:<tag b64>:<ciphertext b64>"
//   bytes  : "LV1E" | kid(1) | iv(12) | tag(16) | ciphertext
// Readers accept legacy plaintext (rows written before this change) so the
// rollout needs no backfill; the retention purge ages those out.

const STR_PREFIX = 'lv1e:'
const MAGIC = Buffer.from('LV1E')

type KeyId = 1 | 2 | 3 | 9

function keyFor(kid: KeyId): Buffer | null {
  const s = kid === 1 ? process.env.SCREEN_DATA_KEY
    : kid === 2 ? process.env.ENCRYPTION_KEY
    : kid === 3 ? process.env.JWT_SECRET
    : process.env.NODE_ENV !== 'production' ? 'levl1-screen-dev-only-data-key' : undefined
  if (!s || s.length < (kid === 9 ? 1 : 32)) return null
  return Buffer.from(crypto.hkdfSync('sha256', s, 'levl1-screen-captured-data', `kid:${kid}`, 32))
}

function activeKey(): { kid: KeyId; key: Buffer } {
  for (const kid of [1, 2, 3, 9] as KeyId[]) {
    const key = keyFor(kid)
    if (key) return { kid, key }
  }
  throw new Error('No encryption key configured (set SCREEN_DATA_KEY) — refusing to store captured candidate data unencrypted.')
}

function seal(plain: Buffer) {
  const { kid, key } = activeKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain), cipher.final()])
  return { kid, iv, tag: cipher.getAuthTag(), ct }
}

function open(kid: number, iv: Buffer, tag: Buffer, ct: Buffer): Buffer {
  const key = keyFor(kid as KeyId)
  if (!key) throw new Error(`Encryption key ${kid} is not available`)
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(ct), d.final()])
}

export function isEncryptedString(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(STR_PREFIX)
}

export function encryptString(plain: string): string {
  const { kid, iv, tag, ct } = seal(Buffer.from(plain, 'utf8'))
  return `${STR_PREFIX}${kid}:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

/** Decrypts an "lv1e:" string; returns plaintext input unchanged (legacy rows). null on tamper/missing key. */
export function decryptString(v: string | null | undefined): string | null {
  if (v == null) return null
  if (!isEncryptedString(v)) return v
  try {
    const [kid, iv, tag, ct] = v.slice(STR_PREFIX.length).split(':')
    return open(Number(kid), Buffer.from(iv, 'base64'), Buffer.from(tag, 'base64'), Buffer.from(ct, 'base64')).toString('utf8')
  } catch (e) {
    console.error('[screen/privacy] decrypt failed:', e instanceof Error ? e.message : e)
    return null
  }
}

export function encryptBytes(plain: Buffer): Buffer {
  const { kid, iv, tag, ct } = seal(plain)
  return Buffer.concat([MAGIC, Buffer.from([kid]), iv, tag, ct])
}

/** Decrypts an "LV1E" blob; legacy plaintext bytes are returned unchanged. null on tamper/missing key. */
export function decryptBytes(buf: Buffer | Uint8Array): Buffer | null {
  const b = Buffer.from(buf)
  if (b.length < 33 || !b.subarray(0, 4).equals(MAGIC)) return b
  try {
    return open(b[4], b.subarray(5, 17), b.subarray(17, 33), b.subarray(33))
  } catch (e) {
    console.error('[screen/privacy] decrypt failed:', e instanceof Error ? e.message : e)
    return null
  }
}

/** JSON value → encrypted string (stored in a Json column as a JSON string). */
export function encryptJson(value: unknown): string {
  return encryptString(JSON.stringify(value))
}

/** Json column → value. Accepts an encrypted string or a legacy plaintext JSON value. */
export function decryptJson<T>(stored: unknown, fallback: T): T {
  if (stored == null) return fallback
  if (!isEncryptedString(stored)) return stored as T
  const s = decryptString(stored)
  if (s == null) return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}

/** True when a real (non-dev) key is configured — surfaced by the privacy notice config. */
export function encryptionConfigured(): boolean {
  return !!(keyFor(1) || keyFor(2) || keyFor(3))
}
