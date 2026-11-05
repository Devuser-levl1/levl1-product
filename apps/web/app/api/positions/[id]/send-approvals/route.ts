import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { sendEmail } from '@/lib/emailService'
import { appUrl } from '@/lib/screen/app-url'
import { approvalEmailHtml, approvalEmailSubject } from '@/lib/screen/approvals/approval-email'

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
    const access = recruiterAccess(req, { edit: true })
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const session = access.session

    // Scoped to the caller's workspace (was an unscoped findUnique by id).
    const position = await prisma.position.findFirst({
      where:   { id: params.id, agencyId: session.agencyId },
      include: { questionSet: true },
    })
    if (!position) return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    if (!position.questionSet) {
      return NextResponse.json({ error: 'Questions must be generated before sending for approval' }, { status: 400 })
    }

    console.log('[send-approvals] positionId:', params.id)
    console.log('[send-approvals] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)

    const agency  = await prisma.agency.findUnique({ where: { id: session.agencyId } })
    const baseUrl  = appUrl()
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const sent:   string[] = []
    const failed: string[] = []
    const alreadyApproved: string[] = []

    // 1) Issue / reuse a token per configured approver (independent failures).
    const approvers: { role: ApproverType; email: string }[] = []
    if (position.techLeadEmail) approvers.push({ role: 'tech_lead', email: position.techLeadEmail })
    else console.warn('[send-approvals] No tech lead email on position')
    if (position.hrEmail) approvers.push({ role: 'hr', email: position.hrEmail })
    else console.warn('[send-approvals] No HR email on position')

    const due: { role: ApproverType; email: string; url: string }[] = []
    for (const a of approvers) {
      try {
        const t = await issueToken(position.id, a.role, a.email, expires)
        if (t.status === 'already_approved') alreadyApproved.push(a.role)
        else due.push({ ...a, url: `${baseUrl}/approve/${t.token}` })
      } catch (e) {
        console.error(`[send-approvals] ${a.role} token failed:`, e instanceof Error ? e.message : e)
        failed.push(a.role)
      }
    }

    // 2) One email per recipient — when the tech lead and HR are the same
    //    person they get ONE email carrying both review links (Fixpack 7 #3).
    const byRecipient = new Map<string, typeof due>()
    for (const d of due) {
      const k = d.email.trim().toLowerCase()
      byRecipient.set(k, [...(byRecipient.get(k) ?? []), d])
    }
    for (const group of Array.from(byRecipient.values())) {
      const roles = group.map((g) => g.role)
      try {
        if (process.env.RESEND_API_KEY) {
          const input = {
            positionTitle: position.title, company: position.company,
            agencyName: agency?.name ?? 'Your recruiter',
            links: group.map((g) => ({ role: g.role, url: g.url })),
          }
          await sendEmail({ to: group[0].email, subject: approvalEmailSubject(input), html: approvalEmailHtml(input) })
          console.log('[send-approvals] approval email sent:', roles.join('+'))
        }
        sent.push(...roles)
      } catch (e) {
        console.error(`[send-approvals] ${roles.join('+')} email failed:`, e instanceof Error ? e.message : e)
        failed.push(...roles)
      }
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
