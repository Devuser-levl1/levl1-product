import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { ensureInterviewPosition, ensureInterviewsCandidate, triggerInterviewsInvite } from '@/lib/hire/interviews-bridge'
import { checkAllowance, incrementUsage } from '@/lib/hire/usage'

export const dynamic = 'force-dynamic'

export const POST = withHireAuth(async (_req, ctx, params) => {
  const candidate = await prisma.hireCandidate.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, include: { job: true } })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!candidate.job) return NextResponse.json({ error: 'Candidate must be attached to a job' }, { status: 400 })
  if (!candidate.email) return NextResponse.json({ error: 'Candidate email required' }, { status: 400 })

  const allow = await checkAllowance(ctx.tenantId, 'interview')
  if (!allow.allowed) return NextResponse.json({ error: allow.reason, message: allow.message, upgrade: true }, { status: 402 })

  const positionId = await ensureInterviewPosition(candidate.job.id, ctx.tenantId)
  const position = await prisma.position.findUnique({ where: { id: positionId }, include: { questionSet: true } })
  if (!position?.questionSet || !position.techLeadApproved || !position.hrApproved) {
    return NextResponse.json({
      error: 'question_set_not_ready',
      message: 'The interview question set for this job needs to be generated and approved first.',
      positionId, jobId: candidate.job.id,
    }, { status: 409 })
  }

  const interviewsCandidateId = await ensureInterviewsCandidate(candidate, positionId)
  const interview = await prisma.interview.create({
    data: { candidateId: interviewsCandidateId, positionId, status: 'scheduled', duration: position.interviewDuration ?? 30 },
  })

  const link = await prisma.hireInterviewLink.create({
    data: { hireCandidateId: candidate.id, interviewSessionId: interview.id, positionId, status: 'scheduled' },
  })

  await triggerInterviewsInvite(interview.id).catch((e) => console.error('[trigger-interview] invite failed:', e))
  await prisma.hireCandidateActivity.create({
    data: { candidateId: candidate.id, type: 'interview_scheduled', note: 'Levl1 AI interview triggered — invite sent to candidate', userId: ctx.userId },
  })
  await incrementUsage(ctx.tenantId, 'interview')

  return NextResponse.json({ success: true, linkId: link.id, interviewId: interview.id })
})
