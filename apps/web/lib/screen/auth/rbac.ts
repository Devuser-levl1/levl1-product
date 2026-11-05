// ── Screen RBAC (Screen-scoped, isomorphic) ────────────────────────────────
// The Screen equivalent of a role model (Hire has its own HireUser roles; the
// shared SSO token is not used for Screen roles — see session-guard.ts).
//   admin     — everything, plus team, roles and workspace settings
//   recruiter — positions, candidates, interviews, reports (create + edit)
//   viewer    — read-only access to everything a recruiter sees
// Unknown / legacy role strings are treated as "recruiter" (the old default).

export const SCREEN_ROLES = ['admin', 'recruiter', 'viewer'] as const
export type ScreenRole = (typeof SCREEN_ROLES)[number]

export const ROLE_INFO: Record<ScreenRole, { label: string; summary: string }> = {
  admin:     { label: 'Admin',     summary: 'Full access, including team members, roles, billing and workspace settings.' },
  recruiter: { label: 'Recruiter', summary: 'Creates and edits positions, candidates and interviews; sees reports and the Control Room.' },
  viewer:    { label: 'Viewer',    summary: 'Read-only: can view positions, candidates, interviews, reports and the Control Room.' },
}

export type Capability = 'view' | 'edit' | 'manageTeam' | 'manageWorkspace'

export function normalizeRole(role: unknown): ScreenRole {
  const r = typeof role === 'string' ? role.toLowerCase() : ''
  return (SCREEN_ROLES as readonly string[]).includes(r) ? (r as ScreenRole) : 'recruiter'
}

export const isScreenRole = (v: unknown): v is ScreenRole => typeof v === 'string' && (SCREEN_ROLES as readonly string[]).includes(v)

export function can(role: unknown, cap: Capability): boolean {
  const r = normalizeRole(role)
  if (cap === 'view') return true
  if (cap === 'edit') return r !== 'viewer'
  return r === 'admin'   // manageTeam, manageWorkspace
}
