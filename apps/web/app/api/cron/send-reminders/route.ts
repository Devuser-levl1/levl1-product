import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'
import { sendWhatsAppReminder } from '@/lib/whatsappService'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint — sends due interview reminders (email + WhatsApp).
 * Trigger from a scheduled job (e.g. Render Cron) hitting this URL.
 * Optionally protect with CRON_SECRET (header `x-cron-secret` or `?secret=`).
 */
export async function POST(req: NextRequest) {
  return run(req)
}
export async function GET(req: NextRequest) {
  return run(req)
}

async function run(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET
    if (secret) {
      const provided = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
      if (provided !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const now = new Date()
    const due = await prisma.scheduledEmail.findMany({
      where: { status: 'pending', scheduledAt: { lte: now } },
      take: 100,
      orderBy: { scheduledAt: 'asc' },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    let sent = 0
    let failed = 0

    for (const email of due) {
      try {
        const meta = (email.metadata as { joinUrl?: string; dateStr?: string } | null) ?? {}
        const label = email.type === '15min_reminder' ? '15 minutes' : '24 hours'

        const candidate = email.candidateId
          ? await prisma.candidate.findUnique({
              where: { id: email.candidateId },
              include: { interview: true, position: true },
            })
          : null

        const joinUrl = meta.joinUrl
          ?? (candidate?.interview ? `${appUrl}/interview/${candidate.interview.id}` : appUrl)

        // Email reminder
        if (email.to && process.env.RESEND_API_KEY) {
          await sendEmail({
            to: email.to,
            subject: email.subject,
            html: `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#1E293B">
<h2>Interview Reminder</h2>
<p>Hi ${candidate?.name ?? 'there'}, your interview${candidate?.position ? ` for <strong>${candidate.position.title}</strong>` : ''} is in <strong>${label}</strong>${meta.dateStr ? ` (${meta.dateStr})` : ''}.</p>
<p><a href="${joinUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Join Interview →</a></p>
<p style="font-size:12px;color:#94A3B8">Find a quiet place and make sure your microphone works.</p>
</body></html>`,
          }).catch((err) => console.error('[cron/send-reminders] email failed:', err))
        }

        // WhatsApp reminder
        if (candidate?.phone && candidate.interview?.scheduledAt) {
          await sendWhatsAppReminder({
            candidateName: candidate.name,
            candidatePhone: candidate.phone,
            positionTitle: candidate.position?.title ?? 'your interview',
            scheduledAt: candidate.interview.scheduledAt,
            interviewUrl: joinUrl,
            label,
          })
        }

        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: 'sent', sentAt: new Date() },
        })
        sent++
      } catch (err) {
        failed++
        console.error('[cron/send-reminders] Failed for', email.id, err)
        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { status: 'failed' },
        }).catch(() => {})
      }
    }

    console.log(`[cron/send-reminders] processed ${due.length} due · sent ${sent} · failed ${failed}`)
    return NextResponse.json({ processed: due.length, sent, failed })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cron failed'
    console.error('[cron/send-reminders] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
