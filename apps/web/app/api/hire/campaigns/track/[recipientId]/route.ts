import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 1x1 transparent GIF
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')

export async function GET(_req: NextRequest, { params }: { params: { recipientId: string } }) {
  try {
    const rcpt = await prisma.hireCampaignRecipient.findUnique({ where: { id: params.recipientId } })
    if (rcpt && rcpt.status !== 'opened') {
      await prisma.hireCampaignRecipient.update({ where: { id: rcpt.id }, data: { status: 'opened', openedAt: new Date() } })
      await prisma.hireCampaign.update({ where: { id: rcpt.campaignId }, data: { openCount: { increment: 1 } } })
    }
  } catch { /* never break the pixel */ }
  return new NextResponse(GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } })
}
