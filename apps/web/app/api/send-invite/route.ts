import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { effectiveInterviewMinutes } from '@/lib/screen/session/duration'
import { sendEmail, agencyFromAddress } from '@/lib/emailService'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { buildInviteEmail } from '@/lib/screen/recruiter/invite-email'
import { sendWhatsAppInvite } from '@/lib/whatsappService'
import { generateAvailableSlots, formatSlotLabel } from '@/lib/slots'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ ok: true, route: 'send-invite', ts: new Date().toISOString() })
}

export async function POST(req: NextRequest) {
  try {
    const access = recruiterAccess(req, { edit: true })
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const session = access.session

    const body = await req.json()
    const { candidateId, candidateEmail: bodyEmail } = body
    if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

    console.log('[send-invite] candidateId received:', candidateId)
    console.log('[send-invite] candidateEmail received:', bodyEmail)
    console.log('[send-invite] agencyId from session:', session.agencyId)

    // Primary lookup by DB id; fallback by email
    let candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, position: { agencyId: session.agencyId } },
      include: { position: true },
    })
    if (!candidate && bodyEmail) {
      console.log('[send-invite] ID lookup missed — trying email fallback:', bodyEmail)
      candidate = await prisma.candidate.findFirst({
        where: { email: bodyEmail, position: { agencyId: session.agencyId } },
        include: { position: true },
        orderBy: { uploadedAt: 'desc' },
      })
    }
    console.log('[send-invite] candidate found:', !!candidate, candidate ? `id=${candidate.id} email=${candidate.email}` : '(null)')
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found', candidateId, candidateEmail: bodyEmail }, { status: 404 })
    }

    const agency = await prisma.agency.findUnique({ where: { id: session.agencyId } })
    if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

    // 1. Ensure an Interview record exists BEFORE sending the link
    let interview = await prisma.interview.findFirst({ where: { candidateId: candidate.id } })
    if (!interview) {
      interview = await prisma.interview.create({
        data: {
          candidateId: candidate.id,
          positionId:  candidate.positionId,
          status:      'scheduled',
          duration:    effectiveInterviewMinutes(candidate.position),
          agentOnline: false,
          candidateJoined: false,
        },
      })
      console.log('[send-invite] Created interview record:', interview.id)
    } else {
      console.log('[send-invite] Reusing existing interview record:', interview.id)
    }

    // 2. Scheduling URL — candidate picks their slot here first
    const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    const schedulingUrl = `${appUrl}/schedule/${interview.id}`
    // Direct join URL (used in confirmation email after scheduling)
    const joinUrl       = `${appUrl}/interview/${interview.id}`

    console.log('[send-invite] schedulingUrl:', schedulingUrl)
    console.log('[send-invite] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)

    // 3. Send invite email with scheduling URL
    const emailConfigured = !!process.env.RESEND_API_KEY
    // Recruiter-editable template: position override → agency → default.
    // Variables are substituted + HTML-escaped server-side (invite-template.ts).
    const email = buildInviteEmail({ interviewId: interview.id, candidateName: candidate.name, position: candidate.position, agency })
    if (emailConfigured) {
      await sendEmail({
        to:      candidate.email,
        subject: email.subject,
        html:    email.html,
        from: agencyFromAddress(agency),
      })
    } else {
      console.log('[send-invite] RESEND_API_KEY not configured — skipping email')
      console.log('[send-invite] Would send to:', candidate.email)
      console.log('[send-invite] Scheduling URL:', schedulingUrl)
    }

    // 3b. WhatsApp invite with slot options (non-blocking)
    if (candidate.phone) {
      const slotDates  = generateAvailableSlots(5)
      const duration   = effectiveInterviewMinutes(candidate.position)

      // Persist the offered slots so the WhatsApp reply webhook can resolve
      // the exact instant the candidate picks (numbers 1–5).
      try {
        await prisma.interviewSlot.deleteMany({
          where: { candidateId: candidate.id, isBooked: false },
        })
        await prisma.interviewSlot.createMany({
          data: slotDates.map((start) => ({
            positionId:  candidate!.positionId,
            candidateId: candidate!.id,
            startTime:   start,
            endTime:     new Date(start.getTime() + duration * 60 * 1000),
            duration,
          })),
        })
      } catch (slotErr) {
        console.error('[send-invite] Failed to persist offered slots:', slotErr)
      }

      const availableSlots = slotDates.map((d) => ({
        label: formatSlotLabel(d),
        value: d.toISOString(),
      }))

      sendWhatsAppInvite({
        candidateName:  candidate.name,
        candidatePhone: candidate.phone,
        positionTitle:  candidate.position.title,
        company:        candidate.position.company,
        agencyName:     agency.senderName ?? agency.name,
        availableSlots,
        schedulingUrl,
      }).catch((e) => console.error('[send-invite] WhatsApp failed:', e instanceof Error ? e.message : e))
    } else {
      console.log('[send-invite] Candidate has no phone — WhatsApp invite skipped')
    }

    // 4. Update candidate status
    await prisma.candidate.update({
      where: { id: candidate.id },
      data:  { status: 'invited', invitedAt: new Date() },
    })

    await prisma.notification.create({
      data: {
        agencyId: session.agencyId,
        type:     'invite_sent',
        title:    'Invite sent',
        body:     `Interview invite sent to ${candidate.name} for ${candidate.position.title}`,
        link:     `/positions/${candidate.positionId}`,
      },
    }).catch(() => {})

    return NextResponse.json({
      success:     true,
      interviewId: interview.id,
      schedulingUrl,
      joinUrl,
      emailSent:   emailConfigured,
      sentAt:      new Date().toISOString(),
      warning:     emailConfigured ? undefined : 'Email not sent — RESEND_API_KEY not configured',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send invite'
    console.error('[send-invite] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
