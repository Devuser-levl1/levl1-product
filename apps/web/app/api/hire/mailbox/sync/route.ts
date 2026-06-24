import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { syncConnection } from '@/lib/hire/mailbox/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/hire/mailbox/sync — manual "Refresh" for THIS recruiter's mailbox.
export const POST = withHireAuth(async (_req, ctx) => {
  const conn = await prisma.mailboxConnection.findFirst({ where: { userId: ctx.userId, tenantId: ctx.tenantId } })
  if (!conn) return NextResponse.json({ error: 'No mailbox connected.' }, { status: 404 })
  if (conn.status === 'error' && !conn.credentials) return NextResponse.json({ error: 'Mailbox needs reconnecting.' }, { status: 400 })

  const { newCount } = await syncConnection(conn)
  const updated = await prisma.mailboxConnection.findUnique({ where: { id: conn.id }, select: { status: true, lastError: true, lastSyncedAt: true } })
  return NextResponse.json({ newCount, status: updated?.status, lastError: updated?.lastError, lastSyncedAt: updated?.lastSyncedAt })
})
