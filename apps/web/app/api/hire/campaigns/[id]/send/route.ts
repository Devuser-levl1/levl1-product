import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { resolveAudience } from '@/lib/hire/campaigns'

export const dynamic = 'force-dynamic'

export const POST = withHireAuth(async (_req, ctx, params) => {
  const campaign = await prisma.hireCampaign.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (campaign.status === 'SENT') return NextResponse.json({ error: 'Campaign already sent' }, { status: 409 })

  const recipients = await resolveAudience(ctx.tenantId, campaign.audienceType, (campaign.audienceFilter as Record<string, string>) ?? {})
  if (recipients.length === 0) return NextResponse.json({ error: 'No recipients match this audience' }, { status: 400 })

  await prisma.hireCampaignRecipient.deleteMany({ where: { campaignId: campaign.id, status: 'pending' } })
  await prisma.hireCampaignRecipient.createMany({ data: recipients.map((r) => ({ campaignId: campaign.id, email: r.email, name: r.name })) })
  await prisma.hireCampaign.update({ where: { id: campaign.id }, data: { recipientCount: recipients.length, status: 'SCHEDULED' } })

  const { enqueue } = await import('@/lib/hire/jobs/queue')
  await enqueue('hire-send-campaign', { campaignId: campaign.id }).catch((e) => console.error('[campaign/send] enqueue failed:', e))

  return NextResponse.json({ ok: true, recipientCount: recipients.length })
})
