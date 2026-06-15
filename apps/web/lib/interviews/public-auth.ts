import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// ── Interviews public-API authentication (Phase 1) ─────────────────────────
// Standalone-Interviews equivalent of lib/api/public-auth.ts. Authenticates an
// InterviewsApiKey → resolves to an AGENCY (the Interviews tenant), not a Hire
// tenant. Same sha256-hash storage and rate limiter. NO Hire dependency.

export interface InterviewsApiContext {
  agencyId: string
  apiKeyId: string
}

const KEY_PREFIX = 'ivw'

export function generateInterviewsApiKey(): { raw: string; prefix: string; hashedKey: string } {
  const random = crypto.randomBytes(24).toString('base64url')
  const raw = `${KEY_PREFIX}_${random}`
  return { raw, prefix: raw.slice(0, 8), hashedKey: hashKey(raw) }
}

export function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// Rate limit: 600 req/min per key (in-memory, per instance).
const RATE_LIMIT = 600
const WINDOW_MS = 60_000
const buckets = new Map<string, { count: number; resetAt: number }>()
function rateLimit(apiKeyId: string): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const b = buckets.get(apiKeyId)
  if (!b || b.resetAt <= now) { buckets.set(apiKeyId, { count: 1, resetAt: now + WINDOW_MS }); return { ok: true, retryAfter: 0 } }
  if (b.count >= RATE_LIMIT) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  b.count++
  return { ok: true, retryAfter: 0 }
}

function readKey(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim()
  const x = req.headers.get('x-api-key')
  return x ? x.trim() : null
}

function err(status: number, message: string, headers?: Record<string, string>) {
  return NextResponse.json({ data: null, error: message }, { status, headers })
}

export function ok(data: unknown, status = 200) { return NextResponse.json({ data, error: null }, { status }) }
export function fail(status: number, message: string) { return NextResponse.json({ data: null, error: message }, { status }) }

type NextRouteParams = Record<string, string | string[]>

export function withInterviewsApiKeyAuth(
  handler: (req: NextRequest, ctx: InterviewsApiContext, params: Record<string, string>) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context: { params?: NextRouteParams } = {}) => {
    const presented = readKey(req)
    if (!presented) return err(401, 'Missing API key. Pass it as `Authorization: Bearer <key>` or `x-api-key`.')

    const key = await prisma.interviewsApiKey.findUnique({ where: { hashedKey: hashKey(presented) }, select: { id: true, agencyId: true, revokedAt: true } })
    if (!key) return err(401, 'Invalid API key.')
    if (key.revokedAt) return err(401, 'This API key has been revoked.')

    const rl = rateLimit(key.id)
    if (!rl.ok) return err(429, 'Rate limit exceeded (600 requests/minute).', { 'Retry-After': String(rl.retryAfter) })

    prisma.interviewsApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch((e) => console.error('[interviews/public-auth] lastUsedAt failed:', e))

    const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(context.params ?? {})) flat[k] = Array.isArray(v) ? v[0] : v

    try {
      return await handler(req, { agencyId: key.agencyId, apiKeyId: key.id }, flat)
    } catch (e) {
      console.error('[interviews/public-api] route error:', e instanceof Error ? e.message : e)
      return err(500, 'Something went wrong. Please try again.')
    }
  }
}
