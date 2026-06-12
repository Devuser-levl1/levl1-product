import { NextResponse } from 'next/server'
import { HIRE_COOKIE } from '@/lib/hire/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(HIRE_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
