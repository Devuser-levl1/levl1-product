import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type QuestionSection = 'technicalQuestions' | 'scenarioQuestions' | 'behavioralQuestions' | 'eqQuestions' | 'whiteboardQuestions'

const SECTION_MAP: Record<string, QuestionSection> = {
  technical:   'technicalQuestions',
  scenario:    'scenarioQuestions',
  behavioral:  'behavioralQuestions',
  eq:          'eqQuestions',
  whiteboard:  'whiteboardQuestions',
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { questionId, questionType, action, updatedText, approverType } = await req.json()
    // action: 'approve' | 'remove' | 'edit'
    // approverType: 'tech' | 'hr' | undefined (undefined = recruiter)

    if (!questionId || !action) {
      return NextResponse.json({ error: 'questionId and action required' }, { status: 400 })
    }

    const questionSet = await prisma.questionSet.findUnique({ where: { positionId: params.id } })
    if (!questionSet) return NextResponse.json({ error: 'Question set not found' }, { status: 404 })

    // Find which section this question lives in
    const section = SECTION_MAP[questionType] ??
      Object.entries(SECTION_MAP).map(([, col]) => col).find(col => {
        const arr = questionSet[col] as Array<{ id: string }>
        return Array.isArray(arr) && arr.some(q => q.id === questionId)
      })

    if (!section) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const questions = questionSet[section] as Array<Record<string, unknown>>

    let updated: Array<Record<string, unknown>>

    if (action === 'approve') {
      const approveField = approverType === 'hr' ? 'approvedByHR' : 'approvedByTech'
      updated = questions.map(q =>
        q.id === questionId ? { ...q, [approveField]: true } : q
      )
    } else if (action === 'unapprove') {
      const approveField = approverType === 'hr' ? 'approvedByHR' : 'approvedByTech'
      updated = questions.map(q =>
        q.id === questionId ? { ...q, [approveField]: false } : q
      )
    } else if (action === 'remove') {
      updated = questions.filter(q => q.id !== questionId)
    } else if (action === 'edit') {
      if (!updatedText) return NextResponse.json({ error: 'updatedText required for edit' }, { status: 400 })
      updated = questions.map(q =>
        q.id === questionId ? { ...q, question: updatedText } : q
      )
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    await prisma.questionSet.update({
      where: { positionId: params.id },
      data:  { [section]: updated },
    })

    return NextResponse.json({ success: true, section, affected: questionId, action })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update question'
    console.error('[questions/approve] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
