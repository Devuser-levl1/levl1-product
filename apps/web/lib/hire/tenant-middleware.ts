import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

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
    const authHeader = req.headers.get('authorization')
    let token: string | null = null
    if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7)
    // Fallback to a cookie so browser navigations work without a header.
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
    return handler(req, hireCtx, flat)
  }
}
