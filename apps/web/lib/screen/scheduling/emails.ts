import { dispatchNotification, senderFor, NotificationKind } from '@/lib/screen/notifications/notify'
import { buildIcs, icsAttachment } from './ics'
import { SLOT_CONFIG } from './config'
import { formatSlot } from './slots'

// ── Scheduling notification emails (Build I-P0-1) ──────────────────────────
// Builds the .ics + branded HTML for confirm / reschedule / cancel and sends
// through the channel-abstracted notifier (email today, WhatsApp later).

export interface BookingEmailCtx {
  interviewId: string
  candidateName: string
  candidateEmail: string
  positionTitle: string
  company: string
  agencyName: string
  agency?: { name: string } | null
  start: Date
  end: Date
  joinUrl: string
  consentUrl?: string
}

const ACCENT = { confirm: '#10B981', reschedule: '#4F46E5', cancel: '#DC2626' } as const

export async function sendBookingEmail(kind: 'confirm' | 'reschedule' | 'cancel', c: BookingEmailCtx) {
  const dateStr = `${formatSlot(c.start)} (${SLOT_CONFIG.timezone})`
  const sequence = kind === 'confirm' ? 0 : kind === 'reschedule' ? 1 : 2
  const ics = buildIcs({
    uid: `interview-${c.interviewId}@levl1`,
    start: c.start, end: c.end,
    title: `Interview — ${c.positionTitle}`,
    description: `AI voice interview for ${c.positionTitle} at ${c.company}.\\nJoin: ${c.joinUrl}`,
    location: c.joinUrl,
    organizerName: c.agencyName, attendeeEmail: c.candidateEmail,
    method: kind === 'cancel' ? 'CANCEL' : 'REQUEST', sequence,
  })
  const subject = kind === 'cancel'
    ? `Interview cancelled — ${c.positionTitle}`
    : `Interview ${kind === 'reschedule' ? 'rescheduled' : 'confirmed'} — ${c.positionTitle} on ${dateStr}`

  return dispatchNotification({
    kind: kind as NotificationKind,
    to: { email: c.candidateEmail },
    subject,
    html: html(kind, c, dateStr),
    from: senderFor(c.agency),
    attachments: [icsAttachment(ics, kind === 'cancel' ? 'interview-cancelled.ics' : 'interview.ics')],
  })
}

function html(kind: 'confirm' | 'reschedule' | 'cancel', c: BookingEmailCtx, dateStr: string): string {
  const accent = ACCENT[kind]
  const heading = kind === 'cancel' ? 'Interview cancelled' : kind === 'reschedule' ? 'Interview rescheduled' : 'Interview confirmed'
  const intro = kind === 'cancel'
    ? 'Your interview has been cancelled. No action is needed.'
    : `Your interview is ${kind === 'reschedule' ? 'now' : ''} set for the time below. A calendar invite (.ics) is attached — add it to any calendar.`
  return `<!DOCTYPE html><html><body style="margin:0;background:#F8FAFC;font-family:Inter,system-ui,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden">
  <div style="background:${accent};padding:28px"><div style="font-size:19px;font-weight:800;color:#fff">${heading}</div><div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:3px">${c.agencyName} via Levl1</div></div>
  <div style="padding:28px">
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 18px">Hi ${c.candidateName},<br>${intro}</p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px;margin-bottom:22px">
      <div style="font-size:15px;font-weight:700;color:#0F172A">${c.positionTitle} at ${c.company}</div>
      <div style="font-size:14px;color:#475569;margin-top:6px;${kind === 'cancel' ? 'text-decoration:line-through' : ''}">📅 ${dateStr}</div>
    </div>
    ${kind !== 'cancel' ? `<a href="${c.joinUrl}" style="display:block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:700">Join interview when ready →</a>` : ''}
    ${kind !== 'cancel' && c.consentUrl ? `<p style="font-size:12px;color:#94A3B8;margin-top:14px">Before you start you'll be asked to acknowledge a short recording &amp; data-processing consent notice. <a href="${c.consentUrl}" style="color:#4F46E5">Review it here</a>.</p>` : ''}
  </div>
</div></body></html>`
}
