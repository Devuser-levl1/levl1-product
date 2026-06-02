import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { sendEmail } from '@/lib/emailService'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { members } = await req.json()
    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'members array required' }, { status: 400 })
    }

    const agency = await prisma.agency.findUnique({ where: { id: session.agencyId } })
    if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    const results = []

    for (const m of members) {
      if (!m.email?.trim()) continue

      const inviteToken = crypto.randomBytes(32).toString('hex')

      const member = await prisma.teamMember.upsert({
        where: { inviteToken },
        create: {
          agencyId:    session.agencyId,
          name:        m.name?.trim() || m.email,
          email:       m.email.trim(),
          role:        m.role ?? 'recruiter',
          status:      'invited',
          inviteToken,
        },
        update: {
          name:   m.name?.trim() || m.email,
          role:   m.role ?? 'recruiter',
          status: 'invited',
        },
      })

      // Send invite email
      if (process.env.RESEND_API_KEY) {
        await sendEmail({
          to: m.email,
          subject: `You've been invited to join ${agency.name} on Levl1`,
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden">
  <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 32px">
    <div style="font-size:22px;font-weight:800;color:#fff">Levl1</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">AI Interview Platform</div>
  </div>
  <div style="padding:32px">
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1E293B">You&apos;ve been invited!</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 24px">
      <strong>${session.name}</strong> has invited you to join <strong>${agency.name}</strong> on Levl1 as a <strong>${m.role ?? 'Recruiter'}</strong>.
    </p>
    <a href="${appUrl}/accept-invite/${inviteToken}" style="display:block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-align:center;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
      Accept Invitation &rarr;
    </a>
    <p style="font-size:12px;color:#94A3B8;margin-top:20px">This link expires in 7 days. If you did not expect this email, you can safely ignore it.</p>
  </div>
</div>
</body>
</html>`,
        }).catch(err => console.error('[invite-team] email failed:', err))
      }

      results.push({ id: member.id, email: m.email, status: 'invited' })
    }

    return NextResponse.json({ success: true, invited: results.length, results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to invite team'
    console.error('[agency/invite-team] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
