import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Record a candidate's consent to the AI interview. Token-free (candidate
 * facing) — validated by interviewId only. Required before the slot picker
 * is shown.
 */
export async function POST(_req: NextRequest, { params }: { params: { interviewId: string } }) {
  try {
    const interview = await prisma.interview.findUnique({ where: { id: params.interviewId } })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    // Keep the FIRST acknowledgement timestamp (the consent record); repeat
    // acknowledgements don't overwrite it.
    const consentGivenAt = interview.consentGiven && interview.consentGivenAt ? interview.consentGivenAt : new Date()
    if (!interview.consentGiven || !interview.consentGivenAt) {
      await prisma.interview.update({
        where: { id: params.interviewId },
        data: { consentGiven: true, consentGivenAt },
      })
    }
    console.info('[consent] acknowledged', JSON.stringify({ interviewId: params.interviewId, consentGivenAt: consentGivenAt.toISOString(), surface: 'schedule' }))

    return NextResponse.json({ ok: true, consentGivenAt: consentGivenAt.toISOString() })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record consent'
    console.error('[schedule/consent] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
