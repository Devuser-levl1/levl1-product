import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/* POST /api/interview-token
 * Body: { interviewId: string }
 * Returns: { token: string, interviewUrl: string, expiresAt: string }
 *
 * Creates a single-use token for the candidate to access their interview room.
 * The token expires in 7 days. If a token already exists it is replaced.
 */
export async function POST(req: NextRequest) {
  try {
    const { interviewId } = await req.json()
    if (!interviewId || typeof interviewId !== 'string') {
      return NextResponse.json({ error: 'interviewId is required' }, { status: 400 })
    }

    // Verify the interview exists
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { id: true, status: true },
    })
    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Upsert — replace an existing token if present
    const tokenRecord = await prisma.interviewToken.upsert({
      where:  { interviewId },
      update: { expiresAt, usedAt: null },
      create: { interviewId, expiresAt },
    })

    const origin = req.headers.get('origin') ?? 'https://levl1.app'
    const interviewUrl = `${origin}/candidate/interview/${tokenRecord.token}`

    return NextResponse.json({
      token:        tokenRecord.token,
      interviewUrl,
      expiresAt:    tokenRecord.expiresAt.toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token generation failed'
    console.error('[interview-token] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/* GET /api/interview-token?token=<token>
 * Validates a token and returns the associated interview (without marking it used).
 * Used by the candidate pre-check page before the interview starts.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    const record = await prisma.interviewToken.findUnique({
      where: { token },
      include: {
        interview: {
          include: {
            candidate: { select: { name: true, email: true } },
            position:  { select: { title: true, company: true, interviewDuration: true } },
          },
        },
      },
    })

    if (!record) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }
    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 410 })
    }

    return NextResponse.json({
      valid:       true,
      interviewId: record.interviewId,
      alreadyUsed: record.usedAt !== null,
      expiresAt:   record.expiresAt.toISOString(),
      interview: {
        candidateName: record.interview.candidate.name,
        positionTitle: record.interview.position.title,
        company:       record.interview.position.company,
        duration:      record.interview.position.interviewDuration,
        status:        record.interview.status,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token validation failed'
    console.error('[interview-token] GET error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
