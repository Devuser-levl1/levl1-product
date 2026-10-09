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

// ── Admin-configurable RBAC matrix ──────────────────────────────────────────

export const ROLE_ORDER: HireRoleName[] = ['ADMIN', 'MANAGER', 'RECRUITER', 'VIEWER']

// Matrix rows: every capability with a human-readable label + description. This
// is exactly what the Roles & Permissions UI renders (and what to report).
export const CAPABILITY_META: { key: Capability; label: string; description: string }[] = [
  { key: 'crm', label: 'CRM & Clients', description: 'Access the CRM workspace and client records.' },
  { key: 'manageClients', label: 'Create / edit clients', description: 'Create and edit client & contact records.' },
  { key: 'deals', label: 'Deals', description: 'View and manage the deal pipeline.' },
  { key: 'ar', label: 'Receivables', description: 'Accounts Receivable — invoices & payment reminders.' },
  { key: 'oversight', label: 'Team oversight', description: 'The manager oversight / assignment dashboard.' },
  { key: 'team', label: 'Team management', description: 'Invite, disable and manage members & their roles.' },
  { key: 'assignClients', label: 'Assign recruiters to clients', description: 'Assign recruiters to specific clients.' },
  { key: 'audit', label: 'Audit log', description: 'View the tenant audit log.' },
  { key: 'billing', label: 'Billing & plan', description: 'Manage the plan, usage and invoices.' },
  { key: 'settingsAdmin', label: 'Settings admin', description: 'Tenant-wide settings — career page, integrations, roles.' },
  { key: 'viewAllClients', label: 'View all clients', description: 'See every client’s jobs & candidates (not client-scoped).' },
]

export const ALL_CAPABILITIES: Capability[] = CAPABILITY_META.map((c) => c.key)

// Core caps an Admin can NEVER lose — otherwise an admin could lock themselves
// out of role/settings/billing management. Always forced on for ADMIN.
export const ADMIN_LOCKED: Capability[] = ['settingsAdmin', 'team', 'billing']

type RoleMatrix = Record<HireRoleName, Capability[]>

function sanitizeCaps(list: unknown): Capability[] {
  if (!Array.isArray(list)) return []
  return ALL_CAPABILITIES.filter((c) => list.includes(c))
}

/**
 * Resolve the effective RBAC matrix for a tenant: start from the stored override
 * (per role), fall back to the hardcoded defaults for any role not present, and
 * force the Admin lock-on caps. This is the single source of truth consumed by
 * the middleware (ctx.caps), /me (nav) and the matrix UI.
 */
export function resolveRoleMatrix(stored: unknown): RoleMatrix {
  const s = (stored && typeof stored === 'object') ? (stored as Record<string, unknown>) : {}
  const out = {} as RoleMatrix
  for (const role of ROLE_ORDER) {
    const raw = role in s ? sanitizeCaps(s[role]) : [...ROLE_CAPABILITIES[role]]
    out[role] = raw
  }
  // Admin always retains the locked core caps.
  out.ADMIN = Array.from(new Set([...out.ADMIN, ...ADMIN_LOCKED]))
  return out
}

/** Effective capabilities for one role under a tenant's stored matrix. */
export function effectiveCaps(role: string | null | undefined, stored: unknown): Capability[] {
  return resolveRoleMatrix(stored)[normalizeRole(role)]
}

/** Capability check against an already-resolved capability list (ctx.caps). */
export function hasCap(caps: Capability[] | undefined | null, cap: Capability): boolean {
  return !!caps && caps.includes(cap)
}

export function isAdmin(role?: string | null): boolean { return normalizeRole(role) === 'ADMIN' }
export function isManagerPlus(role?: string | null): boolean {
  const r = normalizeRole(role)
  return r === 'ADMIN' || r === 'MANAGER'
}
