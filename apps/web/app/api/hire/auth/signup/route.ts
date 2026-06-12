import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signHireToken, HIRE_COOKIE, HIRE_COOKIE_MAX_AGE } from '@/lib/hire/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const tenantName = String(body.tenantName ?? '').trim()
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const tenantType = body.tenantType === 'CORPORATE' ? 'CORPORATE' : 'AGENCY'

    if (!tenantName || !name || !email || password.length < 8) {
      return NextResponse.json({ error: 'All fields are required; password must be 8+ characters' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const tenant = await prisma.hireTenant.create({
      data: {
        name: tenantName,
        type: tenantType,
        trialEndsAt,
        users: { create: { name, email, passwordHash, role: 'ADMIN' } },
      },
      include: { users: true },
    })
    const user = tenant.users[0]

    const token = signHireToken({ userId: user.id, tenantId: tenant.id, role: user.role })
    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, type: tenant.type, plan: tenant.plan, trialEndsAt: tenant.trialEndsAt },
    }, { status: 201 })
    res.cookies.set(HIRE_COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: HIRE_COOKIE_MAX_AGE,
    })
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signup failed'
    console.error('[hire/signup] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
