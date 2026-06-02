import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { sendEmail } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const position = await prisma.position.findUnique({
      where:   { id: params.id },
      include: { questionSet: true },
    })
    if (!position) return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    if (!position.questionSet) return NextResponse.json({ error: 'Questions must be generated before sending for approval' }, { status: 400 })

    const agency  = await prisma.agency.findUnique({ where: { id: session.agencyId } })
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const sent: string[] = []

    // Create tech lead approval token
    if (position.techLeadEmail) {
      // Delete any existing pending token
      await prisma.approvalToken.deleteMany({
        where: { positionId: position.id, type: 'tech_lead', status: 'pending' },
      })

      const techToken = await prisma.approvalToken.create({
        data: {
          positionId: position.id,
          type:       'tech_lead',
          email:      position.techLeadEmail,
          expiresAt:  expires,
        },
      })

      if (process.env.RESEND_API_KEY) {
        await sendEmail({
          to:      position.techLeadEmail,
          subject: `Action Required: Review interview questions for ${position.title}`,
          html: approvalEmailHtml({
            type:          'tech_lead',
            positionTitle: position.title,
            company:       position.company,
            agencyName:    agency?.name ?? 'Your recruiter',
            approvalUrl:   `${appUrl}/approve/${techToken.token}`,
          }),
        }).catch(err => console.error('[send-approvals] tech lead email failed:', err))
        sent.push('tech_lead')
      }
    }

    // Create HR approval token
    if (position.hrEmail) {
      await prisma.approvalToken.deleteMany({
        where: { positionId: position.id, type: 'hr', status: 'pending' },
      })

      const hrToken = await prisma.approvalToken.create({
        data: {
          positionId: position.id,
          type:       'hr',
          email:      position.hrEmail,
          expiresAt:  expires,
        },
      })

      if (process.env.RESEND_API_KEY) {
        await sendEmail({
          to:      position.hrEmail,
          subject: `Action Required: Review interview questions for ${position.title}`,
          html: approvalEmailHtml({
            type:          'hr',
            positionTitle: position.title,
            company:       position.company,
            agencyName:    agency?.name ?? 'Your recruiter',
            approvalUrl:   `${appUrl}/approve/${hrToken.token}`,
          }),
        }).catch(err => console.error('[send-approvals] HR email failed:', err))
        sent.push('hr')
      }
    }

    // Update position status
    await prisma.position.update({
      where: { id: position.id },
      data:  { status: 'pending_approval' },
    })

    return NextResponse.json({
      success: true,
      sent,
      emailsConfigured: !!process.env.RESEND_API_KEY,
      warning: !process.env.RESEND_API_KEY ? 'RESEND_API_KEY not configured — tokens created but emails not sent' : undefined,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send approvals'
    console.error('[send-approvals] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function approvalEmailHtml(opts: {
  type: 'tech_lead' | 'hr'
  positionTitle: string
  company: string
  agencyName: string
  approvalUrl: string
}) {
  const isTech  = opts.type === 'tech_lead'
  const roleLabel = isTech ? 'Technical Lead' : 'HR Manager'
  const qTypes    = isTech
    ? 'technical, scenario, and whiteboard questions'
    : 'behavioral and EQ questions'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 20px rgba(79,70,229,0.08)">
  <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px">
    <div style="font-size:22px;font-weight:800;color:#fff">Levl1 · Interview Review</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">Action required from ${roleLabel}</div>
  </div>
  <div style="padding:32px">
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1E293B">Questions ready for your review</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 20px">
      <strong>${opts.agencyName}</strong> has generated interview questions for the <strong>${opts.positionTitle}</strong> role at <strong>${opts.company}</strong>
      and needs your review of the ${qTypes} before interviews begin.
    </p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <div style="font-size:13px;color:#64748B">You can approve, edit, or remove individual questions — and add your own comments.</div>
    </div>
    <a href="${opts.approvalUrl}" style="display:block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-align:center;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(79,70,229,0.25)">
      Review Questions &rarr;
    </a>
    <p style="font-size:12px;color:#94A3B8;margin-top:20px">This link expires in 7 days. No login required.</p>
  </div>
</div>
</body>
</html>`
}
