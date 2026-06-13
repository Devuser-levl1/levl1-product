import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx, params) => {
  const campaign = await prisma.hireCampaign.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: { recipients: { orderBy: { sentAt: 'desc' }, take: 100 } },
  })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(campaign)
})

export const PATCH = withHireAuth(async (req, ctx, params) => {
  const existing = await prisma.hireCampaign.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status === 'SENT') return NextResponse.json({ error: 'Sent campaigns cannot be edited' }, { status: 409 })
  const body = await req.json()
  const data: Prisma.HireCampaignUpdateInput = {}
  if (typeof body.name === 'string') data.name = body.name
  if (typeof body.subject === 'string') data.subject = body.subject
  if (typeof body.body === 'string') data.body = body.body
  if (body.audienceType) data.audienceType = body.audienceType === 'contacts' ? 'contacts' : 'candidates'
  if (body.audienceFilter) data.audienceFilter = body.audienceFilter
  const campaign = await prisma.hireCampaign.update({ where: { id: existing.id }, data })
  return NextResponse.json(campaign)
})

export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const existing = await prisma.hireCampaign.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.hireCampaign.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
})
