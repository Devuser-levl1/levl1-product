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
  | 'crm'            // CRM nav + deals pipeline (admin)
  | 'manageClients'  // CREATE / EDIT client + contact records
  | 'deals'          // deal records
  | 'ar'             // Accounts Receivable (invoices)
  | 'oversight'      // manager oversight dashboard
  | 'team'           // team management
  | 'assignClients'  // assign RECRUITERS to clients (distinct from creating a client)
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
const ALL: Capability[] = ['crm', 'manageClients', 'deals', 'ar', 'oversight', 'team', 'assignClients', 'audit', 'billing', 'settingsAdmin', 'viewAllClients']

export const ROLE_CAPABILITIES: Record<HireRoleName, Capability[]> = {
  ADMIN: ALL,
  // Managers run the team: oversee, assign recruiters to clients, AND create/
  // edit the client records themselves — but NOT deals/AR/billing/settings.
  MANAGER: ['manageClients', 'oversight', 'team', 'assignClients', 'audit', 'viewAllClients'],
  // Recruiters & viewers have no admin/manager capabilities. Their day-to-day
  // work (candidates, jobs for assigned clients) is NOT capability-gated — it's
  // scoped by client assignment (see lib/hire/scope), so [] is correct here.
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
