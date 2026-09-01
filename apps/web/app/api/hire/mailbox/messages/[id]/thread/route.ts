import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { threadKey } from '@/lib/hire/mailbox/thread'

export const dynamic = 'force-dynamic'

// GET /api/hire/mailbox/messages/[id]/thread — the full conversation trail this
// message belongs to (same normalized subject + correspondent), oldest→newest,
// with bodies. Ownership-scoped to this recruiter's mailbox.
const ATT_SELECT = { id: true, filename: true, mimeType: true, sizeBytes: true, isResume: true }

export const GET = withHireAuth(async (_req, ctx, params) => {
  const msg = await prisma.mailboxMessage.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })

  // ── WhatsApp: the id is a WhatsAppMessage → return that number's conversation.
  if (!msg) {
    const wa = await prisma.whatsAppMessage.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
    if (!wa) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const all = await prisma.whatsAppMessage.findMany({
      where: { tenantId: ctx.tenantId, fromNumber: wa.fromNumber },
      orderBy: { receivedAt: 'asc' },
    })
    const messages = all.map((w) => ({
      id: w.id, fromAddr: w.fromNumber, fromName: w.fromName, subject: 'WhatsApp message',
      bodyText: w.body, receivedAt: w.receivedAt, isJobSpec: false, jobSpecConfidence: null,
      isRead: w.isRead, status: 'new', createdPositionId: null, channel: 'whatsapp', attachments: [],
    }))
    return NextResponse.json({ messages })
  }

  const conn = await prisma.mailboxConnection.findFirst({ where: { id: msg.connectionId, userId: ctx.userId, tenantId: ctx.tenantId }, select: { id: true } })
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const key = threadKey(msg.subject, msg.fromAddr)
  const all = await prisma.mailboxMessage.findMany({
    where: { connectionId: msg.connectionId, tenantId: ctx.tenantId },
    select: { id: true, fromAddr: true, fromName: true, subject: true, bodyText: true, receivedAt: true, isJobSpec: true, jobSpecConfidence: true, isRead: true, status: true, createdPositionId: true, attachments: { select: ATT_SELECT } },
  })
  const messages = all
    .filter((m) => threadKey(m.subject, m.fromAddr) === key)
    .sort((a, b) => +new Date(a.receivedAt) - +new Date(b.receivedAt))
    .map((m) => ({ ...m, channel: 'email' }))
  return NextResponse.json({ messages })
})
