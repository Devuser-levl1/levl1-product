import { NextRequest, NextResponse } from 'next/server'
import { earliestSlotStart } from '@/lib/screen/scheduling/config'
import { prisma } from '@/lib/prisma'
import { bookSlot } from '@/lib/screen/scheduling/booking'
import { sendBookingEmail } from '@/lib/screen/scheduling/emails'
import { appUrl } from '@/lib/screen/app-url'
import { linkKeyError, replaceReminders, withKey, audit } from '@/lib/screen/recovery/server'
import { recoveryState, canReschedule, maxReschedules } from '@/lib/screen/recovery/state'
import { sendRescheduleWhatsApp } from '@/lib/screen/recovery/notify'

export const dynamic = 'force-dynamic'

// POST { selectedSlot } — release the current slot and book a new one in ONE
// transaction (bookSlot deletes the old booking then creates the new; a clash
// on the new slot rolls back and keeps the old). Sends a reschedule email + .ics.
export async function POST(req: NextRequest, { params }: { params: { interviewId: string } }) {
  try {
    const { selectedSlot } = await req.json()
    const scheduledAt = new Date(selectedSlot)
    if (!selectedSlot || isNaN(scheduledAt.getTime())) return NextResponse.json({ error: 'Valid selectedSlot required' }, { status: 400 })

    const interview = await prisma.interview.findUnique({ where: { id: params.interviewId }, include: { candidate: true, position: { include: { agency: true } }, liveState: { select: { lastBeatAt: true } } } })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    const keyErr = linkKeyError(interview.inviteKey, req)
    if (keyErr) return NextResponse.json({ ...keyErr, error: 'This link has been replaced by a newer one. Please use the most recent link sent to you.' }, { status: 410 })
    // Only an interview that hasn't been started can move; and only so many times.
    const rs = recoveryState({ status: interview.status, terminationReason: interview.terminationReason, lastBeatAt: interview.liveState?.lastBeatAt, startedAt: interview.startedAt })
    if (!canReschedule(rs)) return NextResponse.json({ error: rs === 'completed' || rs === 'withdrawn' ? 'This interview is already completed' : rs === 'cancelled' ? 'This interview was cancelled. Please contact the hiring team for a new link.' : 'This interview has already been started, so its time can no longer be changed.', state: rs }, { status: 409 })
    if (interview.rescheduleCount >= maxReschedules()) return NextResponse.json({ error: `You've already changed this booking the maximum number of times. Please contact ${interview.position.agency?.name ?? 'the hiring team'} if you need another time.`, reason: 'limit' }, { status: 409 })
    if (!interview.consentGiven) return NextResponse.json({ error: 'Please acknowledge the consent notice first.', needsConsent: true }, { status: 403 })

    // Lead-time floor (config, default 0 = today's remaining slots are bookable).
    if (scheduledAt.getTime() < earliestSlotStart().getTime() - 120_000) {
      return NextResponse.json({ error: 'That time has already passed — please pick a later slot.', reason: 'too_soon' }, { status: 400 })
    }
    const booked = await bookSlot(interview.id, interview.positionId, interview.candidateId, scheduledAt, interview.duration)
    if (!booked.ok) return NextResponse.json({ error: booked.reason === 'taken' ? 'That slot was just taken — please pick another.' : 'Could not reschedule.', reason: booked.reason }, { status: booked.reason === 'taken' ? 409 : 500 })

    const previous = interview.scheduledAt
    await prisma.interview.update({ where: { id: interview.id }, data: { scheduledAt, status: 'scheduled', rescheduleCount: { increment: 1 } } })
    await prisma.candidate.update({ where: { id: interview.candidateId }, data: { scheduledAt } })
    await audit(interview.id, 'rescheduled', 'candidate', { from: previous?.toISOString() ?? null, to: scheduledAt.toISOString(), count: interview.rescheduleCount + 1 })

    const baseUrl = appUrl()
    const joinUrl = withKey(`${baseUrl}/interview/${interview.id}`, interview.inviteKey)
    // The old time's reminders go; new ones point at the current link.
    await replaceReminders({ candidateId: interview.candidateId, agencyId: interview.position.agencyId ?? '', email: interview.candidate.email, positionTitle: interview.position.title, scheduledAt, joinUrl })
    await sendBookingEmail('reschedule', {
      interviewId: interview.id, candidateName: interview.candidate.name, candidateEmail: interview.candidate.email,
      positionTitle: interview.position.title, company: interview.position.company,
      agencyName: interview.position.agency?.name ?? 'Your recruiter', agency: interview.position.agency,
      start: booked.start, end: booked.end, joinUrl,
    }).catch((e) => console.error('[schedule/reschedule] notify failed:', e))
    await sendRescheduleWhatsApp({ phone: interview.candidate.phone, name: interview.candidate.name, positionTitle: interview.position.title, scheduledAt, joinUrl })

    return NextResponse.json({ success: true, scheduledAt: scheduledAt.toISOString(), reschedulesLeft: Math.max(0, maxReschedules() - interview.rescheduleCount - 1) })
  } catch (err) {
    console.error('[schedule/reschedule] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to reschedule' }, { status: 500 })
  }
}
