import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { bookSlot } from '@/lib/screen/scheduling/booking'
import { sendBookingEmail } from '@/lib/screen/scheduling/emails'
import { appUrl } from '@/lib/screen/app-url'
import { earliestSlotStart } from '@/lib/screen/scheduling/config'
import { linkKeyError, replaceReminders, withKey } from '@/lib/screen/recovery/server'
import { recoveryState } from '@/lib/screen/recovery/state'

export const dynamic = 'force-dynamic'

// POST { selectedSlot } — atomically book the slot for this interview, then send
// the confirmation email with an .ics attachment. Consent is required first
// (soft-gate). Double-booking is prevented by the SlotBooking unique constraint.
export async function POST(req: NextRequest, { params }: { params: { interviewId: string } }) {
  try {
    const { selectedSlot } = await req.json()
    if (!selectedSlot) return NextResponse.json({ error: 'selectedSlot required' }, { status: 400 })
    const scheduledAt = new Date(selectedSlot)
    if (isNaN(scheduledAt.getTime())) return NextResponse.json({ error: 'Invalid slot date' }, { status: 400 })

    const interview = await prisma.interview.findUnique({
      where: { id: params.interviewId },
      include: { candidate: true, position: { include: { agency: true } }, liveState: { select: { lastBeatAt: true } } },
    })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    const keyErr = linkKeyError(interview.inviteKey, req)
    if (keyErr) return NextResponse.json({ ...keyErr, error: 'This link has been replaced by a newer one. Please use the most recent link sent to you.' }, { status: 410 })
    // Never touch an interview that has started (live, interrupted or done).
    const rs = recoveryState({ status: interview.status, terminationReason: interview.terminationReason, lastBeatAt: interview.liveState?.lastBeatAt, startedAt: interview.startedAt })
    if (rs !== 'not_started' && rs !== 'cancelled') return NextResponse.json({ error: rs === 'completed' || rs === 'withdrawn' ? 'This interview has already been completed' : 'This interview has already been started, so its time can no longer be changed.', state: rs }, { status: 409 })
    // Consent soft-gate: must be acknowledged before a slot can be confirmed.
    if (!interview.consentGiven) return NextResponse.json({ error: 'Please acknowledge the consent notice before booking.', needsConsent: true }, { status: 403 })
    // Lead-time floor (config, default 0 = today's remaining slots are bookable).
    if (scheduledAt.getTime() < earliestSlotStart().getTime() - 120_000) {
      return NextResponse.json({ error: 'That time has already passed — please pick a later slot.', reason: 'too_soon' }, { status: 400 })
    }

    // Atomic booking — fails cleanly if the slot was just taken (no FK/500).
    const booked = await bookSlot(interview.id, interview.positionId, interview.candidateId, scheduledAt, interview.duration)
    if (!booked.ok) {
      return NextResponse.json(
        { error: booked.reason === 'taken' ? 'That slot was just taken — please pick another.' : (booked.error ?? 'Could not book.'), reason: booked.reason },
        { status: booked.reason === 'taken' ? 409 : 500 },
      )
    }

    await prisma.interview.update({ where: { id: interview.id }, data: { scheduledAt, status: 'scheduled' } })
    await prisma.candidate.update({ where: { id: interview.candidateId }, data: { status: 'scheduled', scheduledAt } })

    const baseUrl = appUrl()
    const joinUrl = withKey(`${baseUrl}/interview/${interview.id}`, interview.inviteKey)

    await sendBookingEmail('confirm', {
      interviewId: interview.id, candidateName: interview.candidate.name, candidateEmail: interview.candidate.email,
      positionTitle: interview.position.title, company: interview.position.company,
      agencyName: interview.position.agency?.name ?? 'Your recruiter', agency: interview.position.agency,
      start: booked.start, end: booked.end, joinUrl,
    }).catch((e) => console.error('[schedule/confirm] notify failed:', e))

    // Reminder records (a cron sends these). Replaces any earlier ones, and only
    // reminders still ahead are created (no instant "tomorrow" email same-day).
    await replaceReminders({ candidateId: interview.candidateId, agencyId: interview.position.agencyId ?? '', email: interview.candidate.email, positionTitle: interview.position.title, scheduledAt, joinUrl })

    return NextResponse.json({ success: true, scheduledAt: scheduledAt.toISOString(), joinUrl })
  } catch (err) {
    console.error('[schedule/confirm] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to confirm slot' }, { status: 500 })
  }
}
