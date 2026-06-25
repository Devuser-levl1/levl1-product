import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE /api/hire/boards/[provider] — disconnect THIS recruiter's board
// connection (deletes the encrypted credentials + row).
export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const conn = await prisma.boardConnection.findFirst({ where: { userId: ctx.userId, tenantId: ctx.tenantId, provider: params.provider }, select: { id: true } })
  if (conn) await prisma.boardConnection.delete({ where: { id: conn.id } })
  return NextResponse.json({ ok: true })
})
