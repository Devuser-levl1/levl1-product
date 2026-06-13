import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { resolveAudience } from '@/lib/hire/campaigns'

export const dynamic = 'force-dynamic'

export const POST = withHireAuth(async (_req, ctx, params) => {
  const campaign = await prisma.hireCampaign.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const recipients = await resolveAudience(ctx.tenantId, campaign.audienceType, (campaign.audienceFilter as Record<string, string>) ?? {})
  return NextResponse.json({ count: recipients.length, sample: recipients.slice(0, 5) })
})
