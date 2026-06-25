import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Load a message and verify it belongs to THIS recruiter's mailbox.
async function ownedMessage(userId: string, tenantId: string, id: string) {
  const msg = await prisma.mailboxMessage.findFirst({ where: { id, tenantId } })
  if (!msg) return null
  const conn = await prisma.mailboxConnection.findFirst({ where: { id: msg.connectionId, userId, tenantId }, select: { id: true } })
  return conn ? msg : null
}

// GET — full message incl. body (for the "Draft position" flow).
export const GET = withHireAuth(async (_req, ctx, params) => {
  const msg = await ownedMessage(ctx.userId, ctx.tenantId, params.id)
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(msg)
})

// PATCH — update status (archived | drafted) and link a created position.
export const PATCH = withHireAuth(async (req, ctx, params) => {
  const msg = await ownedMessage(ctx.userId, ctx.tenantId, params.id)
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (body.status === 'archived' || body.status === 'drafted' || body.status === 'new') data.status = body.status
  if (typeof body.isRead === 'boolean') data.isRead = body.isRead
  if (typeof body.createdPositionId === 'string') data.createdPositionId = body.createdPositionId
  const updated = await prisma.mailboxMessage.update({ where: { id: msg.id }, data })
  return NextResponse.json({ ok: true, status: updated.status, createdPositionId: updated.createdPositionId })
})
