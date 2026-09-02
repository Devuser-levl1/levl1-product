import { prisma } from '@/lib/prisma'
import { sendEmail, agencyFromAddress } from '@/lib/emailService'
import { sendWhatsAppText } from '@/lib/whatsappService'
import { signPurposeToken } from '@/lib/hire/auth'
import { logAudit } from '@/lib/hire/audit'
import { RESPONSE_BY_KEY, isFlagged, type NurtureResponse } from '@/lib/hire/nurture-constants'

// ── Post-placement nurture (Agency-only) ─────────────────────────────────────
// Lev sends friendly structured check-ins at fixed intervals after a placement
// and captures ONE structured response per interval (no open conversation).
// Pure constants live in ./nurture-constants (client-safe); re-exported here.
export { DEFAULT_NURTURE_INTERVALS, NURTURE_RESPONSES, RESPONSE_BY_KEY, isFlagged, resolveIntervals } from '@/lib/hire/nurture-constants'
export type { NurtureResponse, ResponseOption } from '@/lib/hire/nurture-constants'
import { resolveIntervals } from '@/lib/hire/nurture-constants'

const DAY = 86400000
const TOKEN_TTL = 210 * 24 * 60 * 60 // must outlive the 90-day interval

/**
 * Mark a candidate placed and (re)generate their nurture check-in schedule.
 * Existing not-yet-sent check-ins are cleared and rebuilt from the placement date.
 */
export async function schedulePlacement(opts: {
  tenantId: string; candidateId: string; placedAt: Date; company?: string | null; intervals?: number[]
}): Promise<{ scheduled: number; intervals: number[] }> {
  const tenant = await prisma.hireTenant.findUnique({ where: { id: opts.tenantId }, select: { nurtureIntervals: true } })
  const intervals = opts.intervals?.length ? resolveIntervals(opts.intervals) : resolveIntervals(tenant?.nurtureIntervals)

  await prisma.hireCandidate.update({
    where: { id: opts.candidateId },
    data: { placedAt: opts.placedAt, placedCompany: opts.company ?? undefined, currentStage: 'Placed' },
  })

  // Rebuild: drop scheduled (unsent) check-ins, keep any already sent/responded.
  await prisma.hireNurtureCheckin.deleteMany({ where: { candidateId: opts.candidateId, status: 'scheduled' } })
  const existing = new Set(
    (await prisma.hireNurtureCheckin.findMany({ where: { candidateId: opts.candidateId }, select: { dayOffset: true } })).map((c) => c.dayOffset),
  )
  const toCreate = intervals.filter((d) => !existing.has(d))
  if (toCreate.length) {
    await prisma.hireNurtureCheckin.createMany({
      data: toCreate.map((d) => ({
        tenantId: opts.tenantId, candidateId: opts.candidateId, dayOffset: d,
        scheduledFor: new Date(opts.placedAt.getTime() + d * DAY), status: 'scheduled',
      })),
    })
  }
  return { scheduled: toCreate.length, intervals }
}

interface CheckinRow {
  id: string; dayOffset: number; tenantId: string
  candidate: { id: string; name: string; email: string | null; phone: string | null; placedCompany: string | null; emailOptOut: boolean; nurtureOptOut: boolean; assigneeId: string | null }
}

function waMessage(name: string, company: string, agency: string, day: number): string {
  return `Hi ${name}, Lev here from ${agency} 👋\n\nJust checking in on your ${day}-day mark${company ? ` at ${company}` : ''} — how's it going?\n\nReply with a number:\n1 = All good / still working\n2 = Facing some issues\n3 = No longer working there\n\n(Reply STOP to opt out of these check-ins.)`
}

function emailHtml(o: { name: string; company: string; agency: string; day: number; appUrl: string; token: string }): string {
  const btn = (opt: NurtureResponse, label: string, color: string) =>
    `<a href="${o.appUrl}/api/hire/nurture/respond?token=${o.token}&option=${opt}" style="display:block;text-align:center;padding:11px 16px;border-radius:9px;text-decoration:none;font-weight:700;font-size:14px;margin:8px 0;background:${color};color:#fff">${label}</a>`
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
  <div style="max-width:460px;margin:24px auto;border:1px solid #E2E8F0;border-radius:14px;padding:28px">
    <p style="font-size:14px;line-height:1.6;color:#334155">Hi ${o.name},</p>
    <p style="font-size:14px;line-height:1.6;color:#334155">It's your ${o.day}-day check-in${o.company ? ` at <strong>${o.company}</strong>` : ''} — how are things going? Just tap one:</p>
    ${btn('all_good', 'All good / Still working', '#059669')}
    ${btn('issues', 'Facing some issues', '#D97706')}
    ${btn('left', 'No longer working there', '#DC2626')}
    <p style="font-size:12px;color:#94A3B8;margin-top:22px;border-top:1px solid #F1F5F9;padding-top:14px">
      Sent by <strong>Lev</strong>, ${o.agency}'s AI assistant. One quick tap — we won't follow up beyond these check-ins.
      <a href="${o.appUrl}/api/hire/nurture/respond?token=${o.token}&option=optout" style="color:#94A3B8">Opt out</a>.
    </p>
  </div></body></html>`
}

/**
 * Send every nurture check-in that is due now. Best-effort per check-in; honors
 * opt-out; sends via WhatsApp and/or email; attributed to Lev; logged.
 */
export async function runNurtureCheckins(now: Date = new Date()): Promise<{ checked: number; sent: number }> {
  const due = await prisma.hireNurtureCheckin.findMany({
    where: { status: 'scheduled', scheduledFor: { lte: now } },
    include: {
      candidate: { select: { id: true, name: true, email: true, phone: true, placedCompany: true, emailOptOut: true, nurtureOptOut: true, assigneeId: true } },
    },
    take: 500,
  }) as unknown as CheckinRow[]

  // Tenant display names (for the check-in copy + from address).
  const tenantIds = Array.from(new Set(due.map((d) => d.tenantId)))
  const tenants = tenantIds.length ? await prisma.hireTenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } }) : []
  const tenantName = new Map(tenants.map((t) => [t.id, t.name]))

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  let sent = 0

  for (const ci of due) {
    try {
      const c = ci.candidate
      if (c.nurtureOptOut) { await prisma.hireNurtureCheckin.update({ where: { id: ci.id }, data: { status: 'skipped' } }); continue }
      const company = c.placedCompany ?? ''
      const agency = tenantName.get(ci.tenantId) ?? 'your recruiter'
      const channels: string[] = []

      // WhatsApp (if we have a number).
      if (c.phone) {
        const res = await sendWhatsAppText(c.phone, waMessage(c.name, company, agency, ci.dayOffset))
        if (res.ok) channels.push('whatsapp')
      }
      // Email (if present and not opted out).
      if (c.email && !c.emailOptOut) {
        const token = signPurposeToken({ purpose: 'nurture', checkinId: ci.id, tenantId: ci.tenantId }, TOKEN_TTL)
        try {
          await sendEmail({
            to: c.email,
            from: agencyFromAddress({ name: agency }),
            subject: `Quick ${ci.dayOffset}-day check-in${company ? ` — ${company}` : ''}`,
            html: emailHtml({ name: c.name, company, agency, day: ci.dayOffset, appUrl, token }),
          })
          channels.push('email')
        } catch (e) { console.error('[hire/nurture] email failed for', ci.id, '-', e instanceof Error ? e.message : e) }
      }

      if (channels.length === 0) {
        await prisma.hireNurtureCheckin.update({ where: { id: ci.id }, data: { status: 'skipped' } })
        continue
      }

      await prisma.hireNurtureCheckin.update({ where: { id: ci.id }, data: { status: 'sent', channel: channels.join('+'), sentAt: now } })
      await prisma.hireCandidateActivity.create({ data: { candidateId: c.id, type: 'nurture_checkin_sent', note: `Lev sent the ${ci.dayOffset}-day check-in via ${channels.join(' + ')}` } }).catch(() => {})
      await logAudit({
        tenantId: ci.tenantId, actorUserId: null, actorName: 'Lev (automated)',
        action: 'nurture_checkin_sent', targetType: 'candidate', targetId: c.id, targetName: c.name,
        meta: { dayOffset: ci.dayOffset, channels },
      }).catch(() => {})
      sent++
    } catch (e) {
      console.error('[hire/nurture] check-in failed for', ci.id, '-', e instanceof Error ? e.message : e)
    }
  }
  return { checked: due.length, sent }
}

/** Record a candidate's structured response to a check-in (idempotent-ish). */
export async function recordNurtureResponse(checkinId: string, tenantId: string, response: NurtureResponse, via: 'whatsapp' | 'email'): Promise<boolean> {
  const ci = await prisma.hireNurtureCheckin.findFirst({ where: { id: checkinId, tenantId } })
  if (!ci) return false
  await prisma.hireNurtureCheckin.update({ where: { id: ci.id }, data: { response, respondedAt: new Date(), status: 'responded', responseVia: via } })
  const opt = RESPONSE_BY_KEY.get(response)
  await prisma.hireCandidateActivity.create({ data: { candidateId: ci.candidateId, type: 'nurture_response', note: `${ci.dayOffset}-day check-in reply: ${opt?.label ?? response}${isFlagged(response) ? ' ⚠ needs attention' : ''}` } }).catch(() => {})
  await logAudit({
    tenantId, actorUserId: null, actorName: 'Lev (automated)',
    action: 'nurture_response', targetType: 'candidate', targetId: ci.candidateId,
    meta: { dayOffset: ci.dayOffset, response, via, flagged: isFlagged(response) },
  }).catch(() => {})
  return true
}
