import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/hire/mailbox — this recruiter's mailbox status. NEVER returns creds.
export const GET = withHireAuth(async (_req, ctx) => {
  const conn = await prisma.mailboxConnection.findFirst({
    where: { userId: ctx.userId, tenantId: ctx.tenantId },
    select: { id: true, email: true, provider: true, imapHost: true, imapPort: true, smtpHost: true, smtpPort: true, status: true, lastError: true, lastSyncedAt: true },
  })
  return NextResponse.json({ connection: conn })
})

// DELETE /api/hire/mailbox — disconnect (removes the encrypted creds + row).
export const DELETE = withHireAuth(async (_req, ctx) => {
  const conn = await prisma.mailboxConnection.findFirst({ where: { userId: ctx.userId, tenantId: ctx.tenantId }, select: { id: true } })
  if (conn) await prisma.mailboxConnection.delete({ where: { id: conn.id } })
  return NextResponse.json({ ok: true })
})
