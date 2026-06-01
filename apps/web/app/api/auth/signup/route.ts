import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signJWT, buildSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { agencyName, name, email, password, phone } = await req.json()

    if (!agencyName || !name || !email || !password) {
      return NextResponse.json({ error: 'All required fields must be filled.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const passwordHash  = await bcrypt.hash(password, 12)
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
          passwordHash,
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
