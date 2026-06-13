import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx) => {
  const campaigns = await prisma.hireCampaign.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, name: true, subject: true, status: true, sentCount: true, openCount: true, failedCount: true, recipientCount: true, audienceType: true, sentAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(campaigns)
})

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Campaign name required' }, { status: 400 })
  const campaign = await prisma.hireCampaign.create({
    data: {
      tenantId: ctx.tenantId,
      name: String(body.name),
      subject: String(body.subject ?? ''),
      body: String(body.body ?? ''),
      audienceType: body.audienceType === 'contacts' ? 'contacts' : 'candidates',
      audienceFilter: body.audienceFilter ?? {},
    },
  })
  return NextResponse.json(campaign, { status: 201 })
})
