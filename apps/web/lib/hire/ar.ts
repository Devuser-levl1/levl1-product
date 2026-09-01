import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'
import { logAudit } from '@/lib/hire/audit'

// ── Accounts Receivable domain helpers ──────────────────────────────────────
// Pure functions for ageing/summary so the API and cron share one source of
// truth. All money is in the invoice's own currency (default INR).

export interface InvoiceLike {
  amount: number
  amountPaid: number
  dueDate: Date | string
  status: string
}

const DAY = 86400000

/** Outstanding balance = amount − amountPaid (never negative). */
export function balance(inv: InvoiceLike): number {
  return Math.max(0, inv.amount - inv.amountPaid)
}

/** Whole days an unpaid invoice is past its due date (0 if not yet due/paid). */
export function daysOverdue(inv: InvoiceLike, now: Date = new Date()): number {
  if (inv.status === 'paid') return 0
  const due = new Date(inv.dueDate).getTime()
  if (now.getTime() <= due) return 0
  return Math.floor((now.getTime() - due) / DAY)
}

export type AgeingBucket = 'current' | '0-30' | '31-60' | '60+'

/** Ageing bucket by days overdue. Not-yet-due outstanding balances are `current`. */
export function ageingBucket(inv: InvoiceLike, now: Date = new Date()): AgeingBucket {
  const d = daysOverdue(inv, now)
  if (d <= 0) return 'current'
  if (d <= 30) return '0-30'
  if (d <= 60) return '31-60'
  return '60+'
}

/** Derive status from amounts — keeps status consistent on every write. */
export function deriveStatus(amount: number, amountPaid: number): 'pending' | 'partial' | 'paid' {
  if (amountPaid >= amount && amount > 0) return 'paid'
  if (amountPaid > 0) return 'partial'
  return 'pending'
}

export interface ClientAR {
  clientId: string
  clientName: string
  totalOwed: number
  overdue: number
  invoiceCount: number
}

export interface ARSummary {
  totalOwed: number
  totalOverdue: number
  openInvoiceCount: number
  buckets: Record<AgeingBucket, number>
  byClient: ClientAR[]
}

interface SummaryInput extends InvoiceLike {
  clientId: string
  clientName: string
}

/** Aggregate open invoices into the AR dashboard summary. */
export function summarize(invoices: SummaryInput[], now: Date = new Date()): ARSummary {
  const buckets: Record<AgeingBucket, number> = { current: 0, '0-30': 0, '31-60': 0, '60+': 0 }
  const clientMap = new Map<string, ClientAR>()
  let totalOwed = 0
  let totalOverdue = 0
  let openInvoiceCount = 0

  for (const inv of invoices) {
    const bal = balance(inv)
    if (bal <= 0 || inv.status === 'paid') continue
    openInvoiceCount++
    totalOwed += bal
    const bucket = ageingBucket(inv, now)
    buckets[bucket] += bal
    if (bucket !== 'current') totalOverdue += bal

    const c = clientMap.get(inv.clientId) ?? { clientId: inv.clientId, clientName: inv.clientName, totalOwed: 0, overdue: 0, invoiceCount: 0 }
    c.totalOwed += bal
    if (bucket !== 'current') c.overdue += bal
    c.invoiceCount++
    clientMap.set(inv.clientId, c)
  }

  const byClient = Array.from(clientMap.values()).sort((a, b) => b.totalOwed - a.totalOwed)
  return { totalOwed, totalOverdue, openInvoiceCount, buckets, byClient }
}

export interface ReminderState { status: string; remindersOn: boolean; dueDate: Date; lastReminderAt: Date | null; reminderIntervalDays: number }

/** Is an automatic reminder due for this invoice right now? */
export function reminderDue(inv: ReminderState, now: Date = new Date()): boolean {
  if (!inv.remindersOn || inv.status === 'paid') return false
  if (now.getTime() <= new Date(inv.dueDate).getTime()) return false // not overdue yet
  if (!inv.lastReminderAt) return true // overdue + never reminded
  const elapsed = (now.getTime() - new Date(inv.lastReminderAt).getTime()) / DAY
  return elapsed >= inv.reminderIntervalDays
}

/**
 * When Lev will next nudge this invoice — null if paid or reminders are off.
 * First nudge lands on the due date; thereafter every reminderIntervalDays.
 */
export function nextReminderAt(inv: ReminderState, now: Date = new Date()): Date | null {
  if (!inv.remindersOn || inv.status === 'paid') return null
  const due = new Date(inv.dueDate)
  if (!inv.lastReminderAt) return now.getTime() <= due.getTime() ? due : now // due, or overdue-and-never-nudged → now
  return new Date(new Date(inv.lastReminderAt).getTime() + inv.reminderIntervalDays * DAY)
}

export type ReminderTone = 'reminder' | 'firm' | 'urgent' | 'final'
export interface Escalation { tone: ReminderTone; label: string; subjectPrefix: string; heading: string; intro: string; closing: string }

/** Escalating tone by how far overdue the invoice is. */
export function escalationTier(daysOverdue: number): Escalation {
  if (daysOverdue >= 60) return {
    tone: 'final', label: 'Final notice', subjectPrefix: 'FINAL NOTICE',
    heading: 'Final payment notice',
    intro: 'Despite earlier reminders, the following invoice remains unpaid and is now seriously overdue.',
    closing: 'Please arrange payment immediately to avoid this being escalated. If payment has just been made, kindly share the reference.',
  }
  if (daysOverdue >= 31) return {
    tone: 'urgent', label: 'Urgent', subjectPrefix: 'URGENT',
    heading: 'Urgent: overdue payment',
    intro: 'This invoice is now significantly overdue and needs your urgent attention.',
    closing: 'Please prioritise settlement this week. Reply here if there is any issue we can help resolve.',
  }
  if (daysOverdue >= 8) return {
    tone: 'firm', label: 'Firm follow-up', subjectPrefix: 'Overdue',
    heading: 'Overdue payment — second reminder',
    intro: 'We haven’t yet received payment for the invoice below, which is now past due.',
    closing: 'We’d appreciate settlement at the earliest. Do let us know if a copy of the invoice would help.',
  }
  return {
    tone: 'reminder', label: 'Friendly reminder', subjectPrefix: 'Payment reminder',
    heading: 'Payment reminder',
    intro: 'This is a friendly reminder that the invoice below is now due.',
    closing: 'If payment is already on its way, please disregard this note. Otherwise we’d appreciate settlement at your earliest convenience.',
  }
}

/**
 * Send overdue reminders for every eligible invoice across all tenants.
 * Logs each send to HireInvoiceReminder and advances lastReminderAt.
 * Best-effort per invoice — one failure never blocks the rest.
 */
export async function runArReminders(now: Date = new Date()): Promise<{ checked: number; sent: number }> {
  const candidates = await prisma.hireInvoice.findMany({
    where: { remindersOn: true, status: { not: 'paid' }, dueDate: { lt: now } },
    include: { client: { include: { contacts: true } }, tenant: true, deal: { select: { title: true } } },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  let sent = 0

  for (const inv of candidates) {
    try {
      if (!reminderDue(inv, now)) continue
      // Recipient: first client contact with an email (skip opted-out).
      const contact = inv.client.contacts.find((c) => c.email && !c.emailOptOut)
      const to = contact?.email
      if (!to) continue

      const bal = balance(inv)
      const od = daysOverdue(inv, now)
      const esc = escalationTier(od)
      // Sent from the client's own agency sender (deliverability), authored by Lev.
      const from = `${inv.tenant.name} via Levl1 <${process.env.FROM_EMAIL ?? 'noreply@mail.levl1.io'}>`
      const cur = inv.currency === 'INR' ? '₹' : inv.currency + ' '
      const ref = inv.number ? ` ${inv.number}` : ''

      await sendEmail({
        to,
        from,
        subject: `${esc.subjectPrefix} — invoice${ref} (${od} day${od === 1 ? '' : 's'} overdue)`,
        html: invoiceReminderEmail({
          contactName: contact?.name ?? inv.client.name,
          tenantName: inv.tenant.name,
          amount: `${cur}${bal.toLocaleString('en-IN')}`,
          number: inv.number,
          dueStr: new Date(inv.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
          daysOverdue: od,
          dealTitle: inv.deal?.title ?? null,
          appUrl, esc,
        }),
      })

      await prisma.$transaction([
        prisma.hireInvoiceReminder.create({ data: { invoiceId: inv.id, tenantId: inv.tenantId, sentTo: to, daysOverdue: od, channel: 'email', tone: esc.tone } }),
        prisma.hireInvoice.update({ where: { id: inv.id }, data: { lastReminderAt: now } }),
      ])
      // Audit: attribute the automatic nudge to Lev (the agent).
      await logAudit({
        tenantId: inv.tenantId, actorUserId: null, actorName: 'Lev (automated)',
        action: 'ar_reminder_sent', targetType: 'invoice', targetId: inv.id,
        targetName: inv.number ?? `${inv.currency} ${inv.amount}`,
        meta: { sentTo: to, daysOverdue: od, tone: esc.tone, amount: bal },
      }).catch(() => {})
      sent++
    } catch (e) {
      console.error('[hire/ar] reminder failed for invoice', inv.id, '-', e instanceof Error ? e.message : e)
    }
  }

  return { checked: candidates.length, sent }
}

function invoiceReminderEmail(o: {
  contactName: string; tenantName: string; amount: string; number: string | null
  dueStr: string; daysOverdue: number; dealTitle: string | null; appUrl: string; esc: Escalation
}): string {
  const accent = o.esc.tone === 'final' ? '#DC2626' : o.esc.tone === 'urgent' ? '#EA580C' : o.esc.tone === 'firm' ? '#D97706' : '#6D28D9'
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
  <div style="max-width:480px;margin:24px auto;border:1px solid #E2E8F0;border-radius:14px;padding:28px">
    <h2 style="margin:0 0 8px;color:${accent}">${o.esc.heading}</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6">Hi ${o.contactName},</p>
    <p style="color:#475569;font-size:14px;line-height:1.6">
      ${o.esc.intro} ${o.number ? `Invoice <strong>${o.number}</strong>` : 'The invoice'}${o.dealTitle ? ` for <strong>${o.dealTitle}</strong>` : ''}
      of <strong>${o.amount}</strong> was due on <strong>${o.dueStr}</strong>
      and is now <strong>${o.daysOverdue} day${o.daysOverdue === 1 ? '' : 's'} overdue</strong>.
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.6">${o.esc.closing}</p>
    <p style="color:#94A3B8;font-size:12px;margin-top:22px;border-top:1px solid #F1F5F9;padding-top:14px">
      Sent by <strong>Lev</strong>, ${o.tenantName}&apos;s AI billing assistant, on their behalf.
    </p>
  </div></body></html>`
}
