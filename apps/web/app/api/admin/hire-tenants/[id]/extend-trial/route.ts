import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { trialEndDate } from '@/lib/hire/trial-config'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req); if (denied) return denied
  const t = await prisma.hireTenant.update({
    where: { id: params.id },
    data: { trialActive: true, trialEndsAt: trialEndDate(), usageCandidatesThisMonth: 0, usageResetAt: new Date() },
  })
  return NextResponse.json({ ok: true, trialEndsAt: t.trialEndsAt })
}
