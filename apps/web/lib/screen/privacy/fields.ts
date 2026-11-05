import { decryptJson, decryptString, encryptJson, encryptString } from './crypto'

// ── Field-level helpers for captured data (Screen-scoped, server-only) ─────
// Every writer seals, every reader opens — readers accept legacy plaintext.

/** Interview.transcript / questionResponses / liveState.transcriptTail → stored Json (encrypted string). */
export const sealJson = (value: unknown): string => encryptJson(value)

/** Stored Json (encrypted string or legacy array) → array. */
export function openArray<T = unknown>(stored: unknown): T[] {
  const v = decryptJson<unknown>(stored, [])
  return Array.isArray(v) ? (v as T[]) : []
}

export const sealText = (s: string | null | undefined): string | null => (s ? encryptString(s) : s ?? null)
export const openText = (s: string | null | undefined): string | null => decryptString(s)

// Second-voice integrity events: what the other voice said is transcript-class
// data, so it is stored encrypted in meta.transcriptEnc and the plain `detail`
// carries only timing. revealEvent() restores the quote for recruiter views.
interface EventLike { type: string; detail: string | null; meta: unknown }

export function revealEvent<T extends EventLike>(e: T): T {
  if (e.type !== 'second_voice' || !e.meta || typeof e.meta !== 'object') return e
  const meta = e.meta as Record<string, unknown>
  if (typeof meta.transcriptEnc !== 'string') return e
  const said = decryptString(meta.transcriptEnc)
  const { transcriptEnc: _drop, ...rest } = meta
  void _drop
  return {
    ...e,
    detail: said ? `${e.detail ?? 'Second voice'}: "${said}"` : e.detail,
    meta: { ...rest, ...(said ? { transcript: said } : {}) },
  }
}

export const revealEvents = <T extends EventLike>(events: T[]): T[] => events.map(revealEvent)
