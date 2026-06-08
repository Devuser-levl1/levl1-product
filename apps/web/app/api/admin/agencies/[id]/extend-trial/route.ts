import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const agency = await prisma.agency.update({
      where: { id: params.id },
      data: {
        plan: 'trial',
        trialExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        interviewsUsed: 0,
        interviewsLimit: 5,
        trialLimit: 5,
      },
    })
    console.log('[admin] Extended trial for agency:', params.id)
    return NextResponse.json({ ok: true, trialExpiresAt: agency.trialExpiresAt })
  } catch (err) {
    console.error('[admin/extend-trial] error:', err)
    return NextResponse.json({ error: 'Failed to extend trial' }, { status: 500 })
  }
}
