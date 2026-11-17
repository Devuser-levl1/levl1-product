import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { sendEmail } from '@/lib/emailService'
import { appUrl } from '@/lib/screen/app-url'
import { approvalEmailHtml, approvalEmailSubject } from '@/lib/screen/approvals/approval-email'

export const dynamic = 'force-dynamic'

type ApproverType = 'tech_lead' | 'hr'

// Fixpack 9 #5 — the email is a NOTIFICATION + DEEP LINK only. Approval
// happens in the app (position → Questions), which is the single source of
// truth; there is no approve-by-email path any more, so no tokens are minted.
// "Already approved" is read from the derived Position flags.

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
    const reviewUrl = (role: ApproverType) => `${baseUrl}/positions/${position.id}?tab=questions&review=${role}`

    const sent:   string[] = []
    const failed: string[] = []
    const alreadyApproved: string[] = []

    // 1) Who still needs to review (approval state is derived in-app).
    const approvers: { role: ApproverType; email: string }[] = []
    if (position.techLeadEmail) approvers.push({ role: 'tech_lead', email: position.techLeadEmail })
    else console.warn('[send-approvals] No tech lead email on position')
    if (position.hrEmail) approvers.push({ role: 'hr', email: position.hrEmail })
    else console.warn('[send-approvals] No HR email on position')

    const due: { role: ApproverType; email: string; url: string }[] = []
    for (const a of approvers) {
      const done = a.role === 'tech_lead' ? position.techLeadApproved : position.hrApproved
      if (done) alreadyApproved.push(a.role)
      else due.push({ ...a, url: reviewUrl(a.role) })
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
