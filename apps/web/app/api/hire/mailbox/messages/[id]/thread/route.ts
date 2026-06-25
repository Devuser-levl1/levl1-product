import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { threadKey } from '@/lib/hire/mailbox/thread'

export const dynamic = 'force-dynamic'

// GET /api/hire/mailbox/messages/[id]/thread — the full conversation trail this
// message belongs to (same normalized subject + correspondent), oldest→newest,
// with bodies. Ownership-scoped to this recruiter's mailbox.
export const GET = withHireAuth(async (_req, ctx, params) => {
  const msg = await prisma.mailboxMessage.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const conn = await prisma.mailboxConnection.findFirst({ where: { id: msg.connectionId, userId: ctx.userId, tenantId: ctx.tenantId }, select: { id: true } })
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const key = threadKey(msg.subject, msg.fromAddr)
  const all = await prisma.mailboxMessage.findMany({
    where: { connectionId: msg.connectionId, tenantId: ctx.tenantId },
    select: { id: true, fromAddr: true, fromName: true, subject: true, bodyText: true, receivedAt: true, isJobSpec: true, jobSpecConfidence: true, isRead: true, status: true, createdPositionId: true },
  })
  const messages = all.filter((m) => threadKey(m.subject, m.fromAddr) === key).sort((a, b) => +new Date(a.receivedAt) - +new Date(b.receivedAt))
  return NextResponse.json({ messages })
})
