import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx) => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [deals, recentContacts, recentDeals, recentCandidates] = await Promise.all([
    prisma.hireDeal.findMany({ where: { tenantId: ctx.tenantId }, select: { value: true, stage: true, closedAt: true } }),
    prisma.hireContactActivity.findMany({
      where: { contact: { client: { tenantId: ctx.tenantId } } },
      include: { contact: { select: { name: true, client: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 5,
    }),
    prisma.hireDeal.findMany({ where: { tenantId: ctx.tenantId }, include: { client: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.hireCandidate.findMany({ where: { tenantId: ctx.tenantId }, include: { job: { select: { title: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
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

  return NextResponse.json({ pipeline: { openTotal, openCount: open.length, byStage, wonMtd }, recent })
})
