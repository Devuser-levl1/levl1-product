import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Recruiter-only, agency-scoped: the payload includes the position (with its
// recruiter-only comp band) and the report.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const candidate = await prisma.candidate.findFirst({
      where: { id: params.id, position: { agencyId: session.agencyId } },
      include: {
        position: true,
        interview: true,
        report: true,
      },
    })
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(candidate)
  } catch (err) {
    console.error('GET /api/candidates/[id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch candidate' }, { status: 500 })
  }
}

/* Allowlist of fields that callers are permitted to update on a Candidate */
const ALLOWED_CANDIDATE_FIELDS = new Set([
  'status', 'score', 'recommendation',
  'invitedAt', 'scheduledAt', 'interviewedAt',
  'schedulingLink', 'remindersSent',
])

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const owned = await prisma.candidate.findFirst({ where: { id: params.id, position: { agencyId: session.agencyId } }, select: { id: true } })
    if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()

    // Strip any keys not in the allowlist — prevents overwriting positionId,
    // email, resumeText, relations, or any other protected fields.
    const safeData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_CANDIDATE_FIELDS.has(key)) safeData[key] = value
    }
    if (Object.keys(safeData).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const candidate = await prisma.candidate.update({
      where: { id: params.id },
      data:  safeData,
    })
    return NextResponse.json(candidate)
  } catch (err) {
    console.error('PATCH /api/candidates/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 })
  }
}
