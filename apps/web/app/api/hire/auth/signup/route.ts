import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signHireToken, HIRE_COOKIE, HIRE_COOKIE_MAX_AGE } from '@/lib/hire/auth'
import { trialEndDate, emailDomain } from '@/lib/hire/trial-config'

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

    // One trial per business email domain.
    const domain = emailDomain(email)
    if (!domain) return NextResponse.json({ error: 'Enter a valid work email address.' }, { status: 400 })
    const existingDomain = await prisma.hireTenant.findUnique({ where: { trialDomain: domain }, select: { id: true } })
    if (existingDomain) {
      return NextResponse.json({ error: `A HirePilot trial already exists for ${domain}. Ask your admin to invite you, or contact sales to extend.` }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const trialEndsAt = trialEndDate()

    const tenant = await prisma.hireTenant.create({
      data: {
        name: tenantName,
        type: tenantType,
        trialEndsAt,
        trialDomain: domain,
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
    // Unique-constraint race on trialDomain → same friendly one-trial-per-domain message.
    if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A HirePilot trial already exists for this email domain. Ask your admin to invite you, or contact sales.' }, { status: 409 })
    }
    const msg = err instanceof Error ? err.message : 'Signup failed'
    console.error('[hire/signup] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
