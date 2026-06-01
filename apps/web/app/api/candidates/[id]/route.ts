import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: params.id },
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
