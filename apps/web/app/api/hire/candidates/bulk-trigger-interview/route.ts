import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { ensureInterviewPosition, ensureInterviewsCandidate, triggerInterviewsInvite } from '@/lib/hire/interviews-bridge'

export const dynamic = 'force-dynamic'

export const POST = withHireAuth(async (req, ctx) => {
  const { candidateIds } = await req.json()
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) return NextResponse.json({ error: 'candidateIds required' }, { status: 400 })

  const results = { triggered: 0, skipped: 0, needsSetup: 0, errors: [] as string[] }
  for (const id of candidateIds) {
    if (!id || typeof id !== 'string') { results.skipped++; continue }
    try {
      const candidate = await prisma.hireCandidate.findFirst({ where: { id, tenantId: ctx.tenantId }, include: { job: true } })
      if (!candidate || !candidate.job || !candidate.email) { results.skipped++; results.errors.push(`${candidate?.name ?? id}: skipped (no job/email)`); continue }

      const positionId = await ensureInterviewPosition(candidate.job.id, ctx.tenantId)
      const position = await prisma.position.findUnique({ where: { id: positionId }, include: { questionSet: true } })
      if (!position?.questionSet || !position.techLeadApproved || !position.hrApproved) { results.needsSetup++; results.errors.push(`${candidate.name}: job needs interview setup`); continue }

      const interviewsCandidateId = await ensureInterviewsCandidate(candidate, positionId)
      const interview = await prisma.interview.create({ data: { candidateId: interviewsCandidateId, positionId, status: 'scheduled', duration: position.interviewDuration ?? 30 } })
      await prisma.hireInterviewLink.create({ data: { hireCandidateId: candidate.id, interviewSessionId: interview.id, positionId, status: 'scheduled' } })
      await triggerInterviewsInvite(interview.id).catch(() => {})
      await prisma.hireCandidateActivity.create({ data: { candidateId: candidate.id, type: 'interview_scheduled', note: 'Levl1 AI interview triggered (bulk)', userId: ctx.userId } })
      results.triggered++
    } catch (e: unknown) {
      results.errors.push(`${id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return NextResponse.json(results)
})
