import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Recruiter list of the agency's interviews (dashboard + Start Interview).
// Session-required and agency-scoped; demo-gallery runs excluded; returns only
// the list fields — never transcript / responses / code (those are captured
// data, served decrypted by the per-interview + playback routes).
const LIST_SELECT = {
  id: true, candidateId: true, positionId: true, status: true, isDemo: true,
  scheduledAt: true, startedAt: true, completedAt: true, createdAt: true,
  duration: true, agentOnline: true, candidateJoined: true, runningScore: true,
  candidate: { select: { id: true, name: true, email: true } },
  position: { select: { id: true, title: true, company: true } },
} as const

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const candidateId = new URL(req.url).searchParams.get('candidateId')

    const interviews = await prisma.interview.findMany({
      where: {
        position: { agencyId: session.agencyId },
        isDemo: false,
        ...(candidateId ? { candidateId } : {}),
      },
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(interviews)
  } catch (err) {
    console.error('GET /api/interviews error:', err)
    return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const body = await req.json()
    // Only pass known fields to avoid Prisma unknown field errors
    const { candidateId, positionId, status, duration, scheduledAt, startedAt, completedAt } = body
    // The candidate AND position must belong to the caller's agency.
    const owned = await prisma.candidate.findFirst({
      where: { id: String(candidateId ?? ''), positionId: String(positionId ?? ''), position: { agencyId: session.agencyId } },
      select: { id: true },
    })
    if (!owned) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    const interview = await prisma.interview.create({
      data: {
        candidateId,
        positionId,
        status: status ?? 'scheduled',
        duration: duration ?? 30,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        startedAt: startedAt ? new Date(startedAt) : undefined,
        completedAt: completedAt ? new Date(completedAt) : undefined,
      },
    })
    return NextResponse.json(interview, { status: 201 })
  } catch (err) {
    console.error('POST /api/interviews error:', err)
    return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 })
  }
}
