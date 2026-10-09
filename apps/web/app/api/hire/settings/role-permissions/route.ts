import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/hire/audit'
import {
  resolveRoleMatrix, CAPABILITY_META, ROLE_ORDER, ADMIN_LOCKED, ALL_CAPABILITIES,
  type Capability, type HireRoleName,
} from '@/lib/hire/permissions'

export const dynamic = 'force-dynamic'

// GET — the tenant's effective RBAC matrix + the row metadata for the UI.
// Admin-only (settingsAdmin gate). Always returns resolved values (defaults
// applied, Admin lock-on caps forced) so the UI shows the true current state.
export const GET = withHireAuth(async (_req, ctx) => {
  if (!ctx.caps.includes('settingsAdmin')) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const tenant = await prisma.hireTenant.findUnique({ where: { id: ctx.tenantId }, select: { rolePermissions: true } })
  const matrix = resolveRoleMatrix(tenant?.rolePermissions)
  return NextResponse.json({
    roles: ROLE_ORDER,
    capabilities: CAPABILITY_META,
    matrix,
    adminLocked: ADMIN_LOCKED,
  })
})

// PUT — save the tenant's RBAC matrix. Admin-only. Guardrails: sanitise to known
// capabilities, and force the Admin lock-on caps so an admin can't remove their
// own ability to manage roles/settings/billing. Diff is written to the audit log.
export const PUT = withHireAuth(async (req, ctx) => {
  if (!ctx.caps.includes('settingsAdmin')) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const incoming = (body?.matrix && typeof body.matrix === 'object') ? body.matrix as Record<string, unknown> : null
  if (!incoming) return NextResponse.json({ error: 'matrix is required' }, { status: 400 })

  // Build a clean matrix from the submission (only known roles + capabilities).
  const clean = {} as Record<HireRoleName, Capability[]>
  for (const role of ROLE_ORDER) {
    const raw = Array.isArray(incoming[role]) ? (incoming[role] as unknown[]) : []
    clean[role] = ALL_CAPABILITIES.filter((c) => raw.includes(c))
  }
  // resolveRoleMatrix re-applies the Admin lock-on caps (defence in depth).
  const resolved = resolveRoleMatrix(clean)

  const before = resolveRoleMatrix((await prisma.hireTenant.findUnique({ where: { id: ctx.tenantId }, select: { rolePermissions: true } }))?.rolePermissions)

  await prisma.hireTenant.update({ where: { id: ctx.tenantId }, data: { rolePermissions: resolved } })

  // Per-role diff for the audit log (added/removed capabilities).
  const changes: Record<string, { added: Capability[]; removed: Capability[] }> = {}
  for (const role of ROLE_ORDER) {
    const added = resolved[role].filter((c) => !before[role].includes(c))
    const removed = before[role].filter((c) => !resolved[role].includes(c))
    if (added.length || removed.length) changes[role] = { added, removed }
  }
  if (Object.keys(changes).length) {
    const summary = Object.entries(changes).map(([r, d]) =>
      `${r}: ${[...d.added.map((c) => `+${c}`), ...d.removed.map((c) => `-${c}`)].join(' ')}`).join('; ')
    await logAudit({
      tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'role_permissions_change',
      reason: summary, meta: { changes },
    })
  }

  return NextResponse.json({ matrix: resolved, saved: Object.keys(changes).length > 0 })
})
