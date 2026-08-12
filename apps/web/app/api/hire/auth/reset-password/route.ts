import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPurposeToken, hashPassword } from '@/lib/hire/auth'
import { logAudit } from '@/lib/hire/audit'

export const dynamic = 'force-dynamic'

// POST { token, newPassword } — complete a Hire password reset. Validates the
// signed reset token server-side, sets the new password, clears nothing else.
export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json().catch(() => ({}))
    const pw = String(newPassword ?? '')
    if (!token) return NextResponse.json({ error: 'Missing reset token.' }, { status: 400 })
    if (pw.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })

    const claims = verifyPurposeToken(String(token))
    if (!claims || claims.purpose !== 'password_reset' || !claims.userId || !claims.tenantId) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired. Please request a new one.' }, { status: 400 })
    }

    const user = await prisma.hireUser.findFirst({ where: { id: claims.userId, tenantId: claims.tenantId } })
    if (!user) return NextResponse.json({ error: 'This reset link is no longer valid.' }, { status: 404 })

    await prisma.hireUser.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(pw) } })
    await logAudit({
      tenantId: user.tenantId, actorUserId: user.id, action: 'password_reset',
      targetType: 'team_member', targetId: user.id, targetName: user.name || user.email,
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[hire/reset-password] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
