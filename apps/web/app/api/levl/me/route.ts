import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveCallerEmail } from '@/lib/levl-identity'

export const dynamic = 'force-dynamic'

// GET /api/levl/me — the caller's Levl1 entitlements + whether the other product
// is linkable (an identity with the same email exists). Drives the settings UI.
export async function GET(req: NextRequest) {
  const email = await resolveCallerEmail(req)
  if (!email) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const [account, hireUser, ivwUser] = await Promise.all([
    prisma.levlAccount.findUnique({ where: { email } }),
    prisma.hireUser.findFirst({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
  ])
  return NextResponse.json({
    email,
    entitlements: { hire: account?.entHire ?? !!hireUser, interviews: account?.entInterviews ?? !!ivwUser },
    available: { hire: !!hireUser, interviews: !!ivwUser },
    linked: { hire: !!account?.hireUserId, interviews: !!account?.interviewsUserId },
  })
}
