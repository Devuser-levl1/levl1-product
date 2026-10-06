import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { signPurposeToken } from '@/lib/hire/auth'
import { sendHireEmail } from '@/lib/hire/email'
import { agencyFromAddress } from '@/lib/emailService'
import { inviteTeamMemberEmail } from '@/emails/hire/invite-team-member'
import { logAudit } from '@/lib/hire/audit'
import { isAdmin } from '@/lib/hire/permissions'

export const dynamic = 'force-dynamic'

// Mint a fresh invite link for an EXISTING pending member, and optionally resend
// the email. Decouples "member created" from "email delivered" — admins can copy
// the secure link and share it directly when email lands in spam or bounces.
// (The main invite route refuses an existing email with 409, so re-inviting a
// pending member needs this dedicated path.)
export const POST = withHireAuth(async (req, ctx, params) => {
  if (!isAdmin(ctx.role)) return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 })

  const member = await prisma.hireUser.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    select: { id: true, name: true, email: true, passwordHash: true, disabled: true },
  })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (member.disabled) return NextResponse.json({ error: 'This member is disabled — enable them first.' }, { status: 400 })
  if (member.passwordHash) return NextResponse.json({ error: 'This member has already accepted and is active.' }, { status: 400 })

  const token = signPurposeToken({ userId: member.id, tenantId: ctx.tenantId, purpose: 'invite' })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  const inviteUrl = `${appUrl}/hire/accept-invite/${token}`

  const body = await req.json().catch(() => ({}))
  const resend = body?.resend === true

  let emailSent = false
  let emailError: string | null = null
  if (resend) {
    const [tenant, inviter] = await Promise.all([
      prisma.hireTenant.findUnique({ where: { id: ctx.tenantId }, select: { name: true } }),
      prisma.hireUser.findFirst({ where: { id: ctx.userId, tenantId: ctx.tenantId }, select: { name: true, email: true } }),
    ])
    const tenantName = tenant?.name ?? 'HirePilot'
    try {
      await sendHireEmail({
        to: member.email,
        from: agencyFromAddress({ name: tenantName }),
        replyTo: inviter?.email,
        subject: `You've been invited to ${tenantName}`,
        html: inviteTeamMemberEmail({ inviterName: inviter?.name || 'Your team', tenantName, inviteUrl }),
      })
      emailSent = true
    } catch (e) {
      emailError = e instanceof Error ? e.message : 'send failed'
      console.error('[hire/invite-link] resend FAILED for', member.email, '-', emailError)
    }
    await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'team_member_invite', targetType: 'team_member', targetId: member.id, targetName: member.email, meta: { resent: true, emailSent } })
  }

  return NextResponse.json({ inviteUrl, emailSent, emailError })
})
