import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { releaseBooking } from '@/lib/screen/scheduling/booking'
import { sendBookingEmail } from '@/lib/screen/scheduling/emails'
import { appUrl } from '@/lib/screen/app-url'
import { linkKeyError, replaceReminders, withKey, audit } from '@/lib/screen/recovery/server'
import { recoveryState } from '@/lib/screen/recovery/state'

export const dynamic = 'force-dynamic'

// POST — cancel the booking: free the slot (so it's bookable again), reset the
// interview to unscheduled, and send a cancellation email + CANCEL .ics.
export async function POST(req: NextRequest, { params }: { params: { interviewId: string } }) {
  try {
    const interview = await prisma.interview.findUnique({ where: { id: params.interviewId }, include: { candidate: true, position: { include: { agency: true } }, liveState: { select: { lastBeatAt: true } } } })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    const keyErr = linkKeyError(interview.inviteKey, req)
    if (keyErr) return NextResponse.json({ ...keyErr, error: 'This link has been replaced by a newer one. Please use the most recent link sent to you.' }, { status: 410 })
    // Never touch an interview that has started (live, interrupted or done).
    const rs = recoveryState({ status: interview.status, terminationReason: interview.terminationReason, lastBeatAt: interview.liveState?.lastBeatAt, startedAt: interview.startedAt })
    if (rs !== 'not_started' && rs !== 'cancelled') return NextResponse.json({ error: rs === 'completed' || rs === 'withdrawn' ? 'This interview has already been completed' : 'This interview has already been started, so its time can no longer be changed.', state: rs }, { status: 409 })

    const prevStart = interview.scheduledAt ?? new Date()
    await releaseBooking(interview.id)   // frees the slot for others
    await prisma.interview.update({ where: { id: interview.id }, data: { scheduledAt: null, status: 'cancelled' } })
    await prisma.candidate.update({ where: { id: interview.candidateId }, data: { scheduledAt: null, status: 'cancelled' } })
    await replaceReminders({ candidateId: interview.candidateId, agencyId: interview.position.agencyId ?? '', email: interview.candidate.email, positionTitle: interview.position.title, scheduledAt: null, joinUrl: '' })
    await audit(interview.id, 'cancelled', 'candidate', { from: interview.scheduledAt?.toISOString() ?? null })

    const baseUrl = appUrl()
    await sendBookingEmail('cancel', {
      interviewId: interview.id, candidateName: interview.candidate.name, candidateEmail: interview.candidate.email,
      positionTitle: interview.position.title, company: interview.position.company,
      agencyName: interview.position.agency?.name ?? 'Your recruiter', agency: interview.position.agency,
      start: prevStart, end: new Date(prevStart.getTime() + interview.duration * 60_000), joinUrl: withKey(`${baseUrl}/interview/${interview.id}`, interview.inviteKey),
    }).catch((e) => console.error('[schedule/cancel] notify failed:', e))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[schedule/cancel] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
  }
}
