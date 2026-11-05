import { prisma } from '@/lib/prisma'

// ── Screen session guard (Screen-scoped, server-only) ──────────────────────
// The unified Levl1 SSO token is a SHARED contract with Hire — its format and
// signing are not changed here. The guard sits on the Screen side of
// getSessionFromRequest() and adds three things the stateless token can't:
//   1. LIVE role — the SSO payload always says "recruiter" for Interviews, so
//      Screen RBAC reads the role from the Screen User row instead.
//   2. Removed members — User.disabledAt → every Screen session is rejected.
//   3. "Sign out other devices" — tokens issued (iat) before
//      User.sessionsValidAfter are rejected.
//
// getSessionFromRequest is synchronous (43 call sites), so the guard reads an
// in-memory snapshot refreshed from the DB every REFRESH_MS. Mutations made in
// this process (role change, removal, sign-out) update the snapshot at once;
// other instances converge within REFRESH_MS. Sensitive admin actions use
// liveUser() for an always-fresh DB read.

const REFRESH_MS = 15_000

interface Entry { role: string; disabled: boolean; validAfterSec: number }

let snapshot = new Map<string, Entry>()
let loadedAt = 0
let inflight: Promise<void> | null = null

async function refresh(): Promise<void> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const rows = await prisma.user.findMany({ select: { id: true, role: true, disabledAt: true, sessionsValidAfter: true } })
      const next = new Map<string, Entry>()
      for (const r of rows) next.set(r.id, { role: r.role, disabled: !!r.disabledAt, validAfterSec: r.sessionsValidAfter ? Math.floor(r.sessionsValidAfter.getTime() / 1000) : 0 })
      snapshot = next
      loadedAt = Date.now()
    } catch (e) {
      console.warn('[session-guard] refresh failed:', e instanceof Error ? e.message : e)
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** Kick a background refresh when stale (never blocks the request). */
function ensureFresh() {
  if (Date.now() - loadedAt > REFRESH_MS) void refresh()
}

export interface GuardablePayload { userId: string; role: string; iat?: number }

/**
 * Apply the guard to a verified token payload. Returns null when the session
 * must be rejected, else the payload with the LIVE Screen role.
 * Unknown users (created after the last snapshot) pass with their token role
 * until the next refresh — removal always goes through a known row.
 */
export function applySessionGuard<T extends GuardablePayload>(payload: T): T | null {
  ensureFresh()
  const e = snapshot.get(payload.userId)
  if (!e) return payload
  if (e.disabled) return null
  if (e.validAfterSec && (payload.iat ?? 0) < e.validAfterSec) return null
  return e.role === payload.role ? payload : { ...payload, role: e.role }
}

/** Update the snapshot immediately after a mutation in this process. */
export function noteUserChange(userId: string, change: { role?: string; disabled?: boolean; validAfter?: Date | null }) {
  const cur = snapshot.get(userId) ?? { role: 'recruiter', disabled: false, validAfterSec: 0 }
  snapshot.set(userId, {
    role: change.role ?? cur.role,
    disabled: change.disabled ?? cur.disabled,
    validAfterSec: change.validAfter === undefined ? cur.validAfterSec : change.validAfter ? Math.floor(change.validAfter.getTime() / 1000) : 0,
  })
}

/** Always-fresh DB read for sensitive checks (admin actions). */
export async function liveUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, agencyId: true, email: true, name: true, disabledAt: true } })
}

/** Test hook. */
export function __setSnapshotForTests(entries: [string, Entry][]) { snapshot = new Map(entries); loadedAt = Date.now() }
