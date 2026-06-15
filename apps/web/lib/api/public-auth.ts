import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// ── Public API authentication (Build 0) ────────────────────────────────────
// Mirrors withHireAuth but authenticates external callers (standalone
// Interviews, Chrome extension, ATS integrations) via an API key instead of a
// session JWT. Raw keys are never stored or logged — only their sha256 hash.

export interface ApiContext {
  tenantId: string
  apiKeyId: string
}

const KEY_PREFIX = 'lvl1'

/** Generate a fresh raw API key + its prefix + sha256 hash. */
export function generateApiKey(): { raw: string; prefix: string; hashedKey: string } {
  // 32 random bytes → URL-safe token. The raw key is shown to the user ONCE.
  const random = crypto.randomBytes(24).toString('base64url')
  const raw = `${KEY_PREFIX}_${random}`
  return { raw, prefix: raw.slice(0, 9), hashedKey: hashKey(raw) }
}

export function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// ── Simple in-memory rate limiter: 600 req/min per key ─────────────────────
const RATE_LIMIT = 600
const WINDOW_MS = 60_000
const buckets = new Map<string, { count: number; resetAt: number }>()

function rateLimit(apiKeyId: string): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const b = buckets.get(apiKeyId)
  if (!b || b.resetAt <= now) {
    buckets.set(apiKeyId, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, retryAfter: 0 }
  }
  if (b.count >= RATE_LIMIT) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  }
  b.count++
  return { ok: true, retryAfter: 0 }
}

function readPresentedKey(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim()
  const xKey = req.headers.get('x-api-key')
  if (xKey) return xKey.trim()
  return null
}

function err(status: number, message: string, extra?: Record<string, string>) {
  return NextResponse.json({ data: null, error: message }, { status, headers: extra })
}

type NextRouteParams = Record<string, string | string[]>

/** HOC wrapper for public /api/v1 routes — enforces API-key auth + rate limit. */
export function withApiKeyAuth(
  handler: (req: NextRequest, ctx: ApiContext, params: Record<string, string>) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context: { params?: NextRouteParams } = {}) => {
    const presented = readPresentedKey(req)
    if (!presented) return err(401, 'Missing API key. Pass it as `Authorization: Bearer <key>` or `x-api-key`.')

    const hashedKey = hashKey(presented)
    const key = await prisma.apiKey.findUnique({ where: { hashedKey }, select: { id: true, tenantId: true, revokedAt: true } })
    if (!key) return err(401, 'Invalid API key.')
    if (key.revokedAt) return err(401, 'This API key has been revoked.')

    const rl = rateLimit(key.id)
    if (!rl.ok) return err(429, 'Rate limit exceeded (600 requests/minute).', { 'Retry-After': String(rl.retryAfter) })

    // Fire-and-forget lastUsedAt update (never blocks the request).
    prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch((e) => console.error('[public-auth] lastUsedAt update failed:', e))

    const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(context.params ?? {})) flat[k] = Array.isArray(v) ? v[0] : v

    try {
      return await handler(req, { tenantId: key.tenantId, apiKeyId: key.id }, flat)
    } catch (e) {
      console.error('[public-api] route error:', e instanceof Error ? e.message : e)
      return err(500, 'Something went wrong. Please try again.')
    }
  }
}

/** Consistent success envelope helper. */
export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data, error: null }, { status })
}
export function fail(status: number, message: string) {
  return NextResponse.json({ data: null, error: message }, { status })
}
