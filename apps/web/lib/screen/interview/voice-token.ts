import crypto from 'crypto'

// ── Interview voice token (Screen-scoped, server-only) ─────────────────────
// /api/interview/generate-speech spends ElevenLabs credits, so it must only
// speak for a REAL interview. The interview room has no secret other than the
// interview id in its URL (every candidate route authenticates that way), so
// the room exchanges that id for a short-lived signed voice token — issued only
// while the interview is live (scheduled / in progress / just completed) — and
// sends it with every line. The token is bound to one interview and expires.
//
// Format: base64url(JSON {i: interviewId, e: expiresAtSec}) + "." + HMAC-SHA256.

export const VOICE_TOKEN_TTL_MS = 4 * 60 * 60 * 1000          // longer than any interview
export const VOICE_COMPLETED_GRACE_MS = 10 * 60 * 1000        // closing lines after "completed"

function secret(): string {
  const s = process.env.VOICE_TOKEN_SECRET || process.env.JWT_SECRET
  if (s) return `screen-voice:${s}`   // domain-separated from other uses of JWT_SECRET
  if (process.env.NODE_ENV === 'production') throw new Error('VOICE_TOKEN_SECRET or JWT_SECRET must be set')
  return 'screen-voice:dev-only-secret'
}

const b64u = (b: Buffer) => b.toString('base64url')
const sign = (payload: string) => b64u(crypto.createHmac('sha256', secret()).update(payload).digest())

export function signVoiceToken(interviewId: string, ttlMs = VOICE_TOKEN_TTL_MS): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + ttlMs)
  const payload = b64u(Buffer.from(JSON.stringify({ i: interviewId, e: Math.floor(expiresAt.getTime() / 1000) })))
  return { token: `${payload}.${sign(payload)}`, expiresAt }
}

/** interviewId when the token is authentic and unexpired, else null. */
export function verifyVoiceToken(token: string | null | undefined): string | null {
  if (!token || token.length > 512) return null
  const [payload, mac] = token.split('.')
  if (!payload || !mac) return null
  const expected = sign(payload)
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
  try {
    const { i, e } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { i?: unknown; e?: unknown }
    if (typeof i !== 'string' || !i || typeof e !== 'number' || e * 1000 < Date.now()) return null
    return i
  } catch { return null }
}

/** May this interview be given a voice token right now? */
export function voiceEligible(iv: { status: string; completedAt: Date | null }): boolean {
  if (iv.status === 'scheduled' || iv.status === 'in_progress') return true
  return iv.status === 'completed' && !!iv.completedAt && Date.now() - iv.completedAt.getTime() < VOICE_COMPLETED_GRACE_MS
}
