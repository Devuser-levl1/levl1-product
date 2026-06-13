import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { sendHireInterviewEmails, scheduleInterviewReminders } from '@/lib/hire/email'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (req, ctx) => {
  const sp = new URL(req.url).searchParams
  const status = sp.get('status')
  const from = sp.get('from')
  const to = sp.get('to')
  const candidateId = sp.get('candidateId')

  const where: Prisma.HireInterviewWhereInput = { candidate: { tenantId: ctx.tenantId } }
  if (status) where.status = status as Prisma.HireInterviewWhereInput['status']
  if (candidateId) where.candidateId = candidateId
  if (from || to) where.scheduledAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) }

  const interviews = await prisma.hireInterview.findMany({
    where,
    include: { candidate: { select: { id: true, name: true, email: true, currentStage: true, job: { select: { id: true, title: true } } } } },
    orderBy: { scheduledAt: 'asc' },
  })
  return NextResponse.json(interviews)
})

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json()
  const candidate = await prisma.hireCandidate.findFirst({
    where: { id: body.candidateId, tenantId: ctx.tenantId },
    include: { job: { select: { title: true } } },
  })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!body.scheduledAt) return NextResponse.json({ error: 'scheduledAt required' }, { status: 400 })

  const interview = await prisma.hireInterview.create({
    data: {
      candidateId: candidate.id,
      scheduledAt: new Date(body.scheduledAt),
      durationMins: body.durationMins || 45,
      type: body.type || 'Technical',
      interviewers: Array.isArray(body.interviewers) ? body.interviewers : [],
      meetLink: body.meetLink || null,
      notes: body.notes || null,
      status: 'SCHEDULED',
    },
  })

  await prisma.hireCandidateActivity.create({
    data: { candidateId: candidate.id, type: 'interview_scheduled', note: `${interview.type} interview scheduled for ${new Date(body.scheduledAt).toLocaleString('en-IN')}`, userId: ctx.userId },
  })

  sendHireInterviewEmails(interview, candidate, ctx).catch((e) => console.error('[hire/interviews] email failed:', e))
  scheduleInterviewReminders(interview.id, interview.scheduledAt).catch((e) => console.error('[hire/interviews] reminders failed:', e))

  return NextResponse.json(interview, { status: 201 })
})
