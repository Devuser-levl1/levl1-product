import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    const positions = await prisma.position.findMany({
      where: session?.agencyId ? { agencyId: session.agencyId } : undefined,
      include: {
        questionSet: true,
        candidates: { select: { id: true, status: true, score: true } },
        _count: { select: { interviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(positions)
  } catch (err) {
    console.error('GET /api/positions error:', err)
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body     = await req.json()
    const session  = getSessionFromRequest(req)
    const agencyId = session?.agencyId ?? body.agencyId

    // Duplicate detection — same title + company for this agency, not closed/lost/won
    if (agencyId && body.title && body.company) {
      const existing = await prisma.position.findFirst({
        where: {
          agencyId,
          title:   { equals: body.title,   mode: 'insensitive' },
          company: { equals: body.company, mode: 'insensitive' },
          status:  { notIn: ['closed', 'lost', 'won'] },
        },
      })
      if (existing) {
        // Find-or-create: REUSE the existing position (200) instead of 409. The
        // caller's intent is "ensure this position exists so I can attach a
        // candidate" — blindly 409-ing left it with no valid positionId, which
        // is exactly what caused the downstream Candidate FK violation.
        // Opt-in 409 only when a UI explicitly wants the duplicate warning.
        if (body.failOnDuplicate === true) {
          return NextResponse.json(
            { error: 'duplicate', message: `A position for "${body.title}" at "${body.company}" already exists.`, existingId: existing.id, position: existing },
            { status: 409 },
          )
        }
        return NextResponse.json({ ...existing, _deduped: true }, { status: 200 })
      }
    }

    // Whitelist scalar columns so a stray field in the request body can't
    // crash the create with an unknown-argument Prisma error.
    const ALLOWED = new Set([
      'title', 'company', 'department', 'roleType', 'experienceLevel',
      'primaryDomain', 'techStack', 'goodToHave', 'domainContext', 'companyStage',
      'workMode', 'interviewDuration', 'status', 'jdText', 'jdSource',
      'jdApprovedBy', 'jdApprovedAt', 'techLeadApproved', 'hrApproved',
      'techLeadEmail', 'hrEmail', 'clientManagerEmail', 'l2ScoreThreshold',
      'rubricApproved', 'scoringRubric', 'dynamicIntensity', 'voiceAccent',
      'softSkillWeightage', 'clientId',
    ])
    const data: Record<string, unknown> = { agencyId: agencyId ?? body.agencyId }
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED.has(k)) data[k] = v
    }

    const position = await prisma.position.create({ data: data as never })
    return NextResponse.json(position, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[positions] Failed:', message)
    console.error('[positions] Full error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
