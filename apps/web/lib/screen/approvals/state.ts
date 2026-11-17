import { prisma } from '@/lib/prisma'

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
export async function recomputeQuestionApproval(positionId: string) {
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
  if (activate) console.info(JSON.stringify({ evt: 'position_activated', positionId, by: 'in_app_approval' }))
  return { ...s, hrApproved: s.hrApproved_, activated: activate, status: activate ? 'active' : pos.status }
}
