import { sendEmail, agencyFromAddress } from '@/lib/emailService'

// ── Channel-abstracted candidate notifications (Build I-P0-1) ──────────────
// One dispatch surface for every scheduling notification. Today only the EMAIL
// channel is implemented; a WhatsApp channel (blocked on an approved Business
// sender + Meta-approved templates) can be ADDED here later WITHOUT touching
// callers — just register another NotificationChannel. No OAuth, no Twilio now.

export type NotificationKind = 'invite' | 'confirm' | 'reschedule' | 'cancel' | 'reminder'

export interface Attachment { filename: string; content: string; contentType?: string }

export interface NotificationMessage {
  kind: NotificationKind
  to: { email: string; phone?: string | null }
  subject: string
  html: string
  attachments?: Attachment[]
  from?: string          // resolved sender (agency-branded)
  replyTo?: string
}

export interface NotificationChannel {
  name: 'email' | 'whatsapp'
  enabled(): boolean
  send(msg: NotificationMessage): Promise<{ ok: boolean; error?: string }>
}

// ── Email channel (Resend) — the only one wired today ──────────────────────
const emailChannel: NotificationChannel = {
  name: 'email',
  enabled: () => !!process.env.RESEND_API_KEY,
  async send(msg) {
    try {
      await sendEmail({ to: msg.to.email, subject: msg.subject, html: msg.html, from: msg.from, replyTo: msg.replyTo, attachments: msg.attachments })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'email failed' }
    }
  },
}

// SEAM for WhatsApp (out of scope now). Register it here once the Business
// sender + templates are approved; dispatchNotification needs no change.
// const whatsappChannel: NotificationChannel = { name: 'whatsapp', enabled: () => false, async send() { return { ok: false, error: 'not enabled' } } }

const CHANNELS: NotificationChannel[] = [emailChannel /* , whatsappChannel */]

// Send across all enabled channels. Per-channel failures never block the others.
export async function dispatchNotification(msg: NotificationMessage): Promise<{ channel: string; ok: boolean; error?: string }[]> {
  const results = await Promise.all(
    CHANNELS.filter((c) => c.enabled()).map(async (c) => ({ channel: c.name, ...(await c.send(msg)) })),
  )
  if (results.length === 0) console.warn('[notify] no channels enabled for %s', msg.kind)
  return results
}

// Helper: resolve the agency-branded sender for a notification.
export function senderFor(agency: { name: string } | null | undefined): string | undefined {
  return agency ? agencyFromAddress(agency) : undefined
}
