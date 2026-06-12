import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, signHireToken, HIRE_COOKIE, HIRE_COOKIE_MAX_AGE } from '@/lib/hire/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await prisma.hireUser.findFirst({
      where: { email },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    await prisma.hireUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    const token = signHireToken({ userId: user.id, tenantId: user.tenantId, role: user.role })
    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { id: user.tenant.id, name: user.tenant.name, type: user.tenant.type, plan: user.tenant.plan, trialEndsAt: user.tenant.trialEndsAt },
    })
    res.cookies.set(HIRE_COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: HIRE_COOKIE_MAX_AGE,
    })
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed'
    console.error('[hire/login] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
