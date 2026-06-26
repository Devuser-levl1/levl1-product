import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email?.trim()) return NextResponse.json({ success: true }) // silent

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

    // Always return success — never reveal whether email exists
    if (!user) return NextResponse.json({ success: true })

    const resetToken  = crypto.randomBytes(32).toString('hex')
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data:  { resetPasswordToken: resetToken, resetPasswordExpiry: resetExpiry },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
    const resetUrl = `${appUrl}/reset-password/${resetToken}`

    if (process.env.RESEND_API_KEY) {
      await sendEmail({
        to:      email,
        subject: 'Reset your Levl1 password',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 20px rgba(79,70,229,0.08)">
  <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 32px">
    <div style="font-size:20px;font-weight:800;color:#fff">Levl1 · Password Reset</div>
  </div>
  <div style="padding:32px">
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px">
      Hi${user.name ? ' ' + user.name.split(' ')[0] : ''},<br><br>
      Someone requested a password reset for your Levl1 account. Click the button below to set a new password.
    </p>
    <a href="${resetUrl}" style="display:block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-align:center;padding:13px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:20px">
      Reset Password &rarr;
    </a>
    <p style="font-size:12px;color:#94A3B8;margin:0">This link expires in 1 hour. If you didn&apos;t request this, you can safely ignore this email.</p>
  </div>
</div></body></html>`,
      }).catch(err => console.error('[forgot-password] email failed:', err))
    } else {
      console.log('[forgot-password] RESEND not configured — reset URL:', resetUrl)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed'
    console.error('[forgot-password] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
