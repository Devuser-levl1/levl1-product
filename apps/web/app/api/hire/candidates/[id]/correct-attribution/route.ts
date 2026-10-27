import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAttribution } from '@/lib/hire/candidate-ownership'
import { logAudit } from '@/lib/hire/audit'

export const dynamic = 'force-dynamic'

// POST /api/hire/candidates/[id]/correct-attribution — the ONLY path allowed to
// change the immutable sourcedBy (and optionally the owner) of a candidate.
// Admin-only, requires a reason, and writes an 'owner_override' attribution
// event (who/when/why). Normal edits never touch these fields.
export const POST = withHireAuth(async (req, ctx, params) => {
  if (!ctx.caps.includes('settingsAdmin')) return NextResponse.json({ error: 'Only an admin can correct attribution.' }, { status: 403 })

  const candidate = await prisma.hireCandidate.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, select: { id: true, name: true, jobId: true, sourcedByUserId: true, ownerRecruiterId: true } })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const reason = String(body.reason ?? '').trim()
  if (!reason) return NextResponse.json({ error: 'A reason is required to correct attribution.' }, { status: 400 })

  const data: Record<string, unknown> = {}
  // Validate any target user belongs to the tenant.
  async function validMember(id: string): Promise<boolean> {
    return !!(await prisma.hireUser.findFirst({ where: { id, tenantId: ctx.tenantId }, select: { id: true } }))
  }
  if (typeof body.sourcedByUserId === 'string' && body.sourcedByUserId && await validMember(body.sourcedByUserId)) {
    data.sourcedByUserId = body.sourcedByUserId
  }
  if ('ownerUserId' in body) {
    const to = body.ownerUserId || null
    if (to === null) { data.ownerRecruiterId = null; data.claimedAt = null; data.claimedBy = null }
    else if (await validMember(to)) { data.ownerRecruiterId = to; data.claimedAt = new Date() }
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to correct.' }, { status: 400 })

  await prisma.hireCandidate.update({ where: { id: candidate.id }, data })
  await logAttribution(prisma, {
    tenantId: ctx.tenantId, candidateId: candidate.id, jobId: candidate.jobId, eventType: 'owner_override',
    actorUserId: ctx.userId, fromUserId: (data.ownerRecruiterId !== undefined ? candidate.ownerRecruiterId : null),
    note: `Attribution corrected by admin: ${reason}`,
  })
  await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'candidate_claim_override', targetType: 'candidate', targetId: candidate.id, targetName: candidate.name, reason, meta: { corrected: Object.keys(data) } })

  return NextResponse.json({ ok: true, corrected: Object.keys(data) })
})
