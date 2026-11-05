import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { sendEmail } from '@/lib/emailService'
import { createOtp, verifyOtp, OTP_TTL_MINUTES } from '@/lib/screen/auth/otp'

export const dynamic = 'force-dynamic'

// POST { action: 'send' }            — email a one-time code to YOUR sign-in email
// POST { action: 'verify', code }    — confirm it (proves you still control the inbox)
// Screen auth is email + one-time code; there is no password to reset.
export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true, name: true } })
  if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  const body = await req.json().catch(() => ({})) as { action?: unknown; code?: unknown }

  if (body.action === 'verify') {
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!code) return NextResponse.json({ error: 'Enter the code from your email.' }, { status: 400 })
    const v = await verifyOtp(user.email, code)
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status })
    const at = new Date()
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, emailReverifiedAt: at } })
    return NextResponse.json({ ok: true, reverifiedAt: at.toISOString() })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const r = await createOtp(user.email, ip)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  await sendEmail({
    to: user.email,
    subject: `Your Screen verification code: ${r.code}`,
    html: `<div style="font-family:Inter,system-ui,sans-serif;font-size:14px;color:#18181B;line-height:1.6">
      <p>Hi ${(user.name?.split(' ')[0] ?? 'there').replace(/[<>&]/g, '')},</p>
      <p>Use this code to confirm your sign-in email in Screen settings:</p>
      <p style="font-size:28px;font-weight:600;letter-spacing:6px;color:#4F46E5;margin:8px 0">${r.code}</p>
      <p style="color:#71717A">It expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
    </div>`,
  }).catch((e) => console.error('[account/reverify] email failed:', e instanceof Error ? e.message : e))
  return NextResponse.json({ ok: true, sentTo: user.email })
}
