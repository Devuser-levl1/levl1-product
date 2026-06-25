import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { getConnector } from '@/lib/hire/mailbox'
import { decryptMailboxSecret } from '@/lib/hire/mailbox/crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function escapeHtml(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

// POST /api/hire/mailbox/messages/[id]/reply — reply to a pulled email from the
// recruiter's own connected mailbox (reuses the SMTP send path). Ownership-scoped.
export const POST = withHireAuth(async (req, ctx, params) => {
  const msg = await prisma.mailboxMessage.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const conn = await prisma.mailboxConnection.findFirst({ where: { id: msg.connectionId, userId: ctx.userId, tenantId: ctx.tenantId, status: 'connected' } })
  if (!conn) return NextResponse.json({ error: 'Mailbox not connected.' }, { status: 400 })
  if (!msg.fromAddr) return NextResponse.json({ error: 'This email has no sender address to reply to.' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const text = String(body.body ?? '').trim()
  if (!text) return NextResponse.json({ error: 'Reply body is required.' }, { status: 400 })

  const connector = getConnector(conn.provider)
  const secret = decryptMailboxSecret(conn.credentials)
  if (!connector || !secret || !conn.imapHost || !conn.smtpHost || !conn.imapPort || !conn.smtpPort) {
    return NextResponse.json({ error: 'Mailbox needs reconnecting.' }, { status: 400 })
  }

  const subject = /^re:/i.test(msg.subject) ? msg.subject : `Re: ${msg.subject}`
  const html = `<div style="font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#0F172A">${escapeHtml(text).replace(/\n/g, '<br/>')}</div>`
  const res = await connector.send(
    { email: conn.email, password: secret.password, imapHost: conn.imapHost, imapPort: conn.imapPort, smtpHost: conn.smtpHost, smtpPort: conn.smtpPort },
    { to: msg.fromAddr, subject, html },
  )
  if (!res.ok) {
    console.error('[hire/mailbox/reply] send failed for', conn.email) // no secret
    return NextResponse.json({ error: `Could not send reply: ${res.error ?? 'unknown error'}` }, { status: 502 })
  }

  await prisma.mailboxMessage.update({ where: { id: msg.id }, data: { isRead: true } }).catch(() => {})
  return NextResponse.json({ ok: true, sentTo: msg.fromAddr })
})
