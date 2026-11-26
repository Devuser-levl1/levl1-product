import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { releaseBooking } from '@/lib/screen/scheduling/booking'
import { SLOT_CONFIG } from '@/lib/screen/scheduling/config'
import { linkKeyError, replaceReminders } from '@/lib/screen/recovery/server'
import { recoveryState } from '@/lib/screen/recovery/state'

export const dynamic = 'force-dynamic'

// POST — "Interview now": the candidate starts immediately instead of picking a
// slot. AI interviews need no human availability, so no SlotBooking is taken
// and no confirmation/reminder emails are queued. Consent is required first
// (same soft-gate as booking). Any previously booked slot is released.
export async function POST(req: NextRequest, { params }: { params: { interviewId: string } }) {
  try {
    if (!SLOT_CONFIG.instantStart) return NextResponse.json({ error: 'Instant start is not enabled — please pick a time.' }, { status: 403 })

    const interview = await prisma.interview.findUnique({ where: { id: params.interviewId }, select: { id: true, status: true, consentGiven: true, candidateId: true, inviteKey: true, terminationReason: true, startedAt: true, liveState: { select: { lastBeatAt: true } }, candidate: { select: { email: true } }, position: { select: { agencyId: true, title: true } } } })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    const keyErr = linkKeyError(interview.inviteKey, req)
    if (keyErr) return NextResponse.json({ ...keyErr, error: 'This link has been replaced by a newer one. Please use the most recent link sent to you.' }, { status: 410 })
    // Never touch an interview that has started (live, interrupted or done).
    const rs = recoveryState({ status: interview.status, terminationReason: interview.terminationReason, lastBeatAt: interview.liveState?.lastBeatAt, startedAt: interview.startedAt })
    if (rs !== 'not_started' && rs !== 'cancelled') return NextResponse.json({ error: rs === 'completed' || rs === 'withdrawn' ? 'This interview has already been completed' : 'This interview has already been started, so its time can no longer be changed.', state: rs }, { status: 409 })
    if (!interview.consentGiven) return NextResponse.json({ error: 'Please acknowledge the consent notice first.', needsConsent: true }, { status: 403 })

    await releaseBooking(interview.id).catch(() => {})
    const scheduledAt = new Date()
    await prisma.interview.update({ where: { id: interview.id }, data: { scheduledAt, status: 'scheduled' } })
    await prisma.candidate.update({ where: { id: interview.candidateId }, data: { status: 'scheduled', scheduledAt } })
    // Starting now: any reminders for an earlier booked time must not fire.
    await replaceReminders({ candidateId: interview.candidateId, agencyId: interview.position.agencyId ?? '', email: interview.candidate.email, positionTitle: interview.position.title, scheduledAt: null, joinUrl: '' })

    // Next step is the identity / mic check-in, which then opens the room.
    return NextResponse.json({ success: true, scheduledAt: scheduledAt.toISOString(), next: `/candidate/join/${interview.id}` })
  } catch (err) {
    console.error('[schedule/start-now] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not start the interview' }, { status: 500 })
  }
}
