import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { sendHireEmail } from '@/lib/hire/email'
import { agencyFromAddress } from '@/lib/emailService'
import { personalize, Recipient } from '@/lib/hire/campaigns'

export const dynamic = 'force-dynamic'

function escapeHtml(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function renderHtml(text: string) {
  return `<div style="font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#0F172A">${escapeHtml(text).replace(/\n/g, '<br/>')}</div>`
}

interface CandRow {
  id: string; name: string; email: string | null; emailOptOut: boolean; currentCompany: string | null
  job: { title: string; client: { name: string } | null } | null
}
function tokensFor(c: CandRow): Recipient {
  return { name: c.name, email: c.email ?? '', job: c.job?.title, company: c.job?.client?.name ?? c.currentCompany ?? undefined }
}

/**
 * Bulk email to many candidates at once. The multi-recipient version of the
 * 1:1 candidate send — same template system, tokens, Resend path, and activity
 * logging. Tenant-scoped, opt-out-respecting, de-duped, and batched.
 *
 * Body: { candidateIds: string[], templateId?: string, subject?, body?, preview?: boolean }
 *  - preview:true returns counts + one filled sample and sends nothing.
 *  - otherwise sends in batches and returns a per-recipient report.
 */
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))

  // De-dupe selected ids (same candidate picked twice = one email).
  const rawIds: string[] = Array.isArray(body.candidateIds) ? body.candidateIds.map(String) : []
  const ids = Array.from(new Set(rawIds.filter(Boolean)))
  if (ids.length === 0) return NextResponse.json({ error: 'Select at least one candidate.' }, { status: 400 })

  // Resolve subject/body — from a saved template (tenant-scoped) or freeform.
  let rawSubject = String(body.subject ?? '').trim()
  let rawBody = String(body.body ?? '').trim()
  if (body.templateId) {
    const tmpl = await prisma.hireEmailTemplate.findFirst({
      where: { id: String(body.templateId), tenantId: ctx.tenantId },
      select: { subject: true, body: true },
    })
    if (!tmpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    if (!rawSubject) rawSubject = tmpl.subject
    if (!rawBody) rawBody = tmpl.body
  }
  if (!rawSubject || !rawBody) return NextResponse.json({ error: 'A subject and body (or template) are required.' }, { status: 400 })

  // Load only this tenant's candidates among the selected ids.
  const cands: CandRow[] = await prisma.hireCandidate.findMany({
    where: { id: { in: ids }, tenantId: ctx.tenantId },
    select: { id: true, name: true, email: true, emailOptOut: true, currentCompany: true, job: { select: { title: true, client: { select: { name: true } } } } },
  })

  const notFound = ids.length - cands.length
  const skippedNoEmail = cands.filter((c) => !c.email).length
  const optedOut = cands.filter((c) => c.email && c.emailOptOut)
  const eligible = cands.filter((c) => c.email && !c.emailOptOut)

  // ── Preview: counts + one filled sample; send nothing. ──
  if (body.preview) {
    const sampleCand = eligible[0]
    const sample = sampleCand
      ? { name: sampleCand.name, email: sampleCand.email, subject: personalize(rawSubject, tokensFor(sampleCand)), body: personalize(rawBody, tokensFor(sampleCand)) }
      : null
    return NextResponse.json({
      preview: true,
      recipientCount: eligible.length,
      skippedOptOut: optedOut.length,
      skippedNoEmail,
      deduped: rawIds.length - ids.length,
      notFound,
      sample,
    })
  }

  if (eligible.length === 0) {
    return NextResponse.json({ error: 'No eligible recipients — all selected candidates are opted out or missing an email.', skippedOptOut: optedOut.length, skippedNoEmail }, { status: 400 })
  }

  // ── Guardrail: block sends for an expired trial / lapsed subscription (view-only). ──
  const tenant = await prisma.hireTenant.findUnique({
    where: { id: ctx.tenantId },
    select: { name: true, trialActive: true, trialEndsAt: true, subscriptionStatus: true, currentPeriodEnd: true },
  })
  if (tenant) {
    const trialExpired = tenant.trialActive && tenant.trialEndsAt && new Date() > tenant.trialEndsAt
    const graceOk = tenant.subscriptionStatus === 'past_due' && tenant.currentPeriodEnd && Date.now() < tenant.currentPeriodEnd.getTime() + 3 * 86400000
    const noSub = !tenant.trialActive && tenant.subscriptionStatus !== 'active' && !graceOk
    if (trialExpired || noSub) {
      return NextResponse.json({ error: 'Your plan is view-only — upgrade to send emails.', reason: 'plan_inactive' }, { status: 402 })
    }
  }

  const user = await prisma.hireUser.findFirst({ where: { id: ctx.userId, tenantId: ctx.tenantId }, select: { email: true } })
  const from = agencyFromAddress({ name: tenant?.name ?? 'HirePilot' })

  // ── Batched send so a large selection doesn't time out or fail all-or-nothing. ──
  let sent = 0, failed = 0
  const failures: { name: string; email: string; error: string }[] = []
  const BATCH = 20

  for (let i = 0; i < eligible.length; i += BATCH) {
    const batch = eligible.slice(i, i + BATCH)
    await Promise.all(batch.map(async (c) => {
      const r = tokensFor(c)
      const subject = personalize(rawSubject, r)
      const html = renderHtml(personalize(rawBody, r))
      try {
        await sendHireEmail({ to: c.email as string, subject, html, from, replyTo: user?.email })
        await prisma.hireCandidateActivity.create({
          data: { candidateId: c.id, type: 'email_sent', note: `Bulk email sent: “${subject}”`, userId: ctx.userId },
        })
        sent++
      } catch (e) {
        console.error('[hire/bulk-email] send failed for', c.email, '-', e instanceof Error ? e.message : e)
        failed++
        failures.push({ name: c.name, email: c.email as string, error: e instanceof Error ? e.message : 'send failed' })
      }
    }))
    if (i + BATCH < eligible.length) await new Promise((res) => setTimeout(res, 500)) // gentle rate limit between batches
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    skippedOptOut: optedOut.length,
    skippedNoEmail,
    deduped: rawIds.length - ids.length,
    notFound,
    recipientCount: eligible.length,
    failures,
  })
})
