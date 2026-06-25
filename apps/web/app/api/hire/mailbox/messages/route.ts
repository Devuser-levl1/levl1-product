import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/hire/mailbox/messages — this recruiter's pulled mail (no full body).
export const GET = withHireAuth(async (req, ctx) => {
  const conn = await prisma.mailboxConnection.findFirst({ where: { userId: ctx.userId, tenantId: ctx.tenantId }, select: { id: true } })
  if (!conn) return NextResponse.json({ messages: [] })

  const filter = new URL(req.url).searchParams.get('filter') // 'jobspec' | undefined
  const messages = await prisma.mailboxMessage.findMany({
    where: { connectionId: conn.id, tenantId: ctx.tenantId, ...(filter === 'jobspec' ? { isJobSpec: true } : {}) },
    orderBy: { receivedAt: 'desc' },
    take: 100,
    select: { id: true, fromAddr: true, fromName: true, subject: true, snippet: true, receivedAt: true, isJobSpec: true, jobSpecConfidence: true, isRead: true, status: true, createdPositionId: true },
  })
  return NextResponse.json({ messages })
})
