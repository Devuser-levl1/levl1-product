import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { changeRole, removeMember, resendInvite, INVITE_TTL_MS } from '@/lib/screen/team/team'
import { normalizeRole } from '@/lib/screen/auth/rbac'

export const dynamic = 'force-dynamic'

// ── Team (Screen-scoped) ────────────────────────────────────────────────────
// GET    — members + pending invites (any signed-in member can view)
// PATCH  — { memberId }             resend an invite          (ADMIN)
//          { userId, role }         change a member's role    (ADMIN)
// DELETE — { memberId }             revoke a pending invite   (ADMIN)
//          { userId }               remove an active member   (ADMIN)

export async function GET(req: NextRequest) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const agencyId = access.session.agencyId
  const [users, invites] = await Promise.all([
    prisma.user.findMany({
      where: { agencyId, disabledAt: null },
      select: { id: true, name: true, email: true, role: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.teamMember.findMany({
      where: { agencyId, status: 'invited' },
      select: { id: true, name: true, email: true, role: true, invitedAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])
  const now = Date.now()
  return NextResponse.json({
    canManage: access.isAdmin,
    me: access.session.userId,
    users: users.map((u) => ({ ...u, role: normalizeRole(u.role) })),
    invites: invites.map((i) => ({ ...i, role: normalizeRole(i.role), expired: now - (i.invitedAt ?? i.createdAt).getTime() > INVITE_TTL_MS })),
    // Back-compat for older clients that read `members`.
    members: invites.map((i) => ({ ...i, status: 'invited' })),
  })
}

export async function PATCH(req: NextRequest) {
  const access = recruiterAccess(req, { admin: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const body = await req.json().catch(() => ({})) as { memberId?: unknown; userId?: unknown; role?: unknown }
  const agencyId = access.session.agencyId
  if (typeof body.userId === 'string') {
    const r = await changeRole({ agencyId, actorId: access.session.userId, userId: body.userId, role: body.role })
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.status })
  }
  if (typeof body.memberId === 'string') {
    const r = await resendInvite({ agencyId, inviterName: access.session.name, memberId: body.memberId })
    return r.ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: r.error }, { status: r.status })
  }
  return NextResponse.json({ error: 'userId or memberId required' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const access = recruiterAccess(req, { admin: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const body = await req.json().catch(() => ({})) as { memberId?: unknown; userId?: unknown }
  const agencyId = access.session.agencyId
  if (typeof body.userId === 'string') {
    const r = await removeMember({ agencyId, actorId: access.session.userId, userId: body.userId })
    return r.ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: r.error }, { status: r.status })
  }
  if (typeof body.memberId === 'string') {
    const m = await prisma.teamMember.findFirst({ where: { id: body.memberId, agencyId, status: 'invited' }, select: { id: true } })
    if (!m) return NextResponse.json({ error: 'Invite not found.' }, { status: 404 })
    await prisma.teamMember.delete({ where: { id: m.id } })
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: 'userId or memberId required' }, { status: 400 })
}
