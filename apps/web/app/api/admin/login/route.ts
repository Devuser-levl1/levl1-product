import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    const secret = process.env.ADMIN_SECRET_TOKEN

    if (!secret) {
      return NextResponse.json({ error: 'Admin access is not configured' }, { status: 500 })
    }
    if (!token || token !== secret) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(ADMIN_COOKIE, secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
