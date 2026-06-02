import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req as never)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const candidates = await prisma.candidate.findMany({
      where: {
        position: { agencyId: session.agencyId },
      },
      include: {
        position: { select: { id: true, title: true, company: true } },
        interview: { select: { id: true, status: true } },
        report: { select: { id: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    })
    return NextResponse.json(candidates)
  } catch (err) {
    console.error('GET /api/candidates error:', err)
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
  }
}

// Only these fields are accepted — prevents unknown-field Prisma errors
function sanitise(raw: Record<string, unknown>) {
  return {
    name:             String(raw.name ?? ''),
    email:            String(raw.email ?? ''),
    positionId:       String(raw.positionId ?? ''),
    ...(raw.phone            != null && { phone:            String(raw.phone)            }),
    ...(raw.linkedIn         != null && { linkedIn:         String(raw.linkedIn)         }),
    ...(raw.currentTitle     != null && { currentTitle:     String(raw.currentTitle)     }),
    ...(raw.currentCompany   != null && { currentCompany:   String(raw.currentCompany)   }),
    ...(raw.totalYears       != null && { totalYears:       Number(raw.totalYears)       }),
    ...(raw.educationSummary != null && { educationSummary: String(raw.educationSummary) }),
    ...(raw.resumeText       != null && { resumeText:       String(raw.resumeText)       }),
    topSkills: Array.isArray(raw.topSkills) ? (raw.topSkills as string[]) : [],
    status: 'pending' as const,
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req as never)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const body = await req.json()
    console.log('[POST /api/candidates] agencyId:', session.agencyId, 'body keys:', Object.keys(Array.isArray(body) ? body[0] ?? {} : body))

    if (Array.isArray(body)) {
      const rows = body.map(sanitise)
      console.log('[POST /api/candidates] batch size:', rows.length, 'positionIds:', rows.map(r => r.positionId))
      const created = await prisma.$transaction(
        rows.map((data) => prisma.candidate.create({ data })),
      )
      return NextResponse.json(created, { status: 201 })
    }

    const data = sanitise(body as Record<string, unknown>)
    console.log('[POST /api/candidates] single, positionId:', data.positionId)
    const candidate = await prisma.candidate.create({ data })
    return NextResponse.json(candidate, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/candidates] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
