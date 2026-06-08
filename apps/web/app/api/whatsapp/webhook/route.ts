import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppConfirmation } from '@/lib/whatsappService'
import { sendEmail } from '@/lib/emailService'
import { formatSlotLabel } from '@/lib/slots'

export const dynamic = 'force-dynamic'

/** Empty TwiML — Twilio expects a 200 with XML. */
function twiml() {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}

export async function POST(req: NextRequest) {
  try {
    // Twilio posts form-encoded data
    const formData = await req.formData()
    const from = (formData.get('From') as string) ?? ''
    const body = (formData.get('Body') as string) ?? ''

    console.log('[whatsapp/webhook] From:', from, 'Body:', body)

    const digits = from.replace(/\D/g, '')
    const last10 = digits.slice(-10)
    const reply = body.trim()

    if (!last10) return twiml()

    // Find candidate by the last 10 digits of their phone number
    const candidate = await prisma.candidate.findFirst({
      where: { phone: { contains: last10 } },
      include: {
        interview: true,
        position: { include: { agency: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    if (!candidate) {
      console.warn('[whatsapp/webhook] No candidate found for phone:', last10)
      return twiml()
    }

    // Only act on a numeric slot selection (1–5)
    const slotNumber = parseInt(reply, 10)
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 5) {
      console.log('[whatsapp/webhook] Non-slot reply, ignoring:', reply)
      return twiml()
    }

    if (!candidate.interview) {
      console.warn('[whatsapp/webhook] Candidate has no interview record:', candidate.id)
      return twiml()
    }

    // Resolve the exact slot that was offered (persisted at invite time)
    const offered = await prisma.interviewSlot.findMany({
      where: { candidateId: candidate.id, isBooked: false },
      orderBy: { startTime: 'asc' },
      take: 5,
    })
    const selected = offered[slotNumber - 1]
    if (!selected) {
      console.warn('[whatsapp/webhook] No offered slot at index', slotNumber, 'for candidate', candidate.id)
      return twiml()
    }

    const scheduledAt = selected.startTime
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.app'
    const interviewUrl = `${appUrl}/interview/${candidate.interview.id}`
    const dateStr = formatSlotLabel(scheduledAt)

    // Book everything atomically
    await prisma.$transaction([
      prisma.interview.update({
        where: { id: candidate.interview.id },
        data: { scheduledAt, status: 'scheduled' },
      }),
      prisma.candidate.update({
        where: { id: candidate.id },
        data: { status: 'scheduled', scheduledAt },
      }),
      prisma.interviewSlot.update({
        where: { id: selected.id },
        data: { isBooked: true },
      }),
      // Free the other offered slots
      prisma.interviewSlot.deleteMany({
        where: { candidateId: candidate.id, isBooked: false },
      }),
    ])

    // WhatsApp confirmation
    await sendWhatsAppConfirmation({
      candidateName: candidate.name,
      candidatePhone: candidate.phone ?? digits,
      positionTitle: candidate.position.title,
      scheduledAt,
      interviewUrl,
    })

    // Email confirmation (best-effort)
    if (candidate.email && process.env.RESEND_API_KEY) {
      const agency = candidate.position.agency
      await sendEmail({
        to: candidate.email,
        subject: `Interview Confirmed — ${candidate.position.title}`,
        from: agency?.senderEmail
          ? `${agency.senderName ?? agency.name} <${agency.senderEmail}>`
          : undefined,
        html: `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#1E293B">
<h2>Interview Confirmed ✅</h2>
<p>Hi ${candidate.name}, your interview for <strong>${candidate.position.title}</strong> at
<strong>${candidate.position.company}</strong> is confirmed for <strong>${dateStr}</strong>.</p>
<p><a href="${interviewUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Join Interview →</a></p>
<p style="font-size:12px;color:#94A3B8">Find a quiet place and make sure your microphone works.</p>
</body></html>`,
      }).catch((err) => console.error('[whatsapp/webhook] confirmation email failed:', err))
    }

    // Schedule reminder records (a cron job sends these — see /api/cron/send-reminders)
    const minus24h = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
    const minus15m = new Date(scheduledAt.getTime() - 15 * 60 * 1000)
    await prisma.scheduledEmail.createMany({
      data: [
        {
          to: candidate.email ?? '',
          subject: `Reminder: Interview tomorrow — ${candidate.position.title}`,
          type: '24hr_reminder',
          scheduledAt: minus24h,
          candidateId: candidate.id,
          agencyId: candidate.position.agencyId ?? '',
          metadata: { joinUrl: interviewUrl, dateStr },
        },
        {
          to: candidate.email ?? '',
          subject: `Your interview starts in 15 minutes — ${candidate.position.title}`,
          type: '15min_reminder',
          scheduledAt: minus15m,
          candidateId: candidate.id,
          agencyId: candidate.position.agencyId ?? '',
          metadata: { joinUrl: interviewUrl, dateStr },
        },
      ],
    }).catch(() => { /* non-critical */ })

    console.log('[whatsapp/webhook] Slot booked for candidate:', candidate.name, '→', dateStr)
    return twiml()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[whatsapp/webhook] Error:', msg)
    return twiml()
  }
}
