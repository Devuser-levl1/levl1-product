import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { sendEmail, agencyFromAddress } from '@/lib/emailService'

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

    const agency  = await prisma.agency.findUnique({ where: { id: session.agencyId } })
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Delete existing pending rubric token
    await prisma.approvalToken.deleteMany({
      where: { positionId: position.id, type: 'client_rubric', status: 'pending' },
    })

    const rubricToken = await prisma.approvalToken.create({
      data: {
        positionId: position.id,
        type:       'client_rubric',
        email:      position.clientManagerEmail,
        expiresAt:  expires,
      },
    })

    const rubric = (position.scoringRubric as { technical?: number; problemSolving?: number; behavioral?: number; eq?: number } | null) ?? {
      technical: 40, problemSolving: 30, behavioral: 20, eq: 10,
    }

    if (process.env.RESEND_API_KEY) {
      await sendEmail({
        to:      position.clientManagerEmail,
        from:    agency ? agencyFromAddress(agency) : undefined,
        subject: `Scoring Rubric Approval — ${position.title}`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden">
  <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 32px">
    <div style="font-size:22px;font-weight:800;color:#fff">Interview Scoring Rubric</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">${agency?.name ?? 'Your recruitment partner'} via Levl1</div>
  </div>
  <div style="padding:32px">
    <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#1E293B">Scoring Rubric for Your Approval</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 24px">
      Please review and approve the scoring criteria for <strong>${position.title}</strong> interviews
      before we begin scheduling candidates.
    </p>
    <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#4F46E5">Proposed Scoring Breakdown</h3>
    <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
      <tr style="background:#F8FAFC">
        <td style="padding:10px 14px;border:1px solid #E2E8F0;font-size:14px;color:#475569">Technical Depth</td>
        <td style="padding:10px 14px;border:1px solid #E2E8F0;font-size:16px;font-weight:800;color:#4F46E5;text-align:right">${rubric.technical ?? 40}%</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;border:1px solid #E2E8F0;font-size:14px;color:#475569">Problem Solving</td>
        <td style="padding:10px 14px;border:1px solid #E2E8F0;font-size:16px;font-weight:800;color:#4F46E5;text-align:right">${rubric.problemSolving ?? 30}%</td>
      </tr>
      <tr style="background:#F8FAFC">
        <td style="padding:10px 14px;border:1px solid #E2E8F0;font-size:14px;color:#475569">Behavioral / STAR</td>
        <td style="padding:10px 14px;border:1px solid #E2E8F0;font-size:16px;font-weight:800;color:#4F46E5;text-align:right">${rubric.behavioral ?? 20}%</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;border:1px solid #E2E8F0;font-size:14px;color:#475569">EQ &amp; Soft Skills</td>
        <td style="padding:10px 14px;border:1px solid #E2E8F0;font-size:16px;font-weight:800;color:#4F46E5;text-align:right">${rubric.eq ?? 10}%</td>
      </tr>
      <tr style="background:#EEF2FF">
        <td style="padding:10px 14px;border:1px solid #CBD5E1;font-size:14px;font-weight:700;color:#1E293B">Total</td>
        <td style="padding:10px 14px;border:1px solid #CBD5E1;font-size:16px;font-weight:800;color:#4F46E5;text-align:right">100%</td>
      </tr>
    </table>
    <div style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:14px;color:#065F46">
      <strong>L2 Submission Threshold:</strong> Candidates scoring ${position.l2ScoreThreshold ?? 75}+ will be recommended for L2 interviews.
    </div>
    <a href="${appUrl}/approve/rubric/${rubricToken.token}" style="display:block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-align:center;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
      Review &amp; Approve Scoring &rarr;
    </a>
    <p style="font-size:12px;color:#94A3B8;margin-top:20px">This link expires in 7 days. No login required.</p>
  </div>
</div>
</body>
</html>`,
      }).catch(err => console.error('[send-rubric-approval] email failed:', err))
    }

    return NextResponse.json({
      success: true,
      emailSent: !!process.env.RESEND_API_KEY,
      tokenId: rubricToken.id,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send rubric approval'
    console.error('[send-rubric-approval] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
