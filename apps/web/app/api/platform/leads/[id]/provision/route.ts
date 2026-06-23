import { NextResponse } from 'next/server'
import { withPlatformAuth } from '@/lib/platform/auth'
import { prisma } from '@/lib/prisma'
import { signPurposeToken } from '@/lib/hire/auth'
import { sendHireEmail } from '@/lib/hire/email'
import { inviteTeamMemberEmail } from '@/emails/hire/invite-team-member'

export const dynamic = 'force-dynamic'

// Provision a real Levl1 Hire tenant from a won lead: create the tenant + an
// admin user (invited, sets their own password via the accept link) and mark the
// lead converted. Idempotent-ish: refuses if already converted.
export const POST = withPlatformAuth(async (req, ctx, params) => {
  const lead = await prisma.platformLead.findUnique({ where: { id: params.id } })
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (lead.convertedTenantId) return NextResponse.json({ error: 'This lead is already provisioned.' }, { status: 409 })

  const body = await req.json().catch(() => ({}))
  const tenantName = String(body.tenantName ?? lead.company ?? '').trim()
  const adminName = String(body.adminName ?? lead.contactName ?? '').trim()
  const adminEmail = String(body.adminEmail ?? lead.email ?? '').trim().toLowerCase()
  const tenantType = (body.type ?? lead.type) === 'CORPORATE' ? 'CORPORATE' : 'AGENCY'

  if (!tenantName || !adminName || !adminEmail) {
    return NextResponse.json({ error: 'Company name, admin name and admin email are required to provision.' }, { status: 400 })
  }

  // Create tenant + admin (no password yet — they set it via the invite link).
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const tenant = await prisma.hireTenant.create({
    data: { name: tenantName, type: tenantType, trialEndsAt, users: { create: { name: adminName, email: adminEmail, role: 'ADMIN' } } },
    include: { users: true },
  })
  const admin = tenant.users[0]

  // Email the admin a set-up / accept link.
  const token = signPurposeToken({ userId: admin.id, tenantId: tenant.id, purpose: 'invite' })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  const inviteUrl = `${appUrl}/hire/accept-invite/${token}`
  await sendHireEmail({
    to: adminEmail,
    subject: `Welcome to Levl1 Hire — ${tenantName}`,
    html: inviteTeamMemberEmail({ inviterName: ctx.name || 'The Levl1 team', tenantName, inviteUrl }),
  }).catch((e) => console.error('[platform/provision] invite email failed:', e))

  // Mark lead converted/won.
  await prisma.platformLead.update({ where: { id: lead.id }, data: { convertedTenantId: tenant.id, stage: 'Won', wonAt: lead.wonAt ?? new Date() } })
  await prisma.platformLeadActivity.create({ data: { leadId: lead.id, type: 'provisioned', note: `Provisioned tenant “${tenantName}” and invited ${adminEmail}`, actorName: ctx.name } })

  return NextResponse.json({ success: true, tenantId: tenant.id, adminInvited: adminEmail }, { status: 201 })
})
