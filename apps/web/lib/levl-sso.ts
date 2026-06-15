import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// ── Levl1 SSO: one session honored by both products (Phase 4) ──────────────
// Both apps share the HS256 scheme + JWT_SECRET and the `levl1_session` cookie.
// This module issues a UNIFIED token whose payload carries the Interviews context
// (top-level userId/agencyId — so the existing Interviews verifyJWT reads it
// unchanged) PLUS a namespaced Hire context and an entitlements flag. Each app
// reads its own context and enforces its entitlement.

const JWT_SECRET = process.env.JWT_SECRET ?? 'levl1-dev-secret-change-in-production-please'
export const SESSION_COOKIE = 'levl1_session'
export const SESSION_MAX_AGE = 7 * 24 * 3600

export interface Entitlements { hire: boolean; interviews: boolean }

export interface UnifiedSession {
  email: string
  name: string
  // Interviews context (present iff entitled + linked). Kept at top level so the
  // existing Interviews SessionPayload shape still resolves.
  userId?: string
  agencyId?: string
  role?: string
  // Hire context (namespaced to avoid colliding with the Interviews userId).
  hireUserId?: string
  hireTenantId?: string
  hireRole?: string
  ent: Entitlements
}

function b64url(s: string) { return Buffer.from(s, 'utf8').toString('base64url') }

export function signLevlSession(payload: UnifiedSession): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }))
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

export function verifyLevlSession(token: string): (UnifiedSession & { exp: number }) | null {
  try {
    const [header, body, sig] = token.split('.')
    if (!header || !body || !sig) return null
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    const a = Buffer.from(sig), b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as UnifiedSession & { exp: number }
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

export function buildSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production'
  return [`${SESSION_COOKIE}=${token}`, `Max-Age=${SESSION_MAX_AGE}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', isProd ? 'Secure' : '']
    .filter(Boolean).join('; ')
}

// ── Account + entitlements ─────────────────────────────────────────────────

/** Record/refresh the Hire side of a Levl1 account on Hire login. */
export async function linkHireLogin(email: string, hireUserId: string, hireTenantId: string) {
  return prisma.levlAccount.upsert({
    where: { email },
    update: { hireUserId, hireTenantId, entHire: true },
    create: { email, hireUserId, hireTenantId, entHire: true },
  })
}

/** Record/refresh the Interviews side of a Levl1 account on Interviews login. */
export async function linkInterviewsLogin(email: string, interviewsUserId: string, agencyId: string) {
  return prisma.levlAccount.upsert({
    where: { email },
    update: { interviewsUserId, agencyId, entInterviews: true },
    create: { email, interviewsUserId, agencyId, entInterviews: true },
  })
}

interface LevlAccountRow {
  email: string; hireUserId: string | null; hireTenantId: string | null
  interviewsUserId: string | null; agencyId: string | null
  entHire: boolean; entInterviews: boolean
}

/** Build the unified session payload from an account, gating each context by its entitlement. */
export function unifiedPayloadFor(account: LevlAccountRow, name: string): UnifiedSession {
  return {
    email: account.email,
    name,
    ...(account.entInterviews && account.interviewsUserId && account.agencyId
      ? { userId: account.interviewsUserId, agencyId: account.agencyId, role: 'recruiter' }
      : {}),
    ...(account.entHire && account.hireUserId && account.hireTenantId
      ? { hireUserId: account.hireUserId, hireTenantId: account.hireTenantId, hireRole: 'recruiter' }
      : {}),
    ent: { hire: account.entHire, interviews: account.entInterviews },
  }
}
