import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signJWT, buildSessionCookie } from '@/lib/auth'
import { normalizeEmail, businessEmailError } from '@/lib/screen/auth/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agencyName, name, phone } = body
    const email = normalizeEmail(body.email)  // normalize → kills duplicate-by-case

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
          role:     'admin',
          agencyId: agency.id,
          phone,
        },
      })

      return { agency, user }
    })

    const token = signJWT({
      userId:   user.id,
      agencyId: agency.id,
      email:    user.email,
      role:     user.role,
      name:     user.name,
    })

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
