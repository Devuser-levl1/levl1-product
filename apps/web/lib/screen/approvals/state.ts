import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'
import { appUrl } from '@/lib/screen/app-url'
import { screenEmailLogoHtml } from '@/lib/screen/brand/email-logo'

// ── Question approval: ONE source of truth (Screen-scoped, server-only) ────
// Fixpack 9 #5. Approval used to live in three places that drifted apart: the
// in-app per-question flags, a separate email-token approval (which overwrote
// whole question sections and set Position.techLeadApproved / hrApproved), and
// the setup wizard. Now:
//   • TRUTH = the per-question flags on the QuestionSet (approvedByTech for the
//     technical sections, approvedByHR for the behavioural ones), changed only
//     in the app.
//   • Position.techLeadApproved / hrApproved (what preflight and the interview
//     room read) are DERIVED here after every change — never set independently.
//   • Emails only notify, with a deep link to the in-app review.

export const TECH_SECTIONS = ['technicalQuestions', 'scenarioQuestions', 'whiteboardQuestions'] as const
export const HR_SECTIONS = ['behavioralQuestions', 'eqQuestions'] as const
export type QuestionSection = (typeof TECH_SECTIONS)[number] | (typeof HR_SECTIONS)[number]

/** Which approver owns a section. */
export const approverFor = (section: QuestionSection): 'tech' | 'hr' => ((HR_SECTIONS as readonly string[]).includes(section) ? 'hr' : 'tech')
export const approveFieldFor = (section: QuestionSection) => (approverFor(section) === 'hr' ? 'approvedByHR' : 'approvedByTech')

type Q = { id?: string; approvedByTech?: boolean; approvedByHR?: boolean }
const list = (v: unknown): Q[] => (Array.isArray(v) ? (v as Q[]) : [])

export interface ApprovalSummary {
  techTotal: number; techApproved: number; hrTotal: number; hrApproved: number
  techLeadApproved: boolean; hrApproved_: boolean
}

export function summarize(qs: Record<QuestionSection, unknown> | null): ApprovalSummary {
  const tech = qs ? TECH_SECTIONS.flatMap((s) => list(qs[s])) : []
  const hr = qs ? HR_SECTIONS.flatMap((s) => list(qs[s])) : []
  const techApproved = tech.filter((q) => q.approvedByTech).length
  const hrApproved = hr.filter((q) => q.approvedByHR).length
  return {
    techTotal: tech.length, techApproved, hrTotal: hr.length, hrApproved,
    // A side with no questions has nothing to approve; a set with no questions at all is not approved.
    techLeadApproved: !!qs && tech.length + hr.length > 0 && techApproved === tech.length,
    hrApproved_: !!qs && tech.length + hr.length > 0 && hrApproved === hr.length,
  }
}

/**
 * Re-derive Position.techLeadApproved / hrApproved from the question flags and
 * activate a pending position once both sides are approved. Never demotes an
 * active position (interviews may already be scheduled).
 */
export async function recomputeQuestionApproval(positionId: string, opts: { by?: string } = {}) {
  const [qs, pos] = await Promise.all([
    prisma.questionSet.findUnique({ where: { positionId } }),
    prisma.position.findUnique({ where: { id: positionId }, select: { status: true, techLeadApproved: true, hrApproved: true } }),
  ])
  if (!pos) return null
  const s = summarize(qs as unknown as Record<QuestionSection, unknown> | null)
  const activate = s.techLeadApproved && s.hrApproved_ && pos.status === 'pending_approval'
  if (pos.techLeadApproved !== s.techLeadApproved || pos.hrApproved !== s.hrApproved_ || activate) {
    await prisma.position.update({
      where: { id: positionId },
      data: { techLeadApproved: s.techLeadApproved, hrApproved: s.hrApproved_, ...(activate ? { status: 'active' } : {}) },
    })
  }
  if (activate) {
    console.info(JSON.stringify({ evt: 'position_activated', positionId, by: 'in_app_approval' }))
    // Fire-and-forget: a notification failure must never undo or block approval.
    void notifyActivated(positionId, opts.by ?? null).catch((e) => console.error('[approvals] activation notice failed:', e instanceof Error ? e.message : e))
  }
  return { ...s, hrApproved: s.hrApproved_, activated: activate, status: activate ? 'active' : pos.status }
}

/* ── "All approved" notification ─────────────────────────────────────────── */

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export function activatedEmailHtml(o: { positionTitle: string; company: string; approvedBy: string | null; url: string }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;border:1px solid #E4E4E7;overflow:hidden">
  <div style="background:#4F46E5;padding:24px 28px">${screenEmailLogoHtml({ onDark: true, height: 34 })}</div>
  <div style="padding:28px">
    <h2 style="margin:0 0 12px;font-size:19px;font-weight:600;color:#18181B">${esc(o.positionTitle)} is ready for interviews</h2>
    <p style="color:#52525B;font-size:14px;line-height:1.6;margin:0 0 20px">All interview questions for <strong>${esc(o.positionTitle)}</strong> at <strong>${esc(o.company)}</strong> have been approved by both the Tech lead and HR${o.approvedBy ? ` (final approval by ${esc(o.approvedBy)})` : ''}. The position is now active — you can invite candidates.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#4F46E5;border-radius:8px"><a href="${esc(o.url)}" target="_blank" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none">Open the position &rarr;</a></td></tr></table>
    <p style="margin:12px 0 0;font-size:12px;color:#71717A">Or open this link: <a href="${esc(o.url)}" style="color:#4F46E5;word-break:break-all">${esc(o.url)}</a></p>
  </div>
</div></body></html>`
}

/** In-app notification + email to the workspace admins (and the legacy sender address, if set). */
async function notifyActivated(positionId: string, approvedBy: string | null) {
  const p = await prisma.position.findUnique({
    where: { id: positionId },
    select: { id: true, title: true, company: true, agencyId: true, agency: { select: { senderEmail: true } } },
  })
  if (!p?.agencyId) return
  const link = `/positions/${p.id}`
  await prisma.notification.create({
    data: { agencyId: p.agencyId, type: 'position_activated', title: 'Position activated', body: `${p.title} is now live — all interview questions approved.`, link },
  }).catch(() => {})

  if (!process.env.RESEND_API_KEY) return
  const admins = await prisma.user.findMany({ where: { agencyId: p.agencyId, role: 'admin', disabledAt: null }, select: { email: true } })
  const to = Array.from(new Set([...admins.map((a) => a.email), ...(p.agency?.senderEmail ? [p.agency.senderEmail] : [])].map((e) => e.trim().toLowerCase()).filter(Boolean)))
  if (!to.length) return
  await sendEmail({
    to,
    subject: `${p.title} is approved and ready for interviews`,
    html: activatedEmailHtml({ positionTitle: p.title, company: p.company, approvedBy, url: `${appUrl()}${link}` }),
  })
  console.info(JSON.stringify({ evt: 'position_activated_notified', positionId, recipients: to.length }))
}
