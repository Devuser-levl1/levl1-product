import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const agency = await prisma.agency.findUnique({
      where: { id: params.id },
      include: {
        users: { select: { name: true, email: true, role: true, lastLoginAt: true } },
        positions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, title: true, company: true, status: true, createdAt: true,
            _count: { select: { candidates: true } },
          },
        },
      },
    })

    if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

    // Recent interviews for this agency (via positions)
    const interviews = await prisma.interview.findMany({
      where: { position: { agencyId: params.id } },
      take: 15,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, scheduledAt: true, createdAt: true, runningScore: true,
        candidate: { select: { name: true, score: true } },
        position: { select: { title: true } },
      },
    })

    return NextResponse.json({
      id: agency.id,
      name: agency.name,
      email: agency.billingEmail ?? agency.senderEmail ?? '',
      website: agency.website,
      plan: agency.plan,
      gstNumber: agency.gstNumber,
      legalName: agency.legalName,
      subscriptionStatus: agency.subscriptionStatus,
      currentPeriodEnd: agency.currentPeriodEnd?.toISOString() ?? null,
      trialExpiresAt: agency.trialExpiresAt?.toISOString() ?? null,
      interviewsUsed: agency.interviewsUsed,
      interviewsLimit: agency.plan === 'trial' ? agency.trialLimit : agency.interviewsLimit,
      createdAt: agency.createdAt.toISOString(),
      users: agency.users.map((u) => ({
        name: u.name, email: u.email, role: u.role,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      })),
      positions: agency.positions.map((p) => ({
        id: p.id, title: p.title, company: p.company, status: p.status,
        candidateCount: p._count.candidates, createdAt: p.createdAt.toISOString(),
      })),
      interviews: interviews.map((i) => ({
        id: i.id,
        candidateName: i.candidate?.name ?? '—',
        position: i.position?.title ?? '—',
        score: i.candidate?.score ?? i.runningScore ?? null,
        status: i.status,
        at: (i.scheduledAt ?? i.createdAt).toISOString(),
      })),
    })
  } catch (err) {
    console.error('[admin/agencies/[id]] error:', err)
    return NextResponse.json({ error: 'Failed to load agency' }, { status: 500 })
  }
}
