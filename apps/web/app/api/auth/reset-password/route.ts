import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signJWT, buildSessionCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken:  token,
        resetPasswordExpiry: { gt: new Date() },
      },
      include: { agency: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset link. Please request a new one.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: user.id },
      data:  { passwordHash, resetPasswordToken: null, resetPasswordExpiry: null },
    })

    // Auto-login after successful reset
    const jwtToken = signJWT({
      userId:   user.id,
      agencyId: user.agencyId,
      email:    user.email,
      role:     user.role,
      name:     user.name,
    })

    const res = NextResponse.json({ success: true })
    res.headers.set('Set-Cookie', buildSessionCookie(jwtToken))
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed'
    console.error('[reset-password] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
