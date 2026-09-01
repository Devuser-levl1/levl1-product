import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { signPurposeToken } from '@/lib/hire/auth'
import { sendHireEmail } from '@/lib/hire/email'
import { agencyFromAddress } from '@/lib/emailService'
import { inviteTeamMemberEmail } from '@/emails/hire/invite-team-member'
import { checkAllowance } from '@/lib/hire/usage'
import { logAudit } from '@/lib/hire/audit'
import { isAdmin } from '@/lib/hire/permissions'
import { HIRE_ROLES } from '@/lib/hire/roles'

export const dynamic = 'force-dynamic'

// Invite a team member (admins only) — emails a signed accept link.
export const POST = withHireAuth(async (req, ctx) => {
  if (!isAdmin(ctx.role)) {
    return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 })
  }
  const body = await req.json()
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  // Full role set — MANAGER is assignable (was previously missing).
  const role = HIRE_ROLES.includes(body.role) ? body.role : 'RECRUITER'
  if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const existing = await prisma.hireUser.findFirst({ where: { tenantId: ctx.tenantId, email } })
  if (existing) return NextResponse.json({ error: 'A member with that email already exists' }, { status: 409 })

  const allow = await checkAllowance(ctx.tenantId, 'seat')
  if (!allow.allowed) return NextResponse.json({ error: allow.reason, message: allow.message, upgrade: true }, { status: 402 })

  const user = await prisma.hireUser.create({ data: { tenantId: ctx.tenantId, name, email, role } })

  const token = signPurposeToken({ userId: user.id, tenantId: ctx.tenantId, purpose: 'invite' })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  const inviteUrl = `${appUrl}/hire/accept-invite/${token}`
  const [tenant, inviter] = await Promise.all([
    prisma.hireTenant.findUnique({ where: { id: ctx.tenantId }, select: { name: true } }),
    prisma.hireUser.findFirst({ where: { id: ctx.userId, tenantId: ctx.tenantId }, select: { name: true, email: true } }),
  ])
  const tenantName = tenant?.name ?? 'HirePilot'

  // Send via Resend HTTP (never SMTP) — from the tenant's branded Levl1 sender,
  // reply-to the inviting admin. Capture the result: log the message id on
  // success, and surface a failure to the caller instead of silently 201-ing.
  let emailSent = false
  let emailError: string | null = null
  try {
    const result = await sendHireEmail({
      to: email,
      from: agencyFromAddress({ name: tenantName }),
      replyTo: inviter?.email,
      subject: `You've been invited to ${tenantName}`,
      html: inviteTeamMemberEmail({ inviterName: inviter?.name || 'Your team', tenantName, inviteUrl }),
    })
    emailSent = true
    console.log('[hire/invite] invite email sent to', email, 'resendId=', result.id ?? '(no id)')
  } catch (e) {
    emailError = e instanceof Error ? e.message : 'send failed'
    console.error('[hire/invite] invite email FAILED for', email, '-', emailError)
  }

  await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'team_member_invite', targetType: 'team_member', targetId: user.id, targetName: user.email, meta: { role: user.role, name, emailSent } })

  // 201 (member row created) but honest about delivery. The UI can offer the
  // invite link as a fallback when the email didn't go out.
  return NextResponse.json({ id: user.id, email: user.email, role: user.role, status: 'invited', emailSent, emailError, inviteUrl }, { status: 201 })
})
