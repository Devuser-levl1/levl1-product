import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/hire/auth'
import { logAudit } from '@/lib/hire/audit'

export const dynamic = 'force-dynamic'

// POST { currentPassword, newPassword } — change your own password.
// Verifies the current password server-side before updating. Audited.
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const currentPassword = String(body.currentPassword ?? '')
  const newPassword = String(body.newPassword ?? '')

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'New password must be different from the current one.' }, { status: 400 })
  }

  const user = await prisma.hireUser.findFirst({ where: { id: ctx.userId, tenantId: ctx.tenantId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!user.passwordHash) {
    return NextResponse.json({ error: 'No password set yet — use the invite or reset link to set one.' }, { status: 400 })
  }
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: 'Your current password is incorrect.' }, { status: 401 })
  }

  await prisma.hireUser.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } })
  await logAudit({
    tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'password_change',
    targetType: 'team_member', targetId: user.id, targetName: user.name || user.email,
  })
  return NextResponse.json({ ok: true })
})
