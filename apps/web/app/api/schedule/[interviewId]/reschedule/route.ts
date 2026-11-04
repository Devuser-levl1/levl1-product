import { NextRequest, NextResponse } from 'next/server'
import { earliestSlotStart } from '@/lib/screen/scheduling/config'
import { prisma } from '@/lib/prisma'
import { bookSlot } from '@/lib/screen/scheduling/booking'
import { sendBookingEmail } from '@/lib/screen/scheduling/emails'
import { appUrl } from '@/lib/screen/app-url'

export const dynamic = 'force-dynamic'

// POST { selectedSlot } — release the current slot and book a new one in ONE
// transaction (bookSlot deletes the old booking then creates the new; a clash
// on the new slot rolls back and keeps the old). Sends a reschedule email + .ics.
export async function POST(req: NextRequest, { params }: { params: { interviewId: string } }) {
  try {
    const { selectedSlot } = await req.json()
    const scheduledAt = new Date(selectedSlot)
    if (!selectedSlot || isNaN(scheduledAt.getTime())) return NextResponse.json({ error: 'Valid selectedSlot required' }, { status: 400 })

    const interview = await prisma.interview.findUnique({ where: { id: params.interviewId }, include: { candidate: true, position: { include: { agency: true } } } })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    if (interview.status === 'completed') return NextResponse.json({ error: 'This interview is already completed' }, { status: 409 })
    if (!interview.consentGiven) return NextResponse.json({ error: 'Please acknowledge the consent notice first.', needsConsent: true }, { status: 403 })

    // Lead-time floor (config, default 0 = today's remaining slots are bookable).
    if (scheduledAt.getTime() < earliestSlotStart().getTime() - 120_000) {
      return NextResponse.json({ error: 'That time has already passed — please pick a later slot.', reason: 'too_soon' }, { status: 400 })
    }
    const booked = await bookSlot(interview.id, interview.positionId, interview.candidateId, scheduledAt, interview.duration)
    if (!booked.ok) return NextResponse.json({ error: booked.reason === 'taken' ? 'That slot was just taken — please pick another.' : 'Could not reschedule.', reason: booked.reason }, { status: booked.reason === 'taken' ? 409 : 500 })

    await prisma.interview.update({ where: { id: interview.id }, data: { scheduledAt, status: 'scheduled' } })
    await prisma.candidate.update({ where: { id: interview.candidateId }, data: { scheduledAt } })

    const baseUrl = appUrl()
    await sendBookingEmail('reschedule', {
      interviewId: interview.id, candidateName: interview.candidate.name, candidateEmail: interview.candidate.email,
      positionTitle: interview.position.title, company: interview.position.company,
      agencyName: interview.position.agency?.name ?? 'Your recruiter', agency: interview.position.agency,
      start: booked.start, end: booked.end, joinUrl: `${baseUrl}/interview/${interview.id}`,
    }).catch((e) => console.error('[schedule/reschedule] notify failed:', e))

    return NextResponse.json({ success: true, scheduledAt: scheduledAt.toISOString() })
  } catch (err) {
    console.error('[schedule/reschedule] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to reschedule' }, { status: 500 })
  }
}
