import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { listBoards } from '@/lib/jobboards'

export const dynamic = 'force-dynamic'

// GET — the unified sourcing surface: every board with this tenant's connection
// state + inbound capability, plus the tenant's ACTIVE jobs to distribute.
export const GET = withHireAuth(async (_req, ctx) => {
  const [connectors, jobs] = await Promise.all([
    prisma.jobBoardConnector.findMany({ where: { tenantId: ctx.tenantId } }),
    prisma.hireJob.findMany({ where: { tenantId: ctx.tenantId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true } }),
  ])
  const byBoard = new Map(connectors.map((c) => [c.board, c]))
  const boards = listBoards().map((b) => {
    const c = byBoard.get(b.board)
    return { ...b, connected: c ? c.active : false, mode: c?.mode ?? b.mode, canPull: b.inbound != null }
  })
  return NextResponse.json({ boards, jobs })
})
