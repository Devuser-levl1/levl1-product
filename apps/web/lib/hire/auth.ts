import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const JWT_SECRET =
  process.env.JWT_SECRET ?? 'levl1-dev-secret-change-in-production-please'

export const HIRE_COOKIE = 'hire_token'
export const HIRE_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

export interface HireTokenClaims {
  userId: string
  tenantId: string
  role: string
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

/** Sign a Hire access token (HS256/base64url — matches tenant-middleware). */
export function signHireToken(claims: HireTokenClaims): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(
    JSON.stringify({
      ...claims,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + HIRE_COOKIE_MAX_AGE,
    }),
  )
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

/** Sign a short-lived purpose token (e.g. team invites). */
export function signPurposeToken(payload: Record<string, string>, ttlSeconds = 7 * 24 * 60 * 60): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  )
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

export function verifyPurposeToken(token: string): Record<string, string> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<string, string> & { exp?: number }
  if (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) return null
  return payload
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
