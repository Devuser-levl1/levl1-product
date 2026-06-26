import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { HireContext } from './tenant-middleware'
import { can, isManagerPlus, normalizeRole, type Capability } from './permissions'
import { clientScope, jobScope, candidateScope } from './roles'

// Server-side scoping: turns a request context into Prisma where-fragments that
// limit recruiters to their assigned clients' work. Managers/Admins are never
// scoped. Enforce at the DATA layer — every list/detail route uses these so a
// recruiter cannot reach another client's data even by direct URL.

/** Client ids the current user is assigned to (empty for manager/admin — they aren't scoped). */
export async function getAssignedClientIds(ctx: HireContext): Promise<string[]> {
  if (isManagerPlus(ctx.role)) return []
  const clients = await prisma.hireClient.findMany({
    where: { tenantId: ctx.tenantId, recruiters: { some: { id: ctx.userId } } },
    select: { id: true },
  })
  return clients.map((c) => c.id)
}

export interface ScopedWheres {
  client: Record<string, unknown>
  job: Record<string, unknown>
  candidate: Record<string, unknown>
}

/** Build all scope fragments in one shot (one DB read for the client ids). */
export async function getScopes(ctx: HireContext): Promise<ScopedWheres> {
  const ids = await getAssignedClientIds(ctx)
  return {
    client: clientScope(ctx.role, ids),
    job: jobScope(ctx.role, ctx.userId, ids),
    candidate: candidateScope(ctx.role, ctx.userId, ids),
  }
}

/** True if the current user may see this specific job (used by detail routes). */
export async function canAccessJob(ctx: HireContext, job: { assigneeId: string | null; clientId: string | null }): Promise<boolean> {
  if (isManagerPlus(ctx.role)) return true
  if (job.assigneeId === ctx.userId) return true
  if (job.assigneeId === null && job.clientId === null) return true
  if (!job.clientId) return false
  const ids = await getAssignedClientIds(ctx)
  return ids.includes(job.clientId)
}

/** True if the current user may see this specific candidate (inherits from its job's client). */
export async function canAccessCandidate(
  ctx: HireContext,
  cand: { assigneeId: string | null; jobId: string | null; job?: { clientId: string | null } | null },
): Promise<boolean> {
  if (isManagerPlus(ctx.role)) return true
  if (cand.assigneeId === ctx.userId) return true
  if (cand.assigneeId === null && cand.jobId === null) return true
  const clientId = cand.job?.clientId ?? null
  if (!clientId) return false
  const ids = await getAssignedClientIds(ctx)
  return ids.includes(clientId)
}

/** True if the current user may see this client. */
export async function canAccessClient(ctx: HireContext, clientId: string): Promise<boolean> {
  if (isManagerPlus(ctx.role)) return true
  const ids = await getAssignedClientIds(ctx)
  return ids.includes(clientId)
}

// ── Capability guards for API routes ────────────────────────────────────────

/** 403 JSON response for a missing capability. */
export function forbidden(): NextResponse {
  return NextResponse.json({ error: 'You do not have access to this.' }, { status: 403 })
}

/** Returns a 403 response if the role lacks the capability, else null. */
export function requireCap(ctx: HireContext, cap: Capability): NextResponse | null {
  return can(ctx.role, cap) ? null : forbidden()
}

export { normalizeRole }
