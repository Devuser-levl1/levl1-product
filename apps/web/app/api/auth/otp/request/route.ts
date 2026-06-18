import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'
import { normalizeEmail, businessEmailError } from '@/lib/screen/auth/email'
import { createOtp, OTP_TTL_MINUTES } from '@/lib/screen/auth/otp'

export const dynamic = 'force-dynamic'

// POST { email } — issue an email login code (replaces password login).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = normalizeEmail(body.email)
    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

    // Business-email-only — enforced on the OTP request path too.
    const emailErr = businessEmailError(email)
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } })

    // Always create + send only for real accounts, but respond identically
    // either way so we don't leak which emails are registered.
    if (user) {
      const result = await createOtp(email, ip)
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
      await sendEmail({
        to: email,
        subject: `Your Levl1 login code: ${result.code}`,
        html: `<div style="font-family:Inter,system-ui,sans-serif;font-size:14px;color:#0F172A;line-height:1.6">
          <p>Hi ${user.name?.split(' ')[0] ?? 'there'},</p>
          <p>Your Levl1 login code is:</p>
          <p style="font-size:28px;font-weight:800;letter-spacing:6px;color:#4F46E5;margin:8px 0">${result.code}</p>
          <p style="color:#64748B">It expires in ${OTP_TTL_MINUTES} minutes and can be used once. If you didn't request this, you can ignore this email.</p>
        </div>`,
      }).catch((e) => console.error('[auth/otp/request] email send failed:', e instanceof Error ? e.message : e))
    } else {
      console.log('[auth/otp/request] no account for %s — silent no-op', email)
    }

    return NextResponse.json({ ok: true, message: 'If that account exists, a code has been sent.' })
  } catch (err) {
    console.error('[auth/otp/request] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not send a code — please try again.' }, { status: 500 })
  }
}
