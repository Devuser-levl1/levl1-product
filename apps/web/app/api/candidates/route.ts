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

// Derive a usable, non-empty name. A null/empty parsed name (image-only resume,
// failed extraction) must NOT be inserted as a broken row that later breaks
// scoring/hydration — fall back to the email local-part, then a review flag.
function deriveName(raw: Record<string, unknown>): string {
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (name) return name
  const email = typeof raw.email === 'string' ? raw.email.trim() : ''
  if (email.includes('@')) {
    const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
    if (local) return local.replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return 'Unnamed candidate (needs review)'
}

// Only these fields are accepted — prevents unknown-field Prisma errors
function sanitise(raw: Record<string, unknown>) {
  return {
    name:             deriveName(raw),
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

    const rows = (Array.isArray(body) ? body : [body as Record<string, unknown>]).map(sanitise)

    // A candidate must reference a REAL, persisted position. Validate every
    // positionId up front so we never hand Prisma an id that FK-violates and
    // 500s. Empty/missing → clean 400; unknown id → clean 404. (Root-cause fix:
    // the position-create returned no usable id, so positionId was bad here.)
    const wantedIds = Array.from(new Set(rows.map((r) => r.positionId).filter(Boolean)))
    if (rows.some((r) => !r.positionId)) {
      return NextResponse.json({ error: 'Each candidate needs a positionId. Resolve/create the position first.' }, { status: 400 })
    }
    const found = await prisma.position.findMany({ where: { id: { in: wantedIds } }, select: { id: true } })
    const validIds = new Set(found.map((p) => p.id))
    const missing = wantedIds.filter((id) => !validIds.has(id))
    if (missing.length > 0) {
      return NextResponse.json({ error: `Position not found for id(s): ${missing.join(', ')}. The position must exist before adding candidates.` }, { status: 404 })
    }

    // Position(s) confirmed valid → create. Transactional so a partial failure
    // rolls back and can never leave a candidate orphaned mid-batch.
    const created = await prisma.$transaction(rows.map((data) => prisma.candidate.create({ data })))
    const isBatch = Array.isArray(body)
    console.log('[POST /api/candidates] created %d candidate(s)', created.length)
    return NextResponse.json(isBatch ? created : created[0], { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/candidates] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
