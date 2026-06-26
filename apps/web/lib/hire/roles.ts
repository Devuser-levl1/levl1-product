// Hire role hierarchy. Client-safe (constants + pure predicates).
//   ADMIN/OWNER  — everything + settings + billing + audit log
//   MANAGER      — team oversight + assign/reassign across the team
//   RECRUITER    — sees/works only their own assigned clients' work
//   VIEWER       — read-only (treated like a recruiter for scoping)
//
// Capability gating lives in ./permissions; role/casing normalisation is shared
// from there so token roles ('recruiter') and enum roles ('RECRUITER') agree.
import { isAdmin as capIsAdmin, isManagerPlus as capIsManagerPlus, normalizeRole } from './permissions'

export type HireRoleName = 'ADMIN' | 'MANAGER' | 'RECRUITER' | 'VIEWER'

export { normalizeRole }
export function isAdmin(role?: string | null): boolean { return capIsAdmin(role) }
export function isManagerPlus(role?: string | null): boolean { return capIsManagerPlus(role) }

/**
 * Prisma where-fragment scoping a recruiter to their own work. Managers/Admins
 * get {} (all). Recruiters see jobs/candidates assigned to them OR still
 * unassigned (so legacy/inbound items stay visible until someone takes them).
 *
 * NOTE: client-aware scoping (below) is preferred for jobs/candidates that
 * belong to a client; this remains for assignee-only contexts.
 */
export function assigneeScope(role: string | null | undefined, userId: string): Record<string, unknown> {
  if (isManagerPlus(role)) return {}
  return { OR: [{ assigneeId: userId }, { assigneeId: null }] }
}

// ── Client-aware scope builders (pure; take the recruiter's assigned client ids) ──

/** Clients a recruiter may see: only those they're assigned to. */
export function clientScope(role: string | null | undefined, assignedClientIds: string[]): Record<string, unknown> {
  if (isManagerPlus(role)) return {}
  return { id: { in: assignedClientIds } }
}

/**
 * Jobs a recruiter may see:
 *   - directly assigned to them, OR
 *   - belonging to one of their assigned clients, OR
 *   - clientless AND unassigned (legacy/inbound, not yet owned).
 */
export function jobScope(role: string | null | undefined, userId: string, assignedClientIds: string[]): Record<string, unknown> {
  if (isManagerPlus(role)) return {}
  return {
    OR: [
      { assigneeId: userId },
      { clientId: { in: assignedClientIds } },
      { AND: [{ assigneeId: null }, { clientId: null }] },
    ],
  }
}

/**
 * Candidates a recruiter may see — inherits visibility from the job's client:
 *   - directly assigned to them, OR
 *   - whose job belongs to one of their assigned clients, OR
 *   - unassigned AND not attached to any job (raw inbound / talent pool).
 */
export function candidateScope(role: string | null | undefined, userId: string, assignedClientIds: string[]): Record<string, unknown> {
  if (isManagerPlus(role)) return {}
  return {
    OR: [
      { assigneeId: userId },
      { job: { is: { clientId: { in: assignedClientIds } } } },
      { AND: [{ assigneeId: null }, { jobId: null }] },
    ],
  }
}

export const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', MANAGER: 'Manager', RECRUITER: 'Recruiter', VIEWER: 'Viewer' }
