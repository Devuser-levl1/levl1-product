import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { releaseBooking } from '@/lib/screen/scheduling/booking'
import { sendBookingEmail } from '@/lib/screen/scheduling/emails'

export const dynamic = 'force-dynamic'

// POST — cancel the booking: free the slot (so it's bookable again), reset the
// interview to unscheduled, and send a cancellation email + CANCEL .ics.
export async function POST(_req: NextRequest, { params }: { params: { interviewId: string } }) {
  try {
    const interview = await prisma.interview.findUnique({ where: { id: params.interviewId }, include: { candidate: true, position: { include: { agency: true } } } })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    if (interview.status === 'completed') return NextResponse.json({ error: 'This interview is already completed' }, { status: 409 })

    const prevStart = interview.scheduledAt ?? new Date()
    await releaseBooking(interview.id)   // frees the slot for others
    await prisma.interview.update({ where: { id: interview.id }, data: { scheduledAt: null, status: 'cancelled' } })
    await prisma.candidate.update({ where: { id: interview.candidateId }, data: { scheduledAt: null, status: 'cancelled' } })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    await sendBookingEmail('cancel', {
      interviewId: interview.id, candidateName: interview.candidate.name, candidateEmail: interview.candidate.email,
      positionTitle: interview.position.title, company: interview.position.company,
      agencyName: interview.position.agency?.name ?? 'Your recruiter', agency: interview.position.agency,
      start: prevStart, end: new Date(prevStart.getTime() + interview.duration * 60_000), joinUrl: `${appUrl}/interview/${interview.id}`,
    }).catch((e) => console.error('[schedule/cancel] notify failed:', e))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[schedule/cancel] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
  }
}
