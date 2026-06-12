import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { signPurposeToken } from '@/lib/hire/auth'
import { sendHireEmail } from '@/lib/hire/email'
import { inviteTeamMemberEmail } from '@/emails/hire/invite-team-member'

export const dynamic = 'force-dynamic'

// List team members for the tenant
export const GET = withHireAuth(async (_req, ctx) => {
  const users = await prisma.hireUser.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, name: true, email: true, role: true, lastLoginAt: true, createdAt: true, passwordHash: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(
    users.map((u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      lastLoginAt: u.lastLoginAt, createdAt: u.createdAt,
      status: u.passwordHash ? 'active' : 'invited',
    })),
  )
})

// Invite a new team member (admins only)
export const POST = withHireAuth(async (req, ctx) => {
  if (ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 })
  }
  const body = await req.json()
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const role = ['ADMIN', 'RECRUITER', 'VIEWER'].includes(body.role) ? body.role : 'RECRUITER'
  if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const existing = await prisma.hireUser.findFirst({ where: { tenantId: ctx.tenantId, email } })
  if (existing) return NextResponse.json({ error: 'A member with that email already exists' }, { status: 409 })

  const user = await prisma.hireUser.create({
    data: { tenantId: ctx.tenantId, name, email, role },
  })

  const token = signPurposeToken({ userId: user.id, tenantId: ctx.tenantId, purpose: 'invite' })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  const inviteUrl = `${appUrl}/hire/accept?token=${token}`
  const tenant = await prisma.hireTenant.findUnique({ where: { id: ctx.tenantId } })

  await sendHireEmail({
    to: email,
    subject: `You've been invited to ${tenant?.name ?? 'Levl1 Hire'}`,
    html: inviteTeamMemberEmail({ inviterName: 'Your team', tenantName: tenant?.name ?? 'Levl1 Hire', inviteUrl }),
  }).catch((e) => console.error('[hire/team] invite email failed:', e))

  return NextResponse.json({ id: user.id, email: user.email, role: user.role, status: 'invited' }, { status: 201 })
})
