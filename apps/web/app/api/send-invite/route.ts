import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { sendEmail, inviteEmailHtml } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

/** Health-check: GET /api/send-invite → 200 { ok: true }
 *  Use this to confirm the route is reachable before debugging POSTs.
 *  curl https://levl1.io/api/send-invite  →  {"ok":true,"route":"send-invite"}
 */
export function GET() {
  return NextResponse.json({ ok: true, route: 'send-invite', ts: new Date().toISOString() })
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const body = await req.json()
    const { candidateId } = body
    if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

    // Debug logging
    const candidateEmail: string | undefined = body.candidateEmail
    console.log('[send-invite] candidateId received:', candidateId)
    console.log('[send-invite] candidateEmail received:', candidateEmail)
    console.log('[send-invite] agencyId from session:', session.agencyId)

    // Load candidate + position + agency from DB
    // Primary: look up by DB id. Fallback: look up by email (handles stale store IDs)
    let candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { position: true },
    })
    if (!candidate && candidateEmail) {
      console.log('[send-invite] ID lookup missed — trying email fallback:', candidateEmail)
      candidate = await prisma.candidate.findFirst({
        where: { email: candidateEmail },
        include: { position: true },
        orderBy: { uploadedAt: 'desc' }, // most recently uploaded if duplicates
      })
    }
    console.log('[send-invite] candidate found:', !!candidate, candidate ? `id=${candidate.id} email=${candidate.email}` : '(null)')
    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found', candidateId, candidateEmail },
        { status: 404 },
      )
    }

    const agency = await prisma.agency.findUnique({ where: { id: session.agencyId } })
    if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

    // Create or reuse interview token
    let token = await prisma.interviewToken.findFirst({
      where: { interview: { candidate: { id: candidateId } } },
    })

    if (!token) {
      // Ensure an Interview record exists
      let interview = await prisma.interview.findFirst({ where: { candidateId } })
      if (!interview) {
        interview = await prisma.interview.create({
          data: {
            candidateId,
            positionId: candidate.positionId,
            status: 'scheduled',
            duration: candidate.position.interviewDuration,
          },
        })
      }
      // Create token (30-day expiry)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)
      token = await prisma.interviewToken.create({
        data: { interviewId: interview.id, expiresAt },
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    const interviewBaseUrl = process.env.NEXT_PUBLIC_INTERVIEW_BASE_URL ?? baseUrl
    const schedulingUrl = `${interviewBaseUrl}/candidate/interview/${token.token}`

    // Send real email (re-read env at request time — avoids stale module-level snapshot)
    const emailConfigured = !!process.env.RESEND_API_KEY
    console.log('[send-invite] RESEND_API_KEY present:', emailConfigured)
    if (emailConfigured) {
      await sendEmail({
        to: candidate.email,
        subject: `Interview Invitation — ${candidate.position.title} at ${candidate.position.company}`,
        html: inviteEmailHtml({
          candidateName: candidate.name,
          positionTitle: candidate.position.title,
          company: candidate.position.company,
          agencyName: agency.senderName ?? agency.name,
          schedulingUrl,
          duration: candidate.position.interviewDuration,
        }),
        from: agency.senderEmail
          ? `${agency.senderName ?? agency.name} <${agency.senderEmail}>`
          : undefined,
      })
    } else {
      console.log('[send-invite] RESEND_API_KEY not configured — skipping email send')
      console.log('[send-invite] Would send to:', candidate.email, 'link:', schedulingUrl)
    }

    // Update candidate status in DB
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status: 'invited',
        invitedAt: new Date(),
      },
    })

    // Create notification for recruiter
    await prisma.notification.create({
      data: {
        agencyId: session.agencyId,
        type: 'invite_sent',
        title: 'Invite sent',
        body: `Interview invite sent to ${candidate.name} for ${candidate.position.title}`,
        link: `/dashboard`,
      },
    }).catch(() => {}) // non-critical

    return NextResponse.json({
      success: true,
      schedulingUrl,
      emailSent: emailConfigured,
      sentAt: new Date().toISOString(),
      warning: emailConfigured ? undefined : 'Email not sent — RESEND_API_KEY not configured. Link generated but email not delivered.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send invite'
    console.error('[send-invite] error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
