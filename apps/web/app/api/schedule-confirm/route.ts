import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, confirmationEmailHtml } from '@/lib/emailService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { candidateId, slotId, scheduledAt, duration } = body

    if (!candidateId || !scheduledAt) {
      return NextResponse.json({ error: 'candidateId and scheduledAt required' }, { status: 400 })
    }

    const scheduledDate = new Date(scheduledAt)

    // Load candidate + position
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { position: { include: { agency: true } } },
    })
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    // Update or create Interview record with scheduledAt
    let interview = await prisma.interview.findFirst({ where: { candidateId } })
    if (interview) {
      interview = await prisma.interview.update({
        where: { id: interview.id },
        data: { scheduledAt: scheduledDate, status: 'scheduled' },
      })
    } else {
      interview = await prisma.interview.create({
        data: {
          candidateId,
          positionId: candidate.positionId,
          scheduledAt: scheduledDate,
          status: 'scheduled',
          duration: duration ?? candidate.position.interviewDuration,
        },
      })
    }

    // Mark slot as booked if slotId provided
    if (slotId) {
      await prisma.interviewSlot.update({
        where: { id: slotId },
        data: { isBooked: true, candidateId },
      }).catch(() => {}) // non-critical
    }

    // Update candidate status
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: 'scheduled', scheduledAt: scheduledDate },
    })

    // Schedule reminder emails (store in DB for later processing)
    const reminderTime = new Date(scheduledDate.getTime() - 60 * 60 * 1000) // 1 hour before
    await prisma.scheduledEmail.create({
      data: {
        to: candidate.email,
        subject: `Reminder: Your interview in 1 hour — ${candidate.position.title}`,
        type: 'reminder',
        scheduledAt: reminderTime,
        candidateId,
        agencyId: candidate.position.agencyId ?? '',
        metadata: { interviewId: interview.id },
      },
    }).catch(() => {}) // non-critical

    // Send confirmation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    const interviewUrl = `${baseUrl}/candidate/interview/${interview.id}`

    await sendEmail({
      to: candidate.email,
      subject: `Interview Confirmed — ${candidate.position.title} at ${candidate.position.company}`,
      html: confirmationEmailHtml({
        candidateName: candidate.name,
        positionTitle: candidate.position.title,
        company: candidate.position.company,
        scheduledAt: scheduledDate,
        duration: duration ?? candidate.position.interviewDuration,
        interviewUrl,
      }),
    }).catch((err) => {
      console.warn('[schedule-confirm] Email send failed (non-fatal):', err.message)
    })

    return NextResponse.json({
      success: true,
      interviewId: interview.id,
      scheduledAt: scheduledDate.toISOString(),
      message: 'Interview scheduled and confirmation email sent',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Scheduling failed'
    console.error('[schedule-confirm] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
