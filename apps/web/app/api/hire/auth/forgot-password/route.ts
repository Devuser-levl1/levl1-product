import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signPurposeToken } from '@/lib/hire/auth'
import { sendHireEmail } from '@/lib/hire/email'

export const dynamic = 'force-dynamic'

// Build the reset-link base from the ACTUAL serving host (behind Render's proxy
// that's x-forwarded-*), so the link always points at wherever the app runs —
// not a possibly-wrong NEXT_PUBLIC_APP_URL. Falls back to the env / levl1.io.
function baseUrl(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (host) return `${proto}://${host}`
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
}

// POST { email } — start a Hire password reset. Response is always a generic
// success (no account enumeration), but we ALWAYS attempt the send for a real
// user and LOG the result — never a silent no-op. Sends via the Resend HTTP API
// (lib/emailService), not SMTP.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({}))
    const addr = String(email ?? '').trim().toLowerCase()
    if (!addr) return NextResponse.json({ success: true })

    // Works for a user WITHOUT a password yet — they can set an initial one here.
    const user = await prisma.hireUser.findFirst({ where: { email: addr }, include: { tenant: true }, orderBy: { createdAt: 'asc' } })
    if (!user) {
      console.log('[hire/forgot-password] no account for %s — nothing sent (no enumeration)', addr)
      return NextResponse.json({ success: true })
    }

    const token = signPurposeToken({ userId: user.id, tenantId: user.tenantId, purpose: 'password_reset' }, 60 * 60)
    const resetUrl = `${baseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`
    const firstName = user.name ? user.name.split(' ')[0] : ''
    const hasPassword = !!user.passwordHash
    const heading = hasPassword ? 'Reset your password' : 'Set your password'
    const intro = hasPassword
      ? `we received a request to reset your HirePilot password. Click below to set a new one.`
      : `set a password for your HirePilot account to sign in. Click below to choose one.`

    if (!process.env.RESEND_API_KEY) {
      // A real misconfiguration for a valid user — make it LOUD, not a silent no-op.
      console.error('[hire/forgot-password] RESEND_API_KEY not configured — cannot email %s. Reset URL:', user.email, resetUrl)
      return NextResponse.json({ success: true })
    }

    // Actually send + log the outcome (success id or the error) for a valid user.
    try {
      const { id } = await sendHireEmail({
        to: user.email,
        subject: `${heading} — ${user.tenant?.name ?? 'HirePilot'}`,
        html: `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
  <div style="max-width:480px;margin:24px auto;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#6D28D9,#7C3AED);padding:24px 28px;color:#fff;font-size:18px;font-weight:800">${heading}</div>
    <div style="padding:28px">
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 18px">Hi${firstName ? ' ' + firstName : ''}, ${intro}</p>
      <a href="${resetUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#6D28D9,#7C3AED);color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:18px">${heading} →</a>
      <p style="font-size:12px;color:#94A3B8;margin:0">This link expires in 1 hour. If you didn&apos;t request it, you can safely ignore this email.</p>
    </div>
  </div></body></html>`,
      })
      console.log('[hire/forgot-password] reset email SENT to %s (resend id=%s, hasPassword=%s)', user.email, id ?? 'n/a', hasPassword)
    } catch (e) {
      console.error('[hire/forgot-password] SEND FAILED for %s: %s', user.email, e instanceof Error ? e.message : e)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[hire/forgot-password] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: true }) // never leak
  }
}
