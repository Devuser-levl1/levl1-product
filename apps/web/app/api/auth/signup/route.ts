import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { linkInterviewsLogin, unifiedPayloadFor, signLevlSession, buildSessionCookie } from '@/lib/levl-sso'
import { normalizeEmail, businessEmailError } from '@/lib/screen/auth/email'
import { createOtp, verifyOtp, OTP_TTL_MINUTES } from '@/lib/screen/auth/otp'
import { sendEmail } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

// ── Create account: email + one-time code (two steps, same endpoint) ───────
//   1. POST { agencyName, name, email, phone? }        → validates, emails a code
//   2. POST { agencyName, name, email, phone?, code }  → verifies the code, THEN
//      creates the agency + admin user and issues the unified Levl1 session.
// Proving ownership of the work email before the account exists stops anyone
// registering under an address they don't control. Business-email-only and
// normalized-email uniqueness are enforced on both steps.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const agencyName = typeof body.agencyName === 'string' ? body.agencyName.trim().slice(0, 120) : ''
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim().slice(0, 30) : undefined
    const email = normalizeEmail(typeof body.email === 'string' ? body.email : '')  // normalize → kills duplicate-by-case
    const code = typeof body.code === 'string' ? body.code.trim() : ''

    if (!agencyName || !name || !email) {
      return NextResponse.json({ error: 'All required fields must be filled.' }, { status: 400 })
    }
    // Business-email-only — same policy as the OTP/login path.
    const emailErr = businessEmailError(email)
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })

    // App-level uniqueness on the NORMALIZED email (the DB index is also unique).
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Sign in with an email code instead.' }, { status: 409 })
    }

    // ── Step 1: send the verification code ──
    if (!code) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null
      const otp = await createOtp(email, ip)
      if (!otp.ok) return NextResponse.json({ error: otp.error }, { status: otp.status })
      await sendEmail({
        to: email,
        subject: `Your Levl1 verification code: ${otp.code}`,
        html: `<div style="font-family:Inter,system-ui,sans-serif;font-size:14px;color:#0F172A;line-height:1.6">
          <p>Hi ${escapeHtml(name.split(' ')[0] || 'there')},</p>
          <p>Use this code to finish creating your Levl1 account:</p>
          <p style="font-size:28px;font-weight:800;letter-spacing:6px;color:#4F46E5;margin:8px 0">${otp.code}</p>
          <p style="color:#64748B">It expires in ${OTP_TTL_MINUTES} minutes and can be used once. If you didn't try to sign up, you can ignore this email.</p>
        </div>`,
      })
      return NextResponse.json({ ok: true, step: 'verify' })
    }

    // ── Step 2: verify, then create ──
    const v = await verifyOtp(email, code)
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status })

    // Passwords are retired — accounts are passwordless and sign in via email code.
    const trialExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // +14 days

    // Create Agency + User in a transaction
    const { agency, user } = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name:            agencyName,
          plan:            'trial',
          trialStartedAt:  new Date(),
          trialExpiresAt,
          trialLimit:      5,
          interviewsUsed:  0,
          interviewsLimit: 5,
          billingEmail:    email,
        },
      })

      const user = await tx.user.create({
        data: {
          name,
          email,
          role:          'admin',
          agencyId:      agency.id,
          phone,
          emailVerified: true,  // proven by the code above
        },
      })

      return { agency, user }
    })

    // Mint the unified Levl1 SSO session (same path as OTP login) and LINK the
    // account, so a later HirePilot login keeps Screen access in the shared
    // cookie instead of overwriting it with interviews:false.
    const account = await linkInterviewsLogin(user.email, user.id, agency.id)
    const token = signLevlSession(await unifiedPayloadFor(account, user.name))

    const res = NextResponse.json({
      user:   { id: user.id, name: user.name, email: user.email, role: user.role },
      agency: { id: agency.id, name: agency.name, plan: agency.plan },
    })
    res.headers.set('Set-Cookie', buildSessionCookie(token))
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signup failed'
    console.error('[auth/signup] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
