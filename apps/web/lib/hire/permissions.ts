// Hire capability model — the single source of truth for role-based gating,
// used by BOTH the left-nav (client) and the API routes (server). Client-safe:
// pure constants + predicates, no imports.
//
// Roles: ADMIN (a.k.a. Super-Admin — top tier; there is no separate SUPER_ADMIN
// in the schema), MANAGER, RECRUITER, VIEWER. VIEWER is scoped like a recruiter.
//
// To change what a role can do, edit ROLE_CAPABILITIES below — nav + API update
// together.
export type HireRoleName = 'ADMIN' | 'MANAGER' | 'RECRUITER' | 'VIEWER'

export type Capability =
  | 'crm'            // CRM (clients + deals pipeline) nav + APIs
  | 'deals'          // deal records
  | 'ar'             // Accounts Receivable (invoices)
  | 'oversight'      // manager oversight dashboard
  | 'team'           // team management
  | 'assignClients'  // assign recruiters to clients
  | 'audit'          // audit log
  | 'billing'        // billing + plan
  | 'settingsAdmin'  // tenant-wide settings (career page, integrations, etc.)
  | 'viewAllClients' // NOT client-scoped (sees every client's jobs/candidates)

/** Normalise any stored/token role string to a canonical role name. */
export function normalizeRole(role?: string | null): HireRoleName {
  const r = (role ?? '').toUpperCase()
  if (r === 'ADMIN' || r === 'OWNER' || r === 'SUPER_ADMIN') return 'ADMIN'
  if (r === 'MANAGER') return 'MANAGER'
  if (r === 'VIEWER') return 'VIEWER'
  return 'RECRUITER'
}

// Sensible defaults:
//   ADMIN    — everything (CRM/AR/Deals + billing + settings + oversight)
//   MANAGER  — team + assignment + oversight + audit; sees all clients;
//              NOT CRM/AR/Deals (per spec)
//   RECRUITER/VIEWER — own assigned work only; no CRM/AR/Deals/oversight
const ALL: Capability[] = ['crm', 'deals', 'ar', 'oversight', 'team', 'assignClients', 'audit', 'billing', 'settingsAdmin', 'viewAllClients']

export const ROLE_CAPABILITIES: Record<HireRoleName, Capability[]> = {
  ADMIN: ALL,
  MANAGER: ['oversight', 'team', 'assignClients', 'audit', 'viewAllClients'],
  RECRUITER: [],
  VIEWER: [],
}

export function can(role: string | null | undefined, cap: Capability): boolean {
  return ROLE_CAPABILITIES[normalizeRole(role)].includes(cap)
}

export function isAdmin(role?: string | null): boolean { return normalizeRole(role) === 'ADMIN' }
export function isManagerPlus(role?: string | null): boolean {
  const r = normalizeRole(role)
  return r === 'ADMIN' || r === 'MANAGER'
}
