import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

import { verdictToRecommendation, Verdict } from '@/lib/hire/ai-matching'
import { writeAudit, logAudit } from '@/lib/hire/audit'
import { isManagerPlus } from '@/lib/hire/roles'
import { canAccessCandidate } from '@/lib/hire/scope'

export const GET = withHireAuth(async (_req, ctx, params) => {
  const candidate = await prisma.hireCandidate.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: { job: true, activities: { orderBy: { createdAt: 'desc' }, take: 50 } },
  })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Recruiters can only open a candidate for their assigned client / direct assignment.
  if (!(await canAccessCandidate(ctx, candidate))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // The candidate's score is JOB-RELATIVE and lives in the canonical HireMatch
  // row (the same row the Candidates list + Top Matches read). The aiScore/etc.
  // columns are only a mirror and can be stale (e.g. scored by an older path),
  // so when a match row exists we OVERRIDE the mirror with it — the detail view
  // must never show a different number than the list for the same candidate+job.
  let merged: typeof candidate & { match?: unknown } = candidate
  if (candidate.jobId) {
    const match = await prisma.hireMatch.findUnique({
      where: { jobId_candidateId: { jobId: candidate.jobId, candidateId: candidate.id } },
      select: { score: true, verdict: true, reasons: true, matchedSkills: true },
    })
    if (match) {
      const reasons = Array.isArray(match.reasons) ? (match.reasons as string[]) : []
      merged = {
        ...candidate,
        aiScore: match.score,
        aiRecommendation: verdictToRecommendation(match.verdict as Verdict),
        aiSummary: candidate.aiSummary ?? (reasons.length ? reasons.join(' ') : null),
        topSkills: (Array.isArray(candidate.topSkills) && candidate.topSkills.length ? candidate.topSkills : match.matchedSkills) as typeof candidate.topSkills,
        match: { score: match.score, verdict: match.verdict, jobTitle: candidate.job?.title ?? null },
      }
    }
  }
  return NextResponse.json(merged)
})

export const PATCH = withHireAuth(async (req, ctx, params) => {
  const existing = await prisma.hireCandidate.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, include: { job: { select: { clientId: true } } } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await canAccessCandidate(ctx, existing))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  if (body.currentStage && body.currentStage !== existing.currentStage) {
    await prisma.hireCandidateActivity.create({
      data: { candidateId: existing.id, type: 'stage_change', fromStage: existing.currentStage, toStage: body.currentStage, userId: ctx.userId },
    })
  }

  // Attaching a previously-jobless candidate to a job → trigger JD scoring.
  const attachingToJob = body.jobId !== undefined && body.jobId && body.jobId !== existing.jobId

  // Reassignment — managers/admins only.
  let reassignTo: string | null | undefined
  if ('assigneeId' in body) {
    if (!isManagerPlus(ctx.role)) return NextResponse.json({ error: 'Only managers can reassign candidates.' }, { status: 403 })
    reassignTo = body.assigneeId || null
  }

  const candidate = await prisma.hireCandidate.update({
    where: { id: existing.id },
    data: {
      name: body.name ?? existing.name,
      email: body.email ? String(body.email).toLowerCase() : existing.email,
      phone: body.phone ?? existing.phone,
      currentTitle: body.currentTitle ?? existing.currentTitle,
      currentCompany: body.currentCompany ?? existing.currentCompany,
      linkedinUrl: body.linkedinUrl ?? existing.linkedinUrl,
      currentStage: body.currentStage ?? existing.currentStage,
      source: body.source ?? existing.source,
      ...(body.jobId !== undefined ? { jobId: body.jobId || null } : {}),
      ...(reassignTo !== undefined ? { assigneeId: reassignTo } : {}),
    },
  })

  if (reassignTo !== undefined && reassignTo !== existing.assigneeId) {
    await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'candidate_reassign', targetType: 'candidate', targetId: candidate.id, targetName: candidate.name, meta: { from: existing.assigneeId, to: reassignTo } })
  }

  // Score now that there's a JD to score against (deferred from a jobless import).
  if (attachingToJob && candidate.resumeText) {
    const { enqueue } = await import('@/lib/hire/jobs/queue')
    await enqueue('hire-score-candidate', { candidateId: candidate.id }).catch((e) => console.error('[hire/candidates] enqueue on attach failed:', e))
  }

  return NextResponse.json(candidate)
})

export const DELETE = withHireAuth(async (req, ctx, params) => {
  const candidate = await prisma.hireCandidate.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, include: { job: { select: { clientId: true } } } })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await canAccessCandidate(ctx, candidate))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let reason = ''
  try { const b = await req.json(); reason = typeof b?.reason === 'string' ? b.reason.trim() : '' } catch { /* no body */ }
  if (!reason) return NextResponse.json({ error: 'A deletion reason is required' }, { status: 400 })

  // Audit FIRST — the HireAuditLog row has no FK to the candidate, so it survives
  // the deletion below (this is the permanent record of who deleted whom & why).
  await writeAudit({
    tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'delete',
    candidateId: candidate.id, candidateName: candidate.name, jobId: candidate.jobId,
    fromStage: candidate.currentStage, reason,
  })

  await prisma.hireCandidateActivity.deleteMany({ where: { candidateId: candidate.id } })
  await prisma.hireInterview.deleteMany({ where: { candidateId: candidate.id } })
  await prisma.hireCandidate.delete({ where: { id: candidate.id } })

  console.log(`[hire] Candidate deleted: ${candidate.name} by user ${ctx.userId}. Reason: ${reason}`)
  return NextResponse.json({ success: true })
})
