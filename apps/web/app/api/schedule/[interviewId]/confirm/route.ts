import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { bookSlot } from '@/lib/screen/scheduling/booking'
import { sendBookingEmail } from '@/lib/screen/scheduling/emails'

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
      include: { candidate: true, position: { include: { agency: true } } },
    })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    if (interview.status === 'completed') return NextResponse.json({ error: 'This interview has already been completed' }, { status: 409 })
    // Consent soft-gate: must be acknowledged before a slot can be confirmed.
    if (!interview.consentGiven) return NextResponse.json({ error: 'Please acknowledge the consent notice before booking.', needsConsent: true }, { status: 403 })

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    const joinUrl = `${appUrl}/interview/${interview.id}`

    await sendBookingEmail('confirm', {
      interviewId: interview.id, candidateName: interview.candidate.name, candidateEmail: interview.candidate.email,
      positionTitle: interview.position.title, company: interview.position.company,
      agencyName: interview.position.agency?.name ?? 'Your recruiter', agency: interview.position.agency,
      start: booked.start, end: booked.end, joinUrl,
    }).catch((e) => console.error('[schedule/confirm] notify failed:', e))

    // Reminder records (a cron sends these).
    const m24 = new Date(scheduledAt.getTime() - 24 * 3600_000)
    const m15 = new Date(scheduledAt.getTime() - 15 * 60_000)
    await prisma.scheduledEmail.createMany({
      data: [
        { to: interview.candidate.email, subject: `Reminder: Interview tomorrow — ${interview.position.title}`, type: '24hr_reminder', scheduledAt: m24, candidateId: interview.candidateId, agencyId: interview.position.agencyId ?? '', metadata: { joinUrl } },
        { to: interview.candidate.email, subject: `Your interview starts in 15 minutes — ${interview.position.title}`, type: '15min_reminder', scheduledAt: m15, candidateId: interview.candidateId, agencyId: interview.position.agencyId ?? '', metadata: { joinUrl } },
      ],
    }).catch(() => {})

    return NextResponse.json({ success: true, scheduledAt: scheduledAt.toISOString(), joinUrl })
  } catch (err) {
    console.error('[schedule/confirm] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to confirm slot' }, { status: 500 })
  }
}
