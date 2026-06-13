import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'
import { personalize, Recipient } from '@/lib/hire/campaigns'
import { signPurposeToken } from '@/lib/hire/auth'

export const SEND_CAMPAIGN_JOB = 'hire-send-campaign'

export async function sendCampaignHandler(data: { campaignId: string }) {
  const campaign = await prisma.hireCampaign.findUnique({ where: { id: data.campaignId }, include: { tenant: true } })
  if (!campaign) return
  const admin = await prisma.hireUser.findFirst({ where: { tenantId: campaign.tenantId, role: 'ADMIN' }, orderBy: { createdAt: 'asc' } })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  const from = `${campaign.tenant.name} via Levl1 <${process.env.FROM_EMAIL ?? 'noreply@mail.levl1.io'}>`

  const pending = await prisma.hireCampaignRecipient.findMany({ where: { campaignId: campaign.id, status: 'pending' } })
  let sent = 0, failed = 0
  const BATCH = 20

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH)
    await Promise.all(batch.map(async (rcpt) => {
      const r: Recipient = { name: rcpt.name ?? '', email: rcpt.email }
      const unsubToken = signPurposeToken({ email: rcpt.email, tenantId: campaign.tenantId, audienceType: campaign.audienceType, purpose: 'unsub' })
      const pixel = `<img src="${appUrl}/api/hire/campaigns/track/${rcpt.id}" width="1" height="1" style="display:none" alt="" />`
      const unsub = `<p style="font-size:11px;color:#94A3B8;margin-top:24px">You're receiving this from ${campaign.tenant.name}. <a href="${appUrl}/hire/unsubscribe/${unsubToken}" style="color:#94A3B8">Unsubscribe</a>.</p>`
      const html = `<div style="font-family:Inter,system-ui,sans-serif;color:#0F172A">${personalize(campaign.body, r)}${unsub}${pixel}</div>`
      try {
        await sendEmail({ to: rcpt.email, from, replyTo: admin?.email, subject: personalize(campaign.subject, r), html })
        await prisma.hireCampaignRecipient.update({ where: { id: rcpt.id }, data: { status: 'sent', sentAt: new Date() } })
        sent++
      } catch (e) {
        console.error('[hire-send-campaign] send failed for', rcpt.email, e)
        await prisma.hireCampaignRecipient.update({ where: { id: rcpt.id }, data: { status: 'failed' } })
        failed++
      }
    }))
    await new Promise((res) => setTimeout(res, 500)) // gentle rate limit between batches
  }

  await prisma.hireCampaign.update({ where: { id: campaign.id }, data: { status: 'SENT', sentAt: new Date(), sentCount: sent, failedCount: failed } })
  console.log(`[hire-send-campaign] ${campaign.id} sent ${sent} failed ${failed}`)
}
