import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { linkInterviewsLogin, unifiedPayloadFor, signLevlSession, buildSessionCookie } from '@/lib/levl-sso'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { agency: true },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    })

    // Levl1 SSO: record the Interviews side of this account and issue the
    // unified session (carries any linked Hire entitlement → access both
    // products with one login).
    const account = await linkInterviewsLogin(user.email, user.id, user.agencyId)
    const token = signLevlSession(unifiedPayloadFor(account, user.name))

    const now           = new Date()
    const trialDaysLeft = user.agency.trialExpiresAt
      ? Math.max(0, Math.ceil((user.agency.trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    const res = NextResponse.json({
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
      agency: {
        id:              user.agency.id,
        name:            user.agency.name,
        plan:            user.agency.plan,
        interviewsUsed:  user.agency.interviewsUsed,
        interviewsLimit: user.agency.interviewsLimit,
        trialExpiresAt:  user.agency.trialExpiresAt?.toISOString() ?? null,
        trialDaysLeft,
      },
    })
    res.headers.set('Set-Cookie', buildSessionCookie(token))
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed'
    console.error('[auth/login] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
