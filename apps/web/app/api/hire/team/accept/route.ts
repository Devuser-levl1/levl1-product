import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPurposeToken, hashPassword, signHireToken, HIRE_COOKIE, HIRE_COOKIE_MAX_AGE } from '@/lib/hire/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json()
    if (!token || !password || String(password).length < 8) {
      return NextResponse.json({ error: 'Token and an 8+ character password are required' }, { status: 400 })
    }
    const claims = verifyPurposeToken(String(token))
    if (!claims || claims.purpose !== 'invite' || !claims.userId || !claims.tenantId) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 })
    }

    const user = await prisma.hireUser.findFirst({ where: { id: claims.userId, tenantId: claims.tenantId } })
    if (!user) return NextResponse.json({ error: 'Invite no longer valid' }, { status: 404 })

    const passwordHash = await hashPassword(String(password))
    const updated = await prisma.hireUser.update({
      where: { id: user.id },
      data: { passwordHash, ...(name ? { name: String(name) } : {}), lastLoginAt: new Date() },
    })

    const jwt = signHireToken({ userId: updated.id, tenantId: updated.tenantId, role: updated.role })
    const res = NextResponse.json({ ok: true, user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role } })
    res.cookies.set(HIRE_COOKIE, jwt, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: HIRE_COOKIE_MAX_AGE,
    })
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to accept invite'
    console.error('[hire/team/accept] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
