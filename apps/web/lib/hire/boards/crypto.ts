// Board-credential encryption. Reuses the existing AES-256-GCM util from
// lib/jobboards/crypto.ts IN PLACE (no relocation, no lib/shared, no Screen
// coupling). Same ENCRYPTION_KEY enforcement as the mailbox feature.
import { encryptJson, decryptJson } from '@/lib/jobboards/crypto'

const DEV_FALLBACK = 'levl1-dev-encryption-key-change-me'

/** Throw (→ clear 500) unless a strong, dedicated ENCRYPTION_KEY is configured. */
export function assertBoardEncryptionKey(): void {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.trim().length < 16) {
    throw new Error('ENCRYPTION_KEY is not set (or too short) — refusing to store board credentials with a weak key.')
  }
  if (key === process.env.JWT_SECRET || key === DEV_FALLBACK) {
    throw new Error('ENCRYPTION_KEY must be a dedicated secret (not the JWT/dev fallback) before connecting a board.')
  }
}

export function encryptBoardSecret(secret: Record<string, string>): string {
  return encryptJson(secret)
}

export function decryptBoardSecret(blob: string | null | undefined): Record<string, string> | null {
  if (!blob) return null
  return decryptJson<Record<string, string>>(blob)
}
