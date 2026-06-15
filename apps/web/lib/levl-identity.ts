import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyLevlSession, SESSION_COOKIE } from '@/lib/levl-sso'
import { getHireContext } from '@/lib/hire/tenant-middleware'
import { getSessionFromRequest } from '@/lib/auth'

// Resolve the caller's Levl1 email from whichever session they hold (unified,
// Interviews, or Hire). Used by the account-linking + /me endpoints.
export async function resolveCallerEmail(req: NextRequest): Promise<string | null> {
  const unified = req.cookies.get(SESSION_COOKIE)?.value
  if (unified) {
    const u = verifyLevlSession(unified)
    if (u?.email) return u.email.toLowerCase()
  }
  const ivw = getSessionFromRequest(req)
  if (ivw?.email) return ivw.email.toLowerCase()
  const hire = getHireContext(req)
  if (hire) {
    const hu = await prisma.hireUser.findUnique({ where: { id: hire.userId }, select: { email: true } })
    if (hu?.email) return hu.email.toLowerCase()
  }
  return null
}
