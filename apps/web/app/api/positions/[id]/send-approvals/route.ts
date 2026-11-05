import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { sendEmail } from '@/lib/emailService'
import { appUrl } from '@/lib/screen/app-url'
import { screenEmailLogoHtml } from '@/lib/screen/brand/email-logo'

export const dynamic = 'force-dynamic'

type ApproverType = 'tech_lead' | 'hr'

// Re-sending must NOT invalidate links already in someone's inbox (it used to
// deleteMany pending tokens and mint new ones, so every earlier "Review
// questions" email opened "Invalid approval link"). Reuse a live token for the
// same recipient (extending its expiry); skip approvers who already approved;
// only retire tokens whose recipient changed or that expired.
async function issueToken(positionId: string, type: ApproverType, email: string, expires: Date):
  Promise<{ token: string; status: 'reused' | 'new' } | { status: 'already_approved' }> {
  const latest = await prisma.approvalToken.findFirst({ where: { positionId, type }, orderBy: { createdAt: 'desc' } })
  const sameRecipient = !!latest && latest.email.trim().toLowerCase() === email.trim().toLowerCase()
  if (latest && sameRecipient && latest.status === 'approved') return { status: 'already_approved' }
  if (latest && sameRecipient && latest.status === 'pending' && latest.expiresAt.getTime() > Date.now()) {
    await prisma.approvalToken.update({ where: { id: latest.id }, data: { expiresAt: expires } })
    return { token: latest.token, status: 'reused' }
  }
  // Recipient changed, link expired, or changes were requested → retire stale pending links, issue a fresh one.
  await prisma.approvalToken.deleteMany({ where: { positionId, type, status: 'pending' } })
  const created = await prisma.approvalToken.create({ data: { positionId, type, email, expiresAt: expires } })
  return { token: created.token, status: 'new' }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const position = await prisma.position.findUnique({
      where:   { id: params.id },
      include: { questionSet: true },
    })
    if (!position) return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    if (!position.questionSet) {
      return NextResponse.json({ error: 'Questions must be generated before sending for approval' }, { status: 400 })
    }

    console.log('[send-approvals] positionId:', params.id)
    console.log('[send-approvals] techLeadEmail:', position.techLeadEmail)
    console.log('[send-approvals] hrEmail:', position.hrEmail)
    console.log('[send-approvals] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)

    const agency  = await prisma.agency.findUnique({ where: { id: session.agencyId } })
    const baseUrl  = appUrl()
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const sent:   string[] = []
    const failed: string[] = []
    const alreadyApproved: string[] = []

    // ── Tech lead — independent try/catch ────────────────────────────
    try {
      if (position.techLeadEmail) {
        const techToken = await issueToken(position.id, 'tech_lead', position.techLeadEmail, expires)
        if (techToken.status === 'already_approved') { alreadyApproved.push('tech_lead') }
        else if (process.env.RESEND_API_KEY) {
          await sendEmail({
            to:      position.techLeadEmail,
            subject: `Action Required: Review interview questions for ${position.title}`,
            html:    approvalEmailHtml({ type: 'tech_lead', positionTitle: position.title, company: position.company, agencyName: agency?.name ?? 'Your recruiter', approvalUrl: `${baseUrl}/approve/${techToken.token}` }),
          })
          console.log('[send-approvals] Tech lead email sent to:', position.techLeadEmail)
        }
        if (techToken.status !== 'already_approved') sent.push('tech_lead')
      } else {
        console.warn('[send-approvals] No tech lead email on position')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[send-approvals] Tech lead email failed:', msg)
      failed.push('tech_lead')
    }

    // ── HR — independent try/catch ────────────────────────────────────
    try {
      if (position.hrEmail) {
        const hrToken = await issueToken(position.id, 'hr', position.hrEmail, expires)
        if (hrToken.status === 'already_approved') { alreadyApproved.push('hr') }
        else if (process.env.RESEND_API_KEY) {
          await sendEmail({
            to:      position.hrEmail,
            subject: `Action Required: Review interview questions for ${position.title}`,
            html:    approvalEmailHtml({ type: 'hr', positionTitle: position.title, company: position.company, agencyName: agency?.name ?? 'Your recruiter', approvalUrl: `${baseUrl}/approve/${hrToken.token}` }),
          })
          console.log('[send-approvals] HR email sent to:', position.hrEmail)
        }
        if (hrToken.status !== 'already_approved') sent.push('hr')
      } else {
        console.warn('[send-approvals] No HR email on position')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[send-approvals] HR email failed:', msg)
      failed.push('hr')
    }

    // Only (re)enter pending_approval when an approval is actually outstanding —
    // never demote an active position because someone pressed "Resend".
    if (sent.length > 0 && position.status !== 'active') {
      await prisma.position.update({ where: { id: position.id }, data: { status: 'pending_approval' } })
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      alreadyApproved,
      emailsConfigured: !!process.env.RESEND_API_KEY,
      warning: !process.env.RESEND_API_KEY ? 'RESEND_API_KEY not configured — tokens created but emails not sent' : undefined,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send approvals'
    console.error('[send-approvals] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function approvalEmailHtml(opts: { type: 'tech_lead' | 'hr'; positionTitle: string; company: string; agencyName: string; approvalUrl: string }) {
  const isTech    = opts.type === 'tech_lead'
  const roleLabel = isTech ? 'Technical Lead' : 'HR Manager'
  const qTypes    = isTech ? 'technical, scenario, and whiteboard questions' : 'behavioral and EQ questions'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 20px rgba(79,70,229,0.08)">
  <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px">
    ${screenEmailLogoHtml({ onDark: true, height: 34 })}
    <div style="font-size:15px;font-weight:600;color:#fff;margin-top:10px">Interview review</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">Action required from ${roleLabel}</div>
  </div>
  <div style="padding:32px">
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1E293B">Questions ready for your review</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 20px"><strong>${opts.agencyName}</strong> has generated interview questions for the <strong>${opts.positionTitle}</strong> role at <strong>${opts.company}</strong> and needs your review of the ${qTypes} before interviews begin.</p>
    <a href="${opts.approvalUrl}" style="display:block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-align:center;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Review Questions &rarr;</a>
    <p style="font-size:12px;color:#94A3B8;margin-top:20px">This link expires in 7 days. No login required.</p>
  </div>
</div></body></html>`
}
