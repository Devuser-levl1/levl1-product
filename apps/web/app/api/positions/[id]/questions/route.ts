import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { recomputeQuestionApproval } from '@/lib/screen/approvals/state'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const qs = await prisma.questionSet.findUnique({
      where: { positionId: params.id },
    })
    if (!qs) return NextResponse.json({ error: 'No question set found' }, { status: 404 })
    return NextResponse.json(qs)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = recruiterAccess(req, { edit: true })
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const owned = await prisma.position.findFirst({ where: { id: params.id, agencyId: access.session.agencyId }, select: { id: true } })
    if (!owned) return NextResponse.json({ error: 'Position not found' }, { status: 404 })

    const body = await req.json()
    const {
      technicalQuestions = [],
      scenarioQuestions = [],
      behavioralQuestions = [],
      eqQuestions = [],
      whiteboardQuestions = [],
      timeAllocation = {},
    } = body

    // Upsert the question set
    const qs = await prisma.questionSet.upsert({
      where: { positionId: params.id },
      update: {
        technicalQuestions,
        scenarioQuestions,
        behavioralQuestions,
        eqQuestions,
        whiteboardQuestions,
        timeAllocation,
      },
      create: {
        positionId: params.id,
        technicalQuestions,
        scenarioQuestions,
        behavioralQuestions,
        eqQuestions,
        whiteboardQuestions,
        timeAllocation,
      },
    })

    // Approval is DERIVED from the per-question flags (single source of truth,
    // Fixpack 9 #5) — client-sent techLeadApproved / hrApproved are ignored.
    await recomputeQuestionApproval(params.id, { by: access.session.email })

    return NextResponse.json(qs)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save questions'
    console.error('[positions/questions] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
