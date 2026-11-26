import { prisma } from '@/lib/prisma'
import { sendEmail, agencyFromAddress } from '@/lib/emailService'
import { sendWhatsAppInvite, sendWhatsAppText } from '@/lib/whatsappService'
import { buildInviteEmail } from '@/lib/screen/recruiter/invite-email'
import { generateAvailableSlots, formatSlotLabel } from '@/lib/slots'
import { effectiveInterviewMinutes } from '@/lib/screen/session/duration'
import type { Agency, Candidate, Position } from '@prisma/client'

// ── Candidate notifications for recovery flows (Screen-scoped) ─────────────
// Same channels as the original invite: email (Resend, recruiter template) and
// WhatsApp when the candidate has a phone number. Never throws — a failed send
// is reported back so the recruiter sees it.

type Ctx = { interviewId: string; candidate: Candidate; position: Position; agency: Agency; links: { schedulingUrl: string; joinUrl: string } }

export interface SendResult { email: 'sent' | 'skipped' | 'failed'; whatsapp: 'sent' | 'skipped' | 'failed' }

/** Persist the 5 offered slots so a WhatsApp numeric reply resolves (same as send-invite). */
async function offerWhatsAppSlots(c: Ctx) {
  const slotDates = generateAvailableSlots(5)
  const duration = effectiveInterviewMinutes(c.position)
  await prisma.interviewSlot.deleteMany({ where: { candidateId: c.candidate.id, isBooked: false } }).catch(() => {})
  await prisma.interviewSlot.createMany({
    data: slotDates.map((start) => ({ positionId: c.position.id, candidateId: c.candidate.id, startTime: start, endTime: new Date(start.getTime() + duration * 60_000), duration })),
  }).catch(() => {})
  return slotDates.map((d) => ({ label: formatSlotLabel(d), value: d.toISOString() }))
}

/** Resend: the recruiter's normal invite (template), with the new link. */
export async function sendResentInvite(c: Ctx & { inviteKey: string }): Promise<SendResult> {
  const out: SendResult = { email: 'skipped', whatsapp: 'skipped' }
  if (process.env.RESEND_API_KEY) {
    try {
      const mail = buildInviteEmail({ interviewId: c.interviewId, candidateName: c.candidate.name, position: c.position, agency: c.agency, inviteKey: c.inviteKey })
      await sendEmail({ to: c.candidate.email, subject: mail.subject, html: mail.html, from: agencyFromAddress(c.agency) })
      out.email = 'sent'
    } catch (e) { out.email = 'failed'; console.error('[recovery] resend email failed:', e instanceof Error ? e.message : e) }
  }
  if (c.candidate.phone) {
    try {
      await sendWhatsAppInvite({
        candidateName: c.candidate.name, candidatePhone: c.candidate.phone, positionTitle: c.position.title, company: c.position.company,
        agencyName: c.agency.senderName ?? c.agency.name, availableSlots: await offerWhatsAppSlots(c), schedulingUrl: c.links.schedulingUrl,
      })
      out.whatsapp = 'sent'
    } catch (e) { out.whatsapp = 'failed'; console.error('[recovery] resend WhatsApp failed:', e instanceof Error ? e.message : e) }
  }
  return out
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string))

/** Retake: a short, plain note that a fresh attempt is ready. Not an outcome. */
export async function sendRetakeInvite(c: Ctx): Promise<SendResult> {
  const out: SendResult = { email: 'skipped', whatsapp: 'skipped' }
  const agencyName = c.agency.senderName ?? c.agency.name
  const first = c.candidate.name.trim().split(/\s+/)[0] || 'there'
  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmail({
        to: c.candidate.email,
        from: agencyFromAddress(c.agency),
        subject: `A new link for your interview — ${c.position.title}`,
        html: `<!DOCTYPE html><html><body style="margin:0;background:#FBFAF7;font-family:Inter,system-ui,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#fff;border:1px solid #E7E4DE;border-radius:8px;padding:28px">
  <p style="font-size:14px;color:#111114;line-height:1.6;margin:0 0 14px">Hi ${esc(first)},</p>
  <p style="font-size:14px;color:#3F3F46;line-height:1.6;margin:0 0 14px">Your interview for <strong>${esc(c.position.title)}</strong> at ${esc(c.position.company)} didn't finish, so ${esc(agencyName)} has set up a fresh attempt for you. Your earlier answers won't count against you; this new attempt is the one that's reviewed.</p>
  <p style="font-size:14px;color:#3F3F46;line-height:1.6;margin:0 0 20px">Pick a time that suits you (or start straight away). Use a laptop with a stable connection and a working microphone.</p>
  <a href="${c.links.schedulingUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Open your interview</a>
  <p style="font-size:12px;color:#71717A;margin-top:18px">Earlier links for this interview no longer work.</p>
</div></body></html>`,
      })
      out.email = 'sent'
    } catch (e) { out.email = 'failed'; console.error('[recovery] retake email failed:', e instanceof Error ? e.message : e) }
  }
  if (c.candidate.phone) {
    const r = await sendWhatsAppText(c.candidate.phone, `Hi ${first}, your interview for *${c.position.title}* at *${c.position.company}* didn't finish, so ${agencyName} has set up a fresh attempt. Your earlier answers won't count against you. Open your new link to pick a time: ${c.links.schedulingUrl}\n\nEarlier links no longer work.`)
    out.whatsapp = r.ok ? 'sent' : r.error?.includes('not configured') ? 'skipped' : 'failed'
  }
  return out
}

/** Reschedule confirmation on WhatsApp (email is sendBookingEmail('reschedule')). */
export async function sendRescheduleWhatsApp(c: { phone: string | null; name: string; positionTitle: string; scheduledAt: Date; joinUrl: string }) {
  if (!c.phone) return
  const when = c.scheduledAt.toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  await sendWhatsAppText(c.phone, `Hi ${c.name.split(' ')[0] || 'there'}, your interview for *${c.positionTitle}* is now on *${when} IST*.\n\nJoin here when it's time: ${c.joinUrl}`)
    .catch(() => {})
}
