import { NextRequest, NextResponse } from 'next/server'

export const ADMIN_COOKIE = 'admin_token'

/** True when the request carries a valid admin cookie. */
export function isAdmin(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  const secret = process.env.ADMIN_SECRET_TOKEN
  return !!secret && token === secret
}

/**
 * Guard for /api/admin/* routes. Returns a 401 response when not authorised,
 * or null when the caller may proceed.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
