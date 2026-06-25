// Hire role hierarchy. Client-safe (constants + pure predicates).
//   ADMIN/OWNER  — everything + settings + billing + audit log
//   MANAGER      — team oversight + assign/reassign across the team
//   RECRUITER    — sees/works only their own assigned jobs & candidates
//   VIEWER       — read-only (treated like a recruiter for scoping)
export type HireRoleName = 'ADMIN' | 'MANAGER' | 'RECRUITER' | 'VIEWER'

export function isAdmin(role?: string | null): boolean { return role === 'ADMIN' }
export function isManagerPlus(role?: string | null): boolean { return role === 'ADMIN' || role === 'MANAGER' }

/**
 * Prisma where-fragment scoping a recruiter to their own work. Managers/Admins
 * get {} (all). Recruiters see jobs/candidates assigned to them OR still
 * unassigned (so legacy/inbound items stay visible until someone takes them).
 */
export function assigneeScope(role: string | null | undefined, userId: string): Record<string, unknown> {
  if (isManagerPlus(role)) return {}
  return { OR: [{ assigneeId: userId }, { assigneeId: null }] }
}

export const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', MANAGER: 'Manager', RECRUITER: 'Recruiter', VIEWER: 'Viewer' }
