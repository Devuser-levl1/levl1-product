import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest, clearSessionCookie } from '@/lib/auth'
import { linkInterviewsLogin, unifiedPayloadFor, signLevlSession, buildSessionCookie } from '@/lib/levl-sso'
import { noteUserChange } from '@/lib/screen/auth/session-guard'

export const dynamic = 'force-dynamic'

// POST { scope: 'others' | 'all' } — session management (Screen).
//   others: every session issued before now stops working; THIS device gets a
//           fresh session (minted exactly like the OTP login does).
//   all:    every session including this one is signed out.
// Sessions are stateless tokens, so this works by a per-user cut-off time
// (User.sessionsValidAfter) checked by the Screen session guard — the shared
// token format is unchanged.
export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { scope?: unknown }
  const scope = body.scope === 'all' ? 'all' : 'others'

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true, name: true, agencyId: true } })
  if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

  // Second resolution (JWT iat is in seconds): tokens with iat < cutoff are rejected.
  const cutoff = new Date(Math.floor(Date.now() / 1000) * 1000)
  await prisma.user.update({ where: { id: user.id }, data: { sessionsValidAfter: cutoff } })
  noteUserChange(user.id, { validAfter: cutoff })

  if (scope === 'all') {
    const res = NextResponse.json({ ok: true, scope })
    res.headers.set('Set-Cookie', clearSessionCookie())
    return res
  }
  const account = await linkInterviewsLogin(user.email, user.id, user.agencyId)
  const token = signLevlSession(await unifiedPayloadFor(account, user.name))
  const res = NextResponse.json({ ok: true, scope })
  res.headers.set('Set-Cookie', buildSessionCookie(token))
  return res
}
