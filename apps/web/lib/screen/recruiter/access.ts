import { getSessionFromRequest, type SessionPayload } from '@/lib/auth'

// ── Recruiter feature RBAC (Screen-scoped) ─────────────────────────────────
// Screen RBAC = agency scope + role (admin | recruiter | viewer). Every query
// in these features filters by session.agencyId. Viewers are read-only:
// they may export results but not edit templates or requirements.

export type RecruiterAccess =
  | { ok: true; session: SessionPayload; canEdit: boolean }
  | { ok: false; status: 401 | 403; error: string }

export function recruiterAccess(req: Request, opts: { edit?: boolean } = {}): RecruiterAccess {
  const session = getSessionFromRequest(req)
  if (!session) return { ok: false, status: 401, error: 'Unauthenticated' }
  const canEdit = (session.role ?? '').toLowerCase() !== 'viewer'
  if (opts.edit && !canEdit) return { ok: false, status: 403, error: 'Your role is read-only' }
  return { ok: true, session, canEdit }
}
