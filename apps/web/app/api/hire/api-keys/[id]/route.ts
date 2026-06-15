import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Revoke an API key (soft — sets revokedAt so it can no longer authenticate).
export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const key = await prisma.apiKey.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } })
  return NextResponse.json({ success: true })
})
