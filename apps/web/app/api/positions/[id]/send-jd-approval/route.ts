import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { sendEmail } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const position = await prisma.position.findUnique({ where: { id: params.id } })
    if (!position) return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    if (!position.clientManagerEmail) {
      return NextResponse.json({ error: 'No client manager email configured for this position' }, { status: 400 })
    }
    if (!position.jdText) {
      return NextResponse.json({ error: 'No JD text found for this position' }, { status: 400 })
    }

    const agency  = await prisma.agency.findUnique({ where: { id: session.agencyId } })
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Delete existing pending JD token for this position
    await prisma.approvalToken.deleteMany({
      where: { positionId: position.id, type: 'client_jd', status: 'pending' },
    })

    const jdToken = await prisma.approvalToken.create({
      data: {
        positionId: position.id,
        type:       'client_jd',
        email:      position.clientManagerEmail,
        expiresAt:  expires,
      },
    })

    if (process.env.RESEND_API_KEY) {
      await sendEmail({
        to:      position.clientManagerEmail,
        from:    agency?.senderEmail ? `${agency.senderName ?? agency.name} via Levl1 <${agency.senderEmail}>` : undefined,
        subject: `JD Review Required — ${position.title}`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden">
  <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 32px">
    <div style="font-size:22px;font-weight:800;color:#fff">Job Description Review</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">${agency?.name ?? 'Your recruitment partner'} via Levl1</div>
  </div>
  <div style="padding:32px">
    <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#1E293B">Please review the JD for ${position.title}</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 24px">
      Before we begin scheduling AI-powered interviews for <strong>${position.title}</strong>,
      we need your sign-off on the job description.
    </p>
    <a href="${appUrl}/approve/jd/${jdToken.token}" style="display:block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-align:center;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
      Review &amp; Approve JD &rarr;
    </a>
    <p style="font-size:12px;color:#94A3B8;margin-top:20px">This link expires in 7 days. No login required.</p>
  </div>
</div>
</body>
</html>`,
      }).catch(err => console.error('[send-jd-approval] email failed:', err))
    }

    return NextResponse.json({
      success: true,
      emailSent: !!process.env.RESEND_API_KEY,
      tokenId: jdToken.id,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send JD approval'
    console.error('[send-jd-approval] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
