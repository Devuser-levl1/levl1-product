import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signPurposeToken } from '@/lib/hire/auth'
import { sendHireEmail } from '@/lib/hire/email'

export const dynamic = 'force-dynamic'

// POST { email } — start a Hire password reset. Always returns success (never
// reveals whether an account exists). If the email maps to a HireUser we email
// a signed, 1-hour reset link to /reset-password?token=…
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({}))
    const addr = String(email ?? '').trim().toLowerCase()
    if (!addr) return NextResponse.json({ success: true })

    const user = await prisma.hireUser.findFirst({ where: { email: addr }, include: { tenant: true }, orderBy: { createdAt: 'asc' } })
    if (!user) return NextResponse.json({ success: true }) // silent — no user enumeration

    const token = signPurposeToken({ userId: user.id, tenantId: user.tenantId, purpose: 'password_reset' }, 60 * 60)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`
    const firstName = user.name ? user.name.split(' ')[0] : ''

    await sendHireEmail({
      to: user.email,
      subject: `Reset your ${user.tenant?.name ?? 'Levl1 Hire'} password`,
      html: `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
  <div style="max-width:480px;margin:24px auto;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#6D28D9,#7C3AED);padding:24px 28px;color:#fff;font-size:18px;font-weight:800">Password reset</div>
    <div style="padding:28px">
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 18px">Hi${firstName ? ' ' + firstName : ''}, we received a request to reset your Levl1 Hire password. Click below to set a new one.</p>
      <a href="${resetUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#6D28D9,#7C3AED);color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:18px">Reset password →</a>
      <p style="font-size:12px;color:#94A3B8;margin:0">This link expires in 1 hour. If you didn&apos;t request it, you can safely ignore this email.</p>
    </div>
  </div></body></html>`,
    }).catch((e) => console.error('[hire/forgot-password] email failed:', e))

    if (!process.env.RESEND_API_KEY) console.log('[hire/forgot-password] RESEND not configured — reset URL:', resetUrl)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[hire/forgot-password] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: true }) // never leak
  }
}
