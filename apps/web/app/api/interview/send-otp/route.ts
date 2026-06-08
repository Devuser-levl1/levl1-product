import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, agencyFromAddress } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { interviewId } = await req.json()
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: { candidate: true, position: { include: { agency: true } } },
    })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    const email = interview.candidate.email
    if (!email) return NextResponse.json({ error: 'No email on file for this candidate' }, { status: 400 })

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.interviewVerification.upsert({
      where: { interviewId },
      update: { otpCode: code, otpExpiresAt: expiresAt },
      create: { interviewId, otpCode: code, otpExpiresAt: expiresAt },
    })

    if (process.env.RESEND_API_KEY) {
      const agency = interview.position.agency
      await sendEmail({
        to: email,
        from: agency ? agencyFromAddress(agency) : undefined,
        subject: `Your interview verification code: ${code}`,
        html: `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
<div style="max-width:440px;margin:24px auto;border:1px solid #E2E8F0;border-radius:14px;padding:32px;text-align:center">
  <div style="font-size:13px;color:#64748B">${agency?.name ?? 'Your interview'}</div>
  <h2 style="margin:8px 0 4px">Verification code</h2>
  <div style="font-size:34px;font-weight:800;letter-spacing:6px;color:#4F46E5;margin:16px 0">${code}</div>
  <p style="font-size:13px;color:#64748B">Enter this code to verify your identity. It expires in 10 minutes.</p>
</div></body></html>`,
      }).catch((err) => console.error('[send-otp] email failed:', err))
    } else {
      console.log('[send-otp] RESEND_API_KEY not set — OTP for', email, 'is', code)
    }

    // Mask the email in the response
    const [user, domain] = email.split('@')
    const masked = `${user.slice(0, 2)}***@${domain}`
    return NextResponse.json({ sent: true, email: masked, devCode: process.env.RESEND_API_KEY ? undefined : code })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send code'
    console.error('[send-otp] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
