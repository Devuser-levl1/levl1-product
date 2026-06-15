import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveCallerEmail } from '@/lib/levl-identity'
import { unifiedPayloadFor, signLevlSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/levl-sso'

export const dynamic = 'force-dynamic'

// POST /api/levl/link — one-time "connect your other Levl1 product".
// Verified by EMAIL MATCH: links whichever product identities exist for the
// caller's email and grants their entitlements, then re-issues the unified
// session so SSO takes effect immediately (no re-login needed).
export async function POST(req: NextRequest) {
  const email = await resolveCallerEmail(req)
  if (!email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const [hireUser, ivwUser] = await Promise.all([
    prisma.hireUser.findFirst({ where: { email }, orderBy: { createdAt: 'asc' }, select: { id: true, tenantId: true, name: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true, agencyId: true, name: true } }),
  ])
  if (!hireUser && !ivwUser) return NextResponse.json({ error: 'No Levl1 identities found for this email' }, { status: 404 })

  const account = await prisma.levlAccount.upsert({
    where: { email },
    update: {
      ...(hireUser ? { hireUserId: hireUser.id, hireTenantId: hireUser.tenantId, entHire: true } : {}),
      ...(ivwUser ? { interviewsUserId: ivwUser.id, agencyId: ivwUser.agencyId, entInterviews: true } : {}),
    },
    create: {
      email,
      ...(hireUser ? { hireUserId: hireUser.id, hireTenantId: hireUser.tenantId, entHire: true } : {}),
      ...(ivwUser ? { interviewsUserId: ivwUser.id, agencyId: ivwUser.agencyId, entInterviews: true } : {}),
    },
  })

  const name = ivwUser?.name ?? hireUser?.name ?? email
  const res = NextResponse.json({
    linked: { hire: !!hireUser, interviews: !!ivwUser },
    entitlements: { hire: account.entHire, interviews: account.entInterviews },
  })
  // Re-issue the unified session reflecting the newly merged entitlements.
  const unified = signLevlSession(unifiedPayloadFor(account, name))
  res.cookies.set(SESSION_COOKIE, unified, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_MAX_AGE })
  return res
}
