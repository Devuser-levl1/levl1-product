import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { boardCatalog } from '@/lib/hire/boards'

export const dynamic = 'force-dynamic'

// GET /api/hire/boards — the provider catalog + THIS recruiter's connections.
// NEVER returns credentials.
export const GET = withHireAuth(async (_req, ctx) => {
  const connections = await prisma.boardConnection.findMany({
    where: { userId: ctx.userId, tenantId: ctx.tenantId },
    select: { id: true, provider: true, authType: true, email: true, accountId: true, canPost: true, canSearch: true, status: true, lastError: true, lastUsedAt: true },
  })
  return NextResponse.json({ catalog: boardCatalog(), connections })
})
