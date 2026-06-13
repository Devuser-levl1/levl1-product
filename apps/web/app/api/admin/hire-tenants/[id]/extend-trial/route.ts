import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req); if (denied) return denied
  const t = await prisma.hireTenant.update({
    where: { id: params.id },
    data: { trialActive: true, trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), usageCandidatesThisMonth: 0, usageInterviewsThisMonth: 0, usageResetAt: new Date() },
  })
  return NextResponse.json({ ok: true, trialEndsAt: t.trialEndsAt })
}
