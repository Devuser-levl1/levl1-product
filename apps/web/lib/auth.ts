import crypto from 'crypto'

const JWT_SECRET =
  process.env.JWT_SECRET ?? 'levl1-dev-secret-change-in-production-please'

export interface SessionPayload {
  userId:   string
  agencyId: string
  email:    string
  role:     string
  name:     string
}

/* ── JWT (HS256, pure crypto — no external dep) ─────────────────── */

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}
function fromb64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

export function signJWT(payload: SessionPayload): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body   = b64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
    })
  )
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url')
  return `${header}.${body}.${sig}`
}

export function verifyJWT(token: string): (SessionPayload & { exp: number }) | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expected = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url')
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url'))) {
      return null
    }
    const payload = JSON.parse(fromb64url(body)) as SessionPayload & { exp: number }
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

/* ── Cookie helpers ─────────────────────────────────────────────── */

export const SESSION_COOKIE = 'levl1_session'
export const SESSION_MAX_AGE = 7 * 24 * 3600 // 7 days in seconds

/** Build the Set-Cookie header value for the session token */
export function buildSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production'
  return [
    `${SESSION_COOKIE}=${token}`,
    `Max-Age=${SESSION_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isProd ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

/** Build a cookie that immediately clears the session */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`
}

/** Extract the session token from a Cookie header string */
export function getTokenFromHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
  return match ? match[1] : null
}

/** Verify the session from the request's Cookie header */
export function getSessionFromRequest(req: Request): SessionPayload | null {
  const cookieHeader = req.headers.get('cookie')
  const token = getTokenFromHeader(cookieHeader)
  if (!token) return null
  const payload = verifyJWT(token)
  if (!payload) return null
  // Levl1 SSO entitlement gate: a unified token carries `ent`. Block Interviews
  // access when the account isn't entitled to Interviews (and require an agency
  // context). Legacy tokens (no `ent`) are unaffected.
  const ent = (payload as unknown as { ent?: { interviews?: boolean } }).ent
  if (ent && ent.interviews === false) return null
  if (!payload.agencyId) return null
  return payload
}
