import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { interviewId: string } }) {
  try {
    const { selectedSlot } = await req.json()
    if (!selectedSlot) return NextResponse.json({ error: 'selectedSlot required' }, { status: 400 })

    const scheduledAt = new Date(selectedSlot)
    if (isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: 'Invalid slot date' }, { status: 400 })
    }

    const interview = await prisma.interview.findUnique({
      where: { id: params.interviewId },
      include: {
        candidate: true,
        position:  { include: { agency: true } },
      },
    })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    if (interview.status === 'completed') {
      return NextResponse.json({ error: 'This interview has already been completed' }, { status: 409 })
    }

    // Update interview + candidate
    await prisma.interview.update({
      where: { id: params.interviewId },
      data:  { scheduledAt, status: 'scheduled' },
    })
    await prisma.candidate.update({
      where: { id: interview.candidateId },
      data:  { status: 'scheduled', scheduledAt },
    })

    const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    const joinUrl    = `${appUrl}/interview/${params.interviewId}`
    const dateStr    = scheduledAt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short',
    }) + ' IST'

    // Send confirmation email
    if (process.env.RESEND_API_KEY) {
      const agency = interview.position.agency
      await sendEmail({
        to:      interview.candidate.email,
        subject: `Interview Confirmed — ${interview.position.title} on ${scheduledAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}`,
        from:    agency?.senderEmail
          ? `${agency.senderName ?? agency.name} <${agency.senderEmail}>`
          : undefined,
        html: confirmationEmailHtml({
          candidateName: interview.candidate.name,
          positionTitle: interview.position.title,
          company:       interview.position.company,
          agencyName:    agency?.name ?? 'Your recruiter',
          dateStr,
          duration:      interview.duration,
          joinUrl,
        }),
      }).catch(err => console.error('[schedule/confirm] email failed:', err))
    }

    // Schedule reminder emails (DB records — a cron job would send these)
    const minus24h  = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
    const minus15m  = new Date(scheduledAt.getTime() - 15 * 60 * 1000)
    await prisma.scheduledEmail.createMany({
      data: [
        { to: interview.candidate.email, subject: `Reminder: Interview tomorrow — ${interview.position.title}`, type: '24hr_reminder', scheduledAt: minus24h, candidateId: interview.candidateId, agencyId: interview.position.agencyId ?? '', metadata: { joinUrl, dateStr } },
        { to: interview.candidate.email, subject: `Your interview starts in 15 minutes — ${interview.position.title}`, type: '15min_reminder', scheduledAt: minus15m, candidateId: interview.candidateId, agencyId: interview.position.agencyId ?? '', metadata: { joinUrl, dateStr } },
      ],
    }).catch(() => {}) // non-critical

    return NextResponse.json({
      success:     true,
      scheduledAt: scheduledAt.toISOString(),
      joinUrl,
      dateStr,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to confirm slot'
    console.error('[schedule/confirm] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function confirmationEmailHtml(opts: {
  candidateName: string
  positionTitle:  string
  company:        string
  agencyName:     string
  dateStr:        string
  duration:       number
  joinUrl:        string
}) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 20px rgba(16,185,129,0.08)">
  <div style="background:linear-gradient(135deg,#10B981,#059669);padding:32px">
    <div style="font-size:28px;margin-bottom:8px">✓</div>
    <div style="font-size:20px;font-weight:800;color:#fff">Interview Confirmed!</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px">${opts.agencyName} via Levl1</div>
  </div>
  <div style="padding:32px">
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px">
      Hi ${opts.candidateName},<br>Your interview has been confirmed.
    </p>
    <div style="background:#F0FDF4;border:1px solid #A7F3D0;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <div style="font-size:15px;font-weight:700;color:#065F46">${opts.positionTitle} at ${opts.company}</div>
      <div style="font-size:14px;color:#047857;margin-top:6px">📅 ${opts.dateStr}</div>
      <div style="font-size:13px;color:#065F46;margin-top:4px">⏱ ${opts.duration} minutes · AI voice interview</div>
    </div>
    <a href="${opts.joinUrl}" style="display:block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-align:center;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
      Join Interview When Ready &rarr;
    </a>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 18px;margin-top:20px">
      <div style="font-size:12px;font-weight:700;color:#94A3B8;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">Before you begin</div>
      <div style="font-size:13px;color:#475569;line-height:1.8">✓ Find a quiet place &nbsp;·&nbsp; ✓ Use headphones &nbsp;·&nbsp; ✓ Laptop/desktop only<br>✓ Stable internet &nbsp;·&nbsp; ✓ Microphone required</div>
    </div>
    <p style="font-size:12px;color:#94A3B8;margin-top:16px">Keep this email — the join link above is your entry to the interview. You will also receive a reminder 24 hours before.</p>
  </div>
</div></body></html>`
}
