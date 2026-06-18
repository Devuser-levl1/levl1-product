import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// ── Email-OTP login core (Screen-scoped) ───────────────────────────────────
// 6-digit, hashed at rest, short expiry, single-use, rate-limited (per email +
// per IP) and brute-force capped (per-code attempts).

export const OTP_TTL_MINUTES = 10
const MAX_ATTEMPTS = 5                 // verify attempts per code before it's burned
const MAX_REQUESTS_PER_EMAIL_HR = 5    // OTP requests per email per hour
const MAX_REQUESTS_PER_IP_HR = 15      // OTP requests per IP per hour
const RESEND_COOLDOWN_MS = 30_000      // min gap between requests for one email

function hashCode(email: string, code: string): string {
  // Bind the hash to the email so a code can't be replayed against another email.
  return crypto.createHmac('sha256', process.env.JWT_SECRET ?? 'levl1-dev-secret').update(`${email}:${code}`).digest('hex')
}

export type RequestResult = { ok: true; code: string } | { ok: false; status: number; error: string }

// Create + persist a fresh OTP (returns the plaintext code for emailing).
export async function createOtp(email: string, ip: string | null): Promise<RequestResult> {
  const since = new Date(Date.now() - 3600_000)
  const [emailCount, ipCount, lastForEmail] = await Promise.all([
    prisma.loginOtp.count({ where: { email, createdAt: { gte: since } } }),
    ip ? prisma.loginOtp.count({ where: { requestIp: ip, createdAt: { gte: since } } }) : Promise.resolve(0),
    prisma.loginOtp.findFirst({ where: { email }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
  ])
  if (lastForEmail && Date.now() - lastForEmail.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, status: 429, error: 'Please wait a moment before requesting another code.' }
  }
  if (emailCount >= MAX_REQUESTS_PER_EMAIL_HR) return { ok: false, status: 429, error: 'Too many codes requested for this email. Try again later.' }
  if (ipCount >= MAX_REQUESTS_PER_IP_HR) return { ok: false, status: 429, error: 'Too many requests. Try again later.' }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  // Invalidate any outstanding codes for this email (only the newest is valid).
  await prisma.loginOtp.updateMany({ where: { email, consumedAt: null }, data: { consumedAt: new Date() } })
  await prisma.loginOtp.create({ data: { email, codeHash: hashCode(email, code), expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000), requestIp: ip ?? null } })
  return { ok: true, code }
}

export type VerifyResult = { ok: true } | { ok: false; status: number; error: string }

// Verify a submitted code: must be the latest, unconsumed, unexpired, and under
// the attempt cap. Marks it consumed on success (single-use).
export async function verifyOtp(email: string, code: string): Promise<VerifyResult> {
  const otp = await prisma.loginOtp.findFirst({ where: { email, consumedAt: null }, orderBy: { createdAt: 'desc' } })
  if (!otp) return { ok: false, status: 400, error: 'Request a new code.' }
  if (otp.expiresAt < new Date()) return { ok: false, status: 400, error: 'That code has expired — request a new one.' }
  if (otp.attempts >= MAX_ATTEMPTS) {
    await prisma.loginOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }) // burn it
    return { ok: false, status: 429, error: 'Too many incorrect attempts — request a new code.' }
  }
  const submitted = hashCode(email, String(code ?? '').trim())
  const valid = otp.codeHash.length === submitted.length && crypto.timingSafeEqual(Buffer.from(otp.codeHash), Buffer.from(submitted))
  if (!valid) {
    await prisma.loginOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } })
    return { ok: false, status: 401, error: 'Incorrect code.' }
  }
  await prisma.loginOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }) // single-use
  return { ok: true }
}
