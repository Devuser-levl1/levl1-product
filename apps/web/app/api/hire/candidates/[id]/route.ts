import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

import { verdictToRecommendation, Verdict } from '@/lib/hire/ai-matching'
import { writeAudit, logAudit, resolveActorName } from '@/lib/hire/audit'
import { isManagerPlus } from '@/lib/hire/roles'
import { canAccessCandidate } from '@/lib/hire/scope'
import { dedupeKeyFor, isTerminalStage, ownerInfo } from '@/lib/hire/candidate-ownership'

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
  // Owner of THIS candidate+job, plus every OTHER job this same person is on
  // (matched by identity: email → phone → name) with the owner of each — so the
  // profile shows all jobs they're being pursued for and by whom (spec §3/§6).
  const owner = await ownerInfo(prisma, ctx.tenantId, candidate.ownerRecruiterId)
  const idOr: Prisma.HireCandidateWhereInput[] = []
  if (candidate.email) idOr.push({ email: candidate.email })
  if (candidate.phone) idOr.push({ phone: candidate.phone })
  if (!candidate.email && candidate.name) idOr.push({ name: { equals: candidate.name, mode: 'insensitive' } })
  const siblings = idOr.length
    ? await prisma.hireCandidate.findMany({
        where: { tenantId: ctx.tenantId, id: { not: candidate.id }, jobId: { not: null }, OR: idOr },
        select: { id: true, jobId: true, currentStage: true, ownerRecruiterId: true, claimedAt: true, job: { select: { title: true } } },
      })
    : []
  const sibOwnerIds = Array.from(new Set(siblings.map((s) => s.ownerRecruiterId).filter(Boolean) as string[]))
  const sibOwners = sibOwnerIds.length ? await prisma.hireUser.findMany({ where: { tenantId: ctx.tenantId, id: { in: sibOwnerIds } }, select: { id: true, name: true } }) : []
  const otherJobs = siblings.map((s) => ({
    candidateId: s.id, jobId: s.jobId, jobTitle: s.job?.title ?? null, stage: s.currentStage,
    owner: s.ownerRecruiterId ? { id: s.ownerRecruiterId, name: sibOwners.find((u) => u.id === s.ownerRecruiterId)?.name ?? null } : null,
    claimedAt: s.claimedAt,
  }))

  let merged: typeof candidate & { match?: unknown; owner?: unknown; otherJobs?: unknown } = { ...candidate, owner, otherJobs }
  if (candidate.jobId) {
    const match = await prisma.hireMatch.findUnique({
      where: { jobId_candidateId: { jobId: candidate.jobId, candidateId: candidate.id } },
      select: { score: true, verdict: true, reasons: true, matchedSkills: true },
    })
    if (match) {
      const reasons = Array.isArray(match.reasons) ? (match.reasons as string[]) : []
      merged = {
        ...candidate,
        owner, otherJobs,
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

  // Per-job ownership change. Reassigning an owner is a manager/admin action;
  // the current owner (or a manager) may release it. A terminal stage also
  // releases the claim automatically.
  const nextStage = body.currentStage ?? existing.currentStage
  const ownerPatch: Record<string, unknown> = {}
  let ownerChange: { kind: 'reassign' | 'release'; to: string | null } | null = null
  if ('ownerRecruiterId' in body) {
    const to = body.ownerRecruiterId || null
    if (to === null) {
      const mayRelease = isManagerPlus(ctx.role) || existing.ownerRecruiterId === ctx.userId
      if (!mayRelease) return NextResponse.json({ error: 'Only the current owner or a manager can release this.' }, { status: 403 })
      ownerPatch.ownerRecruiterId = null; ownerPatch.claimedAt = null; ownerPatch.claimedBy = null
      ownerChange = { kind: 'release', to: null }
    } else {
      if (!isManagerPlus(ctx.role)) return NextResponse.json({ error: 'Only managers can reassign candidate ownership.' }, { status: 403 })
      ownerPatch.ownerRecruiterId = to; ownerPatch.claimedAt = new Date(); ownerPatch.claimedBy = await resolveActorName(to)
      ownerChange = { kind: 'reassign', to }
    }
  } else if (isTerminalStage(nextStage) && !isTerminalStage(existing.currentStage) && existing.ownerRecruiterId) {
    // Auto-release on a terminal decision (no manual owner change requested).
    ownerPatch.ownerRecruiterId = null; ownerPatch.claimedAt = null; ownerPatch.claimedBy = null
    ownerChange = { kind: 'release', to: null }
  }

  // Keep the dedupe key in step if identity or job changes (preserves the
  // per-job unique constraint after an edit/move).
  const nextEmail = body.email ? String(body.email).toLowerCase() : existing.email
  const nextName = body.name ?? existing.name
  const nextPhone = body.phone ?? existing.phone
  const nextJobId = body.jobId !== undefined ? (body.jobId || null) : existing.jobId
  const identityOrJobChanged = nextEmail !== existing.email || nextName !== existing.name || nextPhone !== existing.phone || nextJobId !== existing.jobId
  const dedupePatch = identityOrJobChanged ? { dedupeKey: nextJobId ? dedupeKeyFor({ email: nextEmail, phone: nextPhone, name: nextName }) : null } : {}

  const candidate = await prisma.hireCandidate.update({
    where: { id: existing.id },
    data: {
      name: nextName,
      email: nextEmail,
      phone: nextPhone,
      currentTitle: body.currentTitle ?? existing.currentTitle,
      currentCompany: body.currentCompany ?? existing.currentCompany,
      linkedinUrl: body.linkedinUrl ?? existing.linkedinUrl,
      currentStage: nextStage,
      source: body.source ?? existing.source,
      ...(body.jobId !== undefined ? { jobId: body.jobId || null } : {}),
      ...(reassignTo !== undefined ? { assigneeId: reassignTo } : {}),
      ...ownerPatch,
      ...dedupePatch,
    },
  })

  if (reassignTo !== undefined && reassignTo !== existing.assigneeId) {
    await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'candidate_reassign', targetType: 'candidate', targetId: candidate.id, targetName: candidate.name, meta: { from: existing.assigneeId, to: reassignTo } })
  }
  if (ownerChange) {
    await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: ownerChange.kind === 'reassign' ? 'candidate_claim_reassign' : 'candidate_claim_release', targetType: 'candidate', targetId: candidate.id, targetName: candidate.name, meta: { from: existing.ownerRecruiterId, to: ownerChange.to, jobId: existing.jobId } })
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
