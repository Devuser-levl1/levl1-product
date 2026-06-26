import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'

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

/** Is an automatic reminder due for this invoice right now? */
export function reminderDue(
  inv: { status: string; remindersOn: boolean; dueDate: Date; lastReminderAt: Date | null; reminderIntervalDays: number },
  now: Date = new Date(),
): boolean {
  if (!inv.remindersOn || inv.status === 'paid') return false
  if (now.getTime() <= new Date(inv.dueDate).getTime()) return false // not overdue yet
  if (!inv.lastReminderAt) return true // overdue + never reminded
  const elapsed = (now.getTime() - new Date(inv.lastReminderAt).getTime()) / DAY
  return elapsed >= inv.reminderIntervalDays
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
      const from = `${inv.tenant.name} via Levl1 <${process.env.FROM_EMAIL ?? 'noreply@mail.levl1.io'}>`
      const cur = inv.currency === 'INR' ? '₹' : inv.currency + ' '
      const ref = inv.number ? ` ${inv.number}` : ''

      await sendEmail({
        to,
        from,
        subject: `Payment reminder — invoice${ref} ${od} day${od === 1 ? '' : 's'} overdue`,
        html: invoiceReminderEmail({
          contactName: contact?.name ?? inv.client.name,
          tenantName: inv.tenant.name,
          amount: `${cur}${bal.toLocaleString('en-IN')}`,
          number: inv.number,
          dueStr: new Date(inv.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
          daysOverdue: od,
          dealTitle: inv.deal?.title ?? null,
          appUrl,
        }),
      })

      await prisma.$transaction([
        prisma.hireInvoiceReminder.create({ data: { invoiceId: inv.id, tenantId: inv.tenantId, sentTo: to, daysOverdue: od, channel: 'email' } }),
        prisma.hireInvoice.update({ where: { id: inv.id }, data: { lastReminderAt: now } }),
      ])
      sent++
    } catch (e) {
      console.error('[hire/ar] reminder failed for invoice', inv.id, '-', e instanceof Error ? e.message : e)
    }
  }

  return { checked: candidates.length, sent }
}

function invoiceReminderEmail(o: {
  contactName: string; tenantName: string; amount: string; number: string | null
  dueStr: string; daysOverdue: number; dealTitle: string | null; appUrl: string
}): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
  <div style="max-width:480px;margin:24px auto;border:1px solid #E2E8F0;border-radius:14px;padding:28px">
    <h2 style="margin:0 0 8px">Payment reminder</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6">
      Hi ${o.contactName}, this is a friendly reminder that
      ${o.number ? `invoice <strong>${o.number}</strong>` : 'your invoice'}${o.dealTitle ? ` for <strong>${o.dealTitle}</strong>` : ''}
      of <strong>${o.amount}</strong> was due on <strong>${o.dueStr}</strong>
      and is now <strong>${o.daysOverdue} day${o.daysOverdue === 1 ? '' : 's'} overdue</strong>.
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.6">
      If payment is already on its way, please disregard this note. Otherwise we&apos;d appreciate
      settlement at your earliest convenience.
    </p>
    <p style="color:#94A3B8;font-size:12px;margin-top:20px">${o.tenantName} · Powered by Levl1 Hire</p>
  </div></body></html>`
}
