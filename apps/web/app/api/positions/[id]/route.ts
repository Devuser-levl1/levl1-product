import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const position = await prisma.position.findUnique({
      where: { id: params.id },
      include: {
        questionSet: true,
        candidates: true,
        positionReport: true,
        interviews: true,
      },
    })
    if (!position) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(position)
  } catch (err) {
    console.error('GET /api/positions/[id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch position' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const body = await req.json()

    // Whitelist updatable fields to prevent mass-assignment
    const ALLOWED = new Set([
      'status', 'title', 'department', 'workMode', 'interviewDuration',
      'techLeadEmail', 'hrEmail', 'clientManagerEmail',
      'techLeadApproved', 'hrApproved', 'jdApprovedAt', 'jdApprovedBy',
      'l2ScoreThreshold', 'scoringRubric', 'rubricApproved',
      'dynamicIntensity', 'voiceAccent', 'wonCandidateId', 'wonNotes',
      'lostReason', 'lostNotes', 'closedAt',
    ])
    const safe: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED.has(k)) safe[k] = v
    }

    const position = await prisma.position.update({
      where: { id: params.id },
      data:  safe,
    })
    return NextResponse.json(position)
  } catch (err) {
    console.error('PATCH /api/positions/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
  }
}
