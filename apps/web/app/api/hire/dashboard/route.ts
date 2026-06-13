import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx) => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [deals, recentContacts, recentDeals, recentCandidates, upcomingInterviews] = await Promise.all([
    prisma.hireDeal.findMany({ where: { tenantId: ctx.tenantId }, select: { value: true, stage: true, closedAt: true } }),
    prisma.hireContactActivity.findMany({
      where: { contact: { client: { tenantId: ctx.tenantId } } },
      include: { contact: { select: { name: true, client: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 5,
    }),
    prisma.hireDeal.findMany({ where: { tenantId: ctx.tenantId }, include: { client: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.hireCandidate.findMany({ where: { tenantId: ctx.tenantId }, include: { job: { select: { title: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.hireInterview.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { gte: now }, candidate: { tenantId: ctx.tenantId } },
      include: { candidate: { select: { name: true, job: { select: { title: true } } } } },
      orderBy: { scheduledAt: 'asc' }, take: 5,
    }),
  ])

  const open = deals.filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost')
  const byStage: Record<string, number> = {}
  for (const d of open) byStage[d.stage] = (byStage[d.stage] || 0) + 1
  const openTotal = open.reduce((s, d) => s + d.value, 0)
  const wonMtd = deals.filter((d) => d.stage === 'Closed Won' && d.closedAt && d.closedAt >= monthStart).reduce((s, d) => s + d.value, 0)

  const recent = [
    ...recentContacts.map((a) => ({ kind: 'contact', text: `${a.contact.name} (${a.contact.client.name}) — ${a.type}`, at: a.createdAt })),
    ...recentDeals.map((d) => ({ kind: 'deal', text: `Deal: ${d.client.name} — ₹${d.value.toLocaleString('en-IN')} · ${d.stage}`, at: d.createdAt })),
    ...recentCandidates.map((c) => ({ kind: 'candidate', text: `New candidate: ${c.name}${c.job ? ` for ${c.job.title}` : ''}`, at: c.createdAt })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8)

  const upcoming = upcomingInterviews.map((i) => ({
    id: i.id, candidateName: i.candidate.name, jobTitle: i.candidate.job?.title ?? null, type: i.type, at: i.scheduledAt,
  }))

  // Getting-started checklist — computed live from real data.
  const [jobCount, candCount, linkCount, userCount] = await Promise.all([
    prisma.hireJob.count({ where: { tenantId: ctx.tenantId } }),
    prisma.hireCandidate.count({ where: { tenantId: ctx.tenantId } }),
    prisma.hireInterviewLink.count({ where: { hireCandidate: { tenantId: ctx.tenantId } } }),
    prisma.hireUser.count({ where: { tenantId: ctx.tenantId } }),
  ])
  const gettingStarted = { job: jobCount > 0, candidate: candCount > 0, interview: linkCount > 0, teammate: userCount > 1 }

  return NextResponse.json({ pipeline: { openTotal, openCount: open.length, byStage, wonMtd }, recent, upcoming, gettingStarted })
})
