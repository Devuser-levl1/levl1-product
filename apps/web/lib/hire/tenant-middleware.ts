import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { verifyLevlSession, SESSION_COOKIE } from '@/lib/levl-sso'
import { prisma } from '@/lib/prisma'
import { isReadOnly, TRIAL_CONFIG } from '@/lib/hire/trial-config'

const JWT_SECRET =
  process.env.JWT_SECRET ?? 'levl1-dev-secret-change-in-production-please'

export interface HireContext {
  userId: string
  tenantId: string
  role: string
}

interface HireTokenPayload {
  userId?: string
  tenantId?: string
  role?: string
  exp?: number
}

/**
 * Verify a Hire access token. Uses the same HS256/base64url scheme as the
 * Interviews product (lib/auth.ts) so we share JWT_SECRET without pulling in
 * an external jsonwebtoken dependency.
 */
function verifyHireToken(token: string): HireTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts

  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url')

  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as HireTokenPayload
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

export function getHireContext(req: NextRequest): HireContext | null {
  try {
    // 1. Unified Levl1 SSO session — preferred when present. Resolves the Hire
    //    context from the namespaced fields and ENFORCES the Hire entitlement:
    //    a Levl1 account not entitled to Hire gets no Hire access.
    const unifiedToken = req.cookies.get(SESSION_COOKIE)?.value
      ?? (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization')!.slice(7) : null)
    if (unifiedToken) {
      const u = verifyLevlSession(unifiedToken)
      if (u && u.ent && u.hireTenantId && u.hireUserId) {
        if (!u.ent.hire) return null // explicitly not entitled to Hire
        return { userId: u.hireUserId, tenantId: u.hireTenantId, role: u.hireRole ?? 'recruiter' }
      }
      // A unified token present but without Hire context falls through to legacy.
    }

    // 2. Legacy hire_token (Authorization Bearer or cookie) — kept for transition.
    const authHeader = req.headers.get('authorization')
    let token: string | null = null
    if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7)
    if (!token) token = req.cookies.get('hire_token')?.value ?? null
    if (!token) return null

    const payload = verifyHireToken(token)
    if (!payload?.tenantId || !payload?.userId) return null

    return {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role ?? 'recruiter',
    }
  } catch {
    return null
  }
}

// Next.js 14 types dynamic route params as Record<string, string | string[]>.
// The wrapper's external signature must accept that; inner handlers get a
// flattened Record<string, string> for convenience.
type NextRouteParams = Record<string, string | string[]>

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Paths that must keep working when a tenant is read-only (expired trial, no
// subscription): the upgrade/billing flow, auth/session, and the assistant's
// read-only question endpoint. Everything else that mutates is blocked.
// (auth/invite still self-guards via checkAllowance; assistant/execute is NOT
// exact-matched, so it stays blocked.)
function readOnlyAllowlisted(pathname: string): boolean {
  return (
    pathname.startsWith('/api/hire/billing') ||
    pathname.startsWith('/api/hire/auth') ||
    pathname === '/api/hire/assistant'
  )
}

/** HOC wrapper for Hire API routes — enforces tenant-scoped auth. */
export function withHireAuth(
  handler: (req: NextRequest, ctx: HireContext, params: Record<string, string>) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context: { params?: NextRouteParams } = {}) => {
    const hireCtx = getHireContext(req)
    if (!hireCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(context.params ?? {})) {
      flat[k] = Array.isArray(v) ? v[0] : v
    }
    try {
      // Read-only enforcement: once the trial has ended (and no active plan),
      // the tenant can view everything but cannot create/add/change. Data is
      // never deleted — writes are simply refused with a friendly, soft message.
      if (MUTATING.has(req.method) && !readOnlyAllowlisted(req.nextUrl.pathname)) {
        const t = await prisma.hireTenant.findUnique({
          where: { id: hireCtx.tenantId },
          select: { trialActive: true, trialEndsAt: true, subscriptionStatus: true, currentPeriodEnd: true },
        })
        if (t && isReadOnly(t)) {
          return NextResponse.json({
            reason: 'read_only', upgrade: true,
            error: 'read_only',
            message: `Your ${TRIAL_CONFIG.days}-day trial has ended — your data is safe and view-only. Upgrade to add or change anything.`,
          }, { status: 402 })
        }
      }
      return await handler(req, hireCtx, flat)
    } catch (err) {
      // Never leak stack traces to clients; log server-side for debugging.
      console.error('[hire] route error:', err instanceof Error ? err.message : err)
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
  }
}
