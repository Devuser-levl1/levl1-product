import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'
import { personalize } from '@/lib/hire/campaigns'

export const dynamic = 'force-dynamic'

export const POST = withHireAuth(async (_req, ctx, params) => {
  const campaign = await prisma.hireCampaign.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const me = await prisma.hireUser.findUnique({ where: { id: ctx.userId } })
  const tenant = await prisma.hireTenant.findUnique({ where: { id: ctx.tenantId } })
  if (!me?.email) return NextResponse.json({ error: 'No email on your account' }, { status: 400 })

  const sample = { name: me.name, email: me.email, job: 'Senior Engineer', company: 'Acme Corp' }
  await sendEmail({
    to: me.email,
    from: `${tenant?.name ?? 'Levl1 Hire'} via Levl1 <${process.env.FROM_EMAIL ?? 'noreply@mail.levl1.io'}>`,
    subject: `[TEST] ${personalize(campaign.subject, sample)}`,
    html: `<div style="font-family:Inter,system-ui,sans-serif;color:#0F172A">${personalize(campaign.body, sample)}<p style="font-size:11px;color:#94A3B8;margin-top:20px">This is a test send with sample tokens filled.</p></div>`,
  })
  return NextResponse.json({ ok: true, to: me.email })
})
