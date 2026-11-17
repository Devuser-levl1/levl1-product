import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { HR_SECTIONS, TECH_SECTIONS, approveFieldFor, recomputeQuestionApproval, type QuestionSection } from '@/lib/screen/approvals/state'

export const dynamic = 'force-dynamic'

// In-app question approval — the SINGLE source of truth (Fixpack 9 #5).
// POST { questionId?, questionType, action }
//   action: approve | unapprove | approve_section | remove | edit (+ updatedText)
// The approver (Tech lead vs HR) is derived from the SECTION, never from the
// client. After every change Position.techLeadApproved / hrApproved are
// re-derived (and a pending position activates once both sides are approved).

const SECTION_MAP: Record<string, QuestionSection> = {
  technical: 'technicalQuestions', scenario: 'scenarioQuestions', whiteboard: 'whiteboardQuestions',
  behavioral: 'behavioralQuestions', eq: 'eqQuestions',
}
const ALL: QuestionSection[] = [...TECH_SECTIONS, ...HR_SECTIONS]

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = recruiterAccess(req, { edit: true })
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const owned = await prisma.position.findFirst({ where: { id: params.id, agencyId: access.session.agencyId }, select: { id: true } })
    if (!owned) return NextResponse.json({ error: 'Position not found' }, { status: 404 })

    const { questionId, questionType, action, updatedText } = await req.json().catch(() => ({})) as Record<string, string | undefined>
    if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 })

    const questionSet = await prisma.questionSet.findUnique({ where: { positionId: params.id } })
    if (!questionSet) return NextResponse.json({ error: 'Question set not found' }, { status: 404 })

    const section: QuestionSection | undefined = (questionType && SECTION_MAP[questionType]) ||
      ALL.find((col) => { const arr = questionSet[col] as Array<{ id: string }>; return Array.isArray(arr) && arr.some((q) => q.id === questionId) })
    if (!section) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const field = approveFieldFor(section)
    const questions = (Array.isArray(questionSet[section]) ? questionSet[section] : []) as Array<Record<string, unknown>>
    let updated: Array<Record<string, unknown>>
    if (action === 'approve_section') updated = questions.map((q) => ({ ...q, [field]: true }))
    else {
      if (!questionId) return NextResponse.json({ error: 'questionId required' }, { status: 400 })
      if (!questions.some((q) => q.id === questionId)) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
      if (action === 'approve' || action === 'unapprove') updated = questions.map((q) => (q.id === questionId ? { ...q, [field]: action === 'approve' } : q))
      else if (action === 'remove') updated = questions.filter((q) => q.id !== questionId)
      else if (action === 'edit') {
        const text = typeof updatedText === 'string' ? updatedText.trim().slice(0, 2000) : ''
        if (!text) return NextResponse.json({ error: 'updatedText required for edit' }, { status: 400 })
        // Editing an approved question re-opens it for review.
        updated = questions.map((q) => (q.id === questionId ? { ...q, question: text, [field]: false } : q))
      } else return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    await prisma.questionSet.update({ where: { positionId: params.id }, data: { [section]: updated } })
    const approval = await recomputeQuestionApproval(params.id)
    return NextResponse.json({ success: true, section, approverType: field === 'approvedByHR' ? 'hr' : 'tech', affected: questionId ?? null, action, questions: updated, approval })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update question'
    console.error('[questions/approve] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
