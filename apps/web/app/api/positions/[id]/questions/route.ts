import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

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
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const body = await req.json()
    const {
      technicalQuestions = [],
      scenarioQuestions = [],
      behavioralQuestions = [],
      eqQuestions = [],
      whiteboardQuestions = [],
      timeAllocation = {},
      techLeadApproved,
      hrApproved,
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

    // Update position approval status if provided
    if (techLeadApproved !== undefined || hrApproved !== undefined) {
      const updateData: Record<string, unknown> = {}
      if (techLeadApproved !== undefined) updateData.techLeadApproved = techLeadApproved
      if (hrApproved !== undefined) updateData.hrApproved = hrApproved

      // If both approved, set status to 'active'
      const position = await prisma.position.findUnique({ where: { id: params.id } })
      if (position) {
        const newTechApproved = techLeadApproved ?? position.techLeadApproved
        const newHrApproved = hrApproved ?? position.hrApproved
        if (newTechApproved && newHrApproved) {
          updateData.status = 'active'
        }
      }

      await prisma.position.update({
        where: { id: params.id },
        data: updateData,
      })
    }

    return NextResponse.json(qs)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save questions'
    console.error('[positions/questions] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
