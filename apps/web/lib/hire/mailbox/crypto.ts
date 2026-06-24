// Mailbox-secret encryption. Reuses the existing AES-256-GCM util from
// lib/jobboards/crypto.ts IN PLACE (no relocation, no lib/shared coupling) —
// Hire simply consumes the same primitive.
import { encryptJson, decryptJson } from '@/lib/jobboards/crypto'

// The dev fallback literal inside jobboards/crypto.ts. If ENCRYPTION_KEY is
// unset, that util silently falls back to JWT_SECRET or this constant — fine for
// low-value board creds, but a real mailbox password must NEVER be encrypted
// with a guessable dev key.
const DEV_FALLBACK = 'levl1-dev-encryption-key-change-me'

/**
 * Enforce a strong, dedicated ENCRYPTION_KEY before any mailbox secret is
 * encrypted. Throws (caller turns it into a clear 500) if the key is missing,
 * too short, equals JWT_SECRET, or equals the dev fallback.
 */
export function assertMailboxEncryptionKey(): void {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.trim().length < 16) {
    throw new Error('ENCRYPTION_KEY is not set (or too short) — refusing to store a mailbox password with a weak key. Set a strong ENCRYPTION_KEY in the environment.')
  }
  if (key === process.env.JWT_SECRET || key === DEV_FALLBACK) {
    throw new Error('ENCRYPTION_KEY must be a dedicated secret (not the JWT/dev fallback) before connecting a mailbox.')
  }
}

export interface MailboxSecret { password: string }

export function encryptMailboxSecret(secret: MailboxSecret): string {
  return encryptJson(secret)
}

export function decryptMailboxSecret(blob: string | null | undefined): MailboxSecret | null {
  if (!blob) return null
  return decryptJson<MailboxSecret>(blob)
}
