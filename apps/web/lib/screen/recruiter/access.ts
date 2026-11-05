import { getSessionFromRequest, type SessionPayload } from '@/lib/auth'
import { can } from '@/lib/screen/auth/rbac'

// ── Recruiter feature RBAC (Screen-scoped) ─────────────────────────────────
// Screen RBAC = agency scope + role (admin | recruiter | viewer — see
// lib/screen/auth/rbac.ts). Every query filters by session.agencyId.
// session.role is the LIVE Screen role (session-guard), not the SSO token's.
//   edit:  recruiters + admins (viewers are read-only)
//   admin: admins only (team, roles, workspace settings)

export type RecruiterAccess =
  | { ok: true; session: SessionPayload; canEdit: boolean; isAdmin: boolean }
  | { ok: false; status: 401 | 403; error: string }

export function recruiterAccess(req: Request, opts: { edit?: boolean; admin?: boolean } = {}): RecruiterAccess {
  const session = getSessionFromRequest(req)
  if (!session) return { ok: false, status: 401, error: 'Unauthenticated' }
  const canEdit = can(session.role, 'edit')
  const isAdmin = can(session.role, 'manageTeam')
  if (opts.admin && !isAdmin) return { ok: false, status: 403, error: 'Only workspace admins can do this.' }
  if (opts.edit && !canEdit) return { ok: false, status: 403, error: 'Your role is read-only' }
  return { ok: true, session, canEdit, isAdmin }
}
