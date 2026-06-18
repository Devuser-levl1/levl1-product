import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { linkInterviewsLogin, unifiedPayloadFor, signLevlSession, buildSessionCookie } from '@/lib/levl-sso'
import { normalizeEmail } from '@/lib/screen/auth/email'
import { verifyOtp } from '@/lib/screen/auth/otp'

export const dynamic = 'force-dynamic'

// POST { email, code } — verify the login code and issue the session. On success
// mints the SAME unified Levl1 SSO session the password login used to (we only
// changed HOW the user authenticates, not what a valid session looks like).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = normalizeEmail(body.email)
    const code = String(body.code ?? '').trim()
    if (!email || !code) return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 })

    const v = await verifyOtp(email, code)
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status })

    const user = await prisma.user.findUnique({ where: { email }, include: { agency: true } })
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), emailVerified: true } })

    // Same minting path as the retired password login.
    const account = await linkInterviewsLogin(user.email, user.id, user.agencyId)
    const token = signLevlSession(unifiedPayloadFor(account, user.name))

    const now = new Date()
    const trialDaysLeft = user.agency.trialExpiresAt
      ? Math.max(0, Math.ceil((user.agency.trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      agency: {
        id: user.agency.id, name: user.agency.name, plan: user.agency.plan,
        interviewsUsed: user.agency.interviewsUsed, interviewsLimit: user.agency.interviewsLimit,
        trialExpiresAt: user.agency.trialExpiresAt?.toISOString() ?? null, trialDaysLeft,
      },
    })
    res.headers.set('Set-Cookie', buildSessionCookie(token))
    return res
  } catch (err) {
    console.error('[auth/otp/verify] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Verification failed — please try again.' }, { status: 500 })
  }
}
