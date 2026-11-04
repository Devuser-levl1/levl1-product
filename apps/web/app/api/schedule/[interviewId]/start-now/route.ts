import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { releaseBooking } from '@/lib/screen/scheduling/booking'
import { SLOT_CONFIG } from '@/lib/screen/scheduling/config'

export const dynamic = 'force-dynamic'

// POST — "Interview now": the candidate starts immediately instead of picking a
// slot. AI interviews need no human availability, so no SlotBooking is taken
// and no confirmation/reminder emails are queued. Consent is required first
// (same soft-gate as booking). Any previously booked slot is released.
export async function POST(_req: NextRequest, { params }: { params: { interviewId: string } }) {
  try {
    if (!SLOT_CONFIG.instantStart) return NextResponse.json({ error: 'Instant start is not enabled — please pick a time.' }, { status: 403 })

    const interview = await prisma.interview.findUnique({ where: { id: params.interviewId }, select: { id: true, status: true, consentGiven: true, candidateId: true } })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    if (interview.status === 'completed') return NextResponse.json({ error: 'This interview has already been completed' }, { status: 409 })
    if (!interview.consentGiven) return NextResponse.json({ error: 'Please acknowledge the consent notice first.', needsConsent: true }, { status: 403 })

    await releaseBooking(interview.id).catch(() => {})
    const scheduledAt = new Date()
    await prisma.interview.update({ where: { id: interview.id }, data: { scheduledAt, status: 'scheduled' } })
    await prisma.candidate.update({ where: { id: interview.candidateId }, data: { status: 'scheduled', scheduledAt } })

    // Next step is the identity / mic check-in, which then opens the room.
    return NextResponse.json({ success: true, scheduledAt: scheduledAt.toISOString(), next: `/candidate/join/${interview.id}` })
  } catch (err) {
    console.error('[schedule/start-now] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not start the interview' }, { status: 500 })
  }
}
