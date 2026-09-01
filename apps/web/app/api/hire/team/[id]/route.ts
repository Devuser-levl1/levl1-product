import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/hire/audit'
import { isAdmin } from '@/lib/hire/permissions'
import { HIRE_ROLES } from '@/lib/hire/roles'

export const dynamic = 'force-dynamic'

// Member management — ADMIN only. Change role, or remove a member (reassigning
// their work first so nothing is silently orphaned). Tenant-scoped + audited.

async function member(tenantId: string, id: string) {
  return prisma.hireUser.findFirst({ where: { id, tenantId } })
}

/** Count a member's assigned work (jobs, candidates, clients). */
async function workload(tenantId: string, id: string) {
  const [jobs, candidates, clients] = await Promise.all([
    prisma.hireJob.count({ where: { tenantId, assigneeId: id } }),
    prisma.hireCandidate.count({ where: { tenantId, assigneeId: id } }),
    prisma.hireClient.count({ where: { tenantId, recruiters: { some: { id } } } }),
  ])
  return { jobs, candidates, clients }
}

// GET — member + their workload (used by the remove flow to prompt reassignment).
export const GET = withHireAuth(async (_req, ctx, params) => {
  if (!isAdmin(ctx.role)) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const m = await member(ctx.tenantId, params.id)
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    member: { id: m.id, name: m.name, email: m.email, role: m.role, disabled: m.disabled, status: m.disabled ? 'disabled' : m.passwordHash ? 'active' : 'invited' },
    workload: await workload(ctx.tenantId, m.id),
  })
})

/** Reassign (or unassign) a member's jobs, candidates & client links. */
async function reassignWork(tenantId: string, fromId: string, toId: string | null) {
  const clientIds = (await prisma.hireClient.findMany({ where: { tenantId, recruiters: { some: { id: fromId } } }, select: { id: true } })).map((c) => c.id)
  await prisma.hireJob.updateMany({ where: { tenantId, assigneeId: fromId }, data: { assigneeId: toId } })
  await prisma.hireCandidate.updateMany({ where: { tenantId, assigneeId: fromId }, data: { assigneeId: toId } })
  if (clientIds.length) {
    await prisma.hireUser.update({ where: { id: fromId }, data: { assignedClients: { disconnect: clientIds.map((id) => ({ id })) } } })
    if (toId) await prisma.hireUser.update({ where: { id: toId }, data: { assignedClients: { connect: clientIds.map((id) => ({ id })) } } })
  }
}

// PATCH — change role, OR enable/disable a member. Admin-only, audited.
//   { role }
//   { disabled: boolean, reassignToUserId?: string }
export const PATCH = withHireAuth(async (req, ctx, params) => {
  if (!isAdmin(ctx.role)) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const m = await member(ctx.tenantId, params.id)
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))

  // ── Enable / disable ──────────────────────────────────────────────────────
  if (typeof body.disabled === 'boolean') {
    const disabled = body.disabled as boolean
    if (disabled === m.disabled) return NextResponse.json({ ok: true, disabled })
    if (disabled) {
      if (m.id === ctx.userId) return NextResponse.json({ error: "You can't disable your own account." }, { status: 400 })
      if (m.role === 'ADMIN') {
        const activeAdmins = await prisma.hireUser.count({ where: { tenantId: ctx.tenantId, role: 'ADMIN', disabled: false } })
        if (activeAdmins <= 1) return NextResponse.json({ error: 'This is the only active admin — promote or enable another admin first.' }, { status: 409 })
      }
      // Optional reassignment of their work (prompted in the UI when they own any).
      let reassignTo: string | null = null
      if (body.reassignToUserId) {
        const target = await prisma.hireUser.findFirst({ where: { id: String(body.reassignToUserId), tenantId: ctx.tenantId, disabled: false }, select: { id: true } })
        if (!target) return NextResponse.json({ error: 'Invalid reassignment target' }, { status: 400 })
        if (target.id === m.id) return NextResponse.json({ error: 'Cannot reassign work to the member being disabled' }, { status: 400 })
        reassignTo = target.id
      }
      const before = await workload(ctx.tenantId, m.id)
      if (reassignTo) await reassignWork(ctx.tenantId, m.id, reassignTo)
      await prisma.hireUser.update({ where: { id: m.id }, data: { disabled: true } })
      await logAudit({
        tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'team_member_disable',
        targetType: 'team_member', targetId: m.id, targetName: m.name || m.email,
        meta: { role: m.role, reassignedTo: reassignTo, ownedWork: before },
      })
      return NextResponse.json({ ok: true, disabled: true, reassignedTo: reassignTo })
    }
    // Re-enable
    await prisma.hireUser.update({ where: { id: m.id }, data: { disabled: false } })
    await logAudit({
      tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'team_member_enable',
      targetType: 'team_member', targetId: m.id, targetName: m.name || m.email, meta: { role: m.role },
    })
    return NextResponse.json({ ok: true, disabled: false })
  }

  // ── Role change ───────────────────────────────────────────────────────────
  const role = HIRE_ROLES.includes(body.role) ? body.role : null
  if (!role) return NextResponse.json({ error: 'A valid role is required' }, { status: 400 })
  if (role === m.role) return NextResponse.json({ ok: true, role })

  // Never demote the last remaining admin (would lock the tenant out of settings/billing).
  if (m.role === 'ADMIN' && role !== 'ADMIN') {
    const admins = await prisma.hireUser.count({ where: { tenantId: ctx.tenantId, role: 'ADMIN' } })
    if (admins <= 1) return NextResponse.json({ error: 'This is the only admin — promote another member to admin first.' }, { status: 409 })
  }

  await prisma.hireUser.update({ where: { id: m.id }, data: { role } })
  await logAudit({
    tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'team_member_role_change',
    targetType: 'team_member', targetId: m.id, targetName: m.name || m.email,
    meta: { from: m.role, to: role },
  })
  return NextResponse.json({ ok: true, role })
})

// DELETE { reassignToUserId? } — remove a member. Their jobs/candidates/clients
// are reassigned to the given member (or unassigned if none), never orphaned.
export const DELETE = withHireAuth(async (req, ctx, params) => {
  if (!isAdmin(ctx.role)) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const m = await member(ctx.tenantId, params.id)
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (m.id === ctx.userId) return NextResponse.json({ error: 'You can\'t remove yourself.' }, { status: 400 })
  if (m.role === 'ADMIN') {
    const admins = await prisma.hireUser.count({ where: { tenantId: ctx.tenantId, role: 'ADMIN' } })
    if (admins <= 1) return NextResponse.json({ error: 'This is the only admin — you can\'t remove the last admin.' }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  let reassignTo: string | null = null
  if (body.reassignToUserId) {
    const target = await prisma.hireUser.findFirst({ where: { id: String(body.reassignToUserId), tenantId: ctx.tenantId }, select: { id: true } })
    if (!target) return NextResponse.json({ error: 'Invalid reassignment target' }, { status: 400 })
    if (target.id === m.id) return NextResponse.json({ error: 'Cannot reassign work to the member being removed' }, { status: 400 })
    reassignTo = target.id
  }

  const before = await workload(ctx.tenantId, m.id)
  const clientIds = (await prisma.hireClient.findMany({ where: { tenantId: ctx.tenantId, recruiters: { some: { id: m.id } } }, select: { id: true } })).map((c) => c.id)

  // Reassign (or unassign) their jobs & candidates, then move client assignments.
  await prisma.hireJob.updateMany({ where: { tenantId: ctx.tenantId, assigneeId: m.id }, data: { assigneeId: reassignTo } })
  await prisma.hireCandidate.updateMany({ where: { tenantId: ctx.tenantId, assigneeId: m.id }, data: { assigneeId: reassignTo } })
  if (reassignTo && clientIds.length) {
    await prisma.hireUser.update({ where: { id: reassignTo }, data: { assignedClients: { connect: clientIds.map((id) => ({ id })) } } })
  }
  // Deleting the user drops its client-assignment links automatically.
  await prisma.hireUser.delete({ where: { id: m.id } })

  await logAudit({
    tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'team_member_remove',
    targetType: 'team_member', targetId: m.id, targetName: m.name || m.email,
    meta: { role: m.role, reassignedTo: reassignTo, reassigned: before },
  })
  return NextResponse.json({ ok: true, reassigned: before, reassignedTo: reassignTo })
})
