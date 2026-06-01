import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const candidateId = url.searchParams.get('candidateId')

    const where = candidateId ? { candidateId } : {}
    const interviews = await prisma.interview.findMany({
      where,
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        position: { select: { id: true, title: true, company: true } },
      },
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
    const body = await req.json()
    // Only pass known fields to avoid Prisma unknown field errors
    const { candidateId, positionId, status, duration, scheduledAt, startedAt, completedAt } = body
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
