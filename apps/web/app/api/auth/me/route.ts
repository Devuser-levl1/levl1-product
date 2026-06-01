import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const agency = await prisma.agency.findUnique({
      where: { id: session.agencyId },
      select: {
        id:              true,
        name:            true,
        plan:            true,
        interviewsUsed:  true,
        interviewsLimit: true,
        trialExpiresAt:  true,
        trialLimit:      true,
        subscriptionStatus: true,
        currentPeriodEnd:   true,
      },
    })
    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    const now          = new Date()
    const trialDaysLeft = agency.trialExpiresAt
      ? Math.max(0, Math.ceil((agency.trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return NextResponse.json({
      user: {
        id:    session.userId,
        name:  session.name,
        email: session.email,
        role:  session.role,
      },
      agency: {
        id:              agency.id,
        name:            agency.name,
        plan:            agency.plan,
        interviewsUsed:  agency.interviewsUsed,
        interviewsLimit: agency.interviewsLimit,
        trialExpiresAt:  agency.trialExpiresAt?.toISOString() ?? null,
        trialDaysLeft,
        subscriptionStatus: agency.subscriptionStatus,
        currentPeriodEnd:   agency.currentPeriodEnd?.toISOString() ?? null,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get session'
    console.error('[auth/me] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
