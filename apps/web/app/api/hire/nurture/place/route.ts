import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/hire/audit'
import { schedulePlacement, resolveIntervals } from '@/lib/hire/nurture'

export const dynamic = 'force-dynamic'

// POST /api/hire/nurture/place — mark a candidate placed (with a date) and build
// the nurture check-in schedule. Agency-only. Body: { candidateId, placedAt?,
// company?, intervals?[] }.
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const candidateId = String(body.candidateId ?? '')
  if (!candidateId) return NextResponse.json({ error: 'candidateId is required' }, { status: 400 })

  const cand = await prisma.hireCandidate.findFirst({
    where: { id: candidateId, tenantId: ctx.tenantId },
    select: { id: true, name: true, currentCompany: true, job: { select: { client: { select: { name: true } } } } },
  })
  if (!cand) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

  const placedAt = body.placedAt ? new Date(body.placedAt) : new Date()
  if (Number.isNaN(placedAt.getTime())) return NextResponse.json({ error: 'Invalid placement date' }, { status: 400 })
  const company = (typeof body.company === 'string' && body.company.trim())
    ? body.company.trim()
    : (cand.job?.client?.name ?? cand.currentCompany ?? null)
  const intervals = Array.isArray(body.intervals) ? resolveIntervals(body.intervals) : undefined

  const result = await schedulePlacement({ tenantId: ctx.tenantId, candidateId, placedAt, company, intervals })

  await logAudit({
    tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'candidate_placed',
    targetType: 'candidate', targetId: cand.id, targetName: cand.name,
    meta: { placedAt: placedAt.toISOString(), company, intervals: result.intervals },
  }).catch(() => {})

  return NextResponse.json({ ok: true, placedAt, company, ...result })
})
