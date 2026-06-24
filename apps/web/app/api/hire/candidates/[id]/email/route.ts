import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { sendHireEmail } from '@/lib/hire/email'
import { agencyFromAddress } from '@/lib/emailService'
import { personalize, Recipient } from '@/lib/hire/campaigns'
import { getConnector } from '@/lib/hire/mailbox'
import { decryptMailboxSecret } from '@/lib/hire/mailbox/crypto'

export const dynamic = 'force-dynamic'

function escapeHtml(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

async function load(tenantId: string, id: string) {
  return prisma.hireCandidate.findFirst({
    where: { id, tenantId },
    select: { id: true, name: true, email: true, emailOptOut: true, currentCompany: true, job: { select: { title: true, client: { select: { name: true } } } } },
  })
}
function tokensFor(c: { name: string; email: string | null; currentCompany: string | null; job: { title: string; client: { name: string } | null } | null }): Recipient {
  return { name: c.name, email: c.email ?? '', job: c.job?.title, company: c.job?.client?.name ?? c.currentCompany ?? undefined }
}

// GET — the token values + send-eligibility for the compose modal's live preview.
export const GET = withHireAuth(async (_req, ctx, params) => {
  const c = await load(ctx.tenantId, params.id)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const t = tokensFor(c)
  return NextResponse.json({ name: t.name, job: t.job ?? null, company: t.company ?? null, email: c.email, emailOptOut: c.emailOptOut })
})

// POST — send a 1:1 email (template or freeform), tokens filled, logged.
export const POST = withHireAuth(async (req, ctx, params) => {
  const c = await load(ctx.tenantId, params.id)
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!c.email) return NextResponse.json({ error: 'This candidate has no email address.' }, { status: 400 })
  // Respect opt-out — never email an opted-out candidate.
  if (c.emailOptOut) return NextResponse.json({ error: 'This candidate has opted out of emails.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const rawSubject = String(body.subject ?? '').trim()
  const rawBody = String(body.body ?? '').trim()
  if (!rawSubject || !rawBody) return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })

  const r = tokensFor(c)
  const subject = personalize(rawSubject, r)
  const text = personalize(rawBody, r)

  const [tenant, user] = await Promise.all([
    prisma.hireTenant.findUnique({ where: { id: ctx.tenantId }, select: { name: true } }),
    prisma.hireUser.findFirst({ where: { id: ctx.userId, tenantId: ctx.tenantId }, select: { email: true } }),
  ])
  const html = `<div style="font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#0F172A">${escapeHtml(text).replace(/\n/g, '<br/>')}</div>`

  // Send via the recruiter's own connected mailbox when requested AND available;
  // otherwise fall back to the default Resend path (backward-compatible).
  const wantMailbox = body.via === 'mailbox'
  let via: 'mailbox' | 'resend' = 'resend'
  if (wantMailbox) {
    const conn = await prisma.mailboxConnection.findFirst({ where: { userId: ctx.userId, tenantId: ctx.tenantId, status: 'connected' } })
    const secret = decryptMailboxSecret(conn?.credentials)
    const connector = conn ? getConnector(conn.provider) : null
    if (conn && secret && connector && conn.imapHost && conn.smtpHost && conn.imapPort && conn.smtpPort) {
      const res = await connector.send(
        { email: conn.email, password: secret.password, imapHost: conn.imapHost, imapPort: conn.imapPort, smtpHost: conn.smtpHost, smtpPort: conn.smtpPort },
        { to: c.email, subject, html },
      )
      if (!res.ok) {
        console.error('[hire/candidate-email] mailbox send failed for', conn.email) // no secret
        return NextResponse.json({ error: `Could not send from your mailbox: ${res.error ?? 'unknown error'}` }, { status: 502 })
      }
      via = 'mailbox'
    }
    // If no usable mailbox, fall through to Resend.
  }

  if (via === 'resend') {
    // from: "<Tenant> via Levl1 <…>"; replyTo: the recruiter so replies reach them.
    const from = agencyFromAddress({ name: tenant?.name ?? 'Levl1 Hire' })
    try {
      await sendHireEmail({ to: c.email, subject, html, from, replyTo: user?.email })
    } catch (e) {
      console.error('[hire/candidate-email] send failed:', e instanceof Error ? e.message : e)
      return NextResponse.json({ error: 'Failed to send — please try again.' }, { status: 502 })
    }
  }

  await prisma.hireCandidateActivity.create({
    data: { candidateId: c.id, type: 'email_sent', note: `Email sent${via === 'mailbox' ? ` from ${user?.email ?? 'your mailbox'}` : ''}: “${subject}”`, userId: ctx.userId },
  })
  return NextResponse.json({ ok: true, sentTo: c.email, via })
})
