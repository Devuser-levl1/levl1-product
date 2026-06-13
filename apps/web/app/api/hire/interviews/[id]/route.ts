import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { sendHireInterviewEmails, scheduleInterviewReminders } from '@/lib/hire/email'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']

export const PATCH = withHireAuth(async (req, ctx, params) => {
  const existing = await prisma.hireInterview.findFirst({
    where: { id: params.id, candidate: { tenantId: ctx.tenantId } },
    include: { candidate: { include: { job: { select: { title: true } } } } },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: Prisma.HireInterviewUpdateInput = {}
  let rescheduled = false

  if (body.scheduledAt) {
    const newAt = new Date(body.scheduledAt)
    if (newAt.getTime() !== new Date(existing.scheduledAt).getTime()) {
      data.scheduledAt = newAt
      data.remindersSent = Prisma.JsonNull
      rescheduled = true
    }
  }
  if (typeof body.durationMins === 'number') data.durationMins = body.durationMins
  if (typeof body.type === 'string') data.type = body.type
  if (Array.isArray(body.interviewers)) data.interviewers = body.interviewers
  if ('meetLink' in body) data.meetLink = body.meetLink || null
  if ('notes' in body) data.notes = body.notes || null

  if (body.scorecard) {
    data.scorecard = { ...body.scorecard, submittedBy: ctx.userId, submittedAt: new Date().toISOString() }
  }

  let statusChanged: string | null = null
  if (typeof body.status === 'string' && STATUSES.includes(body.status) && body.status !== existing.status) {
    data.status = body.status as Prisma.HireInterviewUpdateInput['status']
    statusChanged = body.status
  }

  const interview = await prisma.hireInterview.update({ where: { id: existing.id }, data })

  // Activity logs
  if (statusChanged) {
    const labels: Record<string, string> = { COMPLETED: 'completed', CANCELLED: 'cancelled', NO_SHOW: 'marked no-show', SCHEDULED: 'rescheduled' }
    await prisma.hireCandidateActivity.create({
      data: { candidateId: existing.candidateId, type: 'note', note: `${existing.type} interview ${labels[statusChanged] ?? statusChanged.toLowerCase()}`, userId: ctx.userId },
    })
  }
  if (body.scorecard) {
    const o = body.scorecard.overall ?? '—'
    await prisma.hireCandidateActivity.create({
      data: { candidateId: existing.candidateId, type: 'note', note: `Scorecard submitted (${existing.type}): ${o}`, userId: ctx.userId },
    })
  }

  if (rescheduled) {
    await prisma.hireCandidateActivity.create({
      data: { candidateId: existing.candidateId, type: 'note', note: `Interview rescheduled to ${new Date(body.scheduledAt).toLocaleString('en-IN')}`, userId: ctx.userId },
    })
    sendHireInterviewEmails(interview, existing.candidate, ctx).catch((e) => console.error('[hire/interviews] reschedule email failed:', e))
    scheduleInterviewReminders(interview.id, interview.scheduledAt).catch((e) => console.error('[hire/interviews] reschedule reminders failed:', e))
  }

  return NextResponse.json(interview)
})

export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const existing = await prisma.hireInterview.findFirst({ where: { id: params.id, candidate: { tenantId: ctx.tenantId } } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.hireCandidateActivity.create({
    data: { candidateId: existing.candidateId, type: 'note', note: `Interview cancelled by ${ctx.userId}`, userId: ctx.userId },
  })
  await prisma.hireInterview.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
})
