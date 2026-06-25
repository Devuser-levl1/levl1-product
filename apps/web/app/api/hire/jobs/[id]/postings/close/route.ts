import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { getConnector } from '@/lib/hire/boards'
import { decryptBoardSecret } from '@/lib/hire/boards/crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST /api/hire/jobs/[id]/postings/close — close a posting on one board (BYOB).
export const POST = withHireAuth(async (req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, select: { id: true } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { provider } = await req.json().catch(() => ({}))
  const posting = await prisma.boardPosting.findFirst({ where: { jobId: job.id, tenantId: ctx.tenantId, provider } })
  if (!posting) return NextResponse.json({ error: 'No posting on that board.' }, { status: 404 })

  const connector = getConnector(provider)
  const conn = await prisma.boardConnection.findFirst({ where: { userId: ctx.userId, tenantId: ctx.tenantId, provider, status: 'connected' } })
  const cfg = decryptBoardSecret(conn?.credentials)
  let note: string | null = null
  if (connector?.closeJob && cfg && posting.externalRefId) {
    const res = await connector.closeJob(cfg, posting.externalRefId)
    note = res.error ?? null
  }
  await prisma.boardPosting.update({ where: { id: posting.id }, data: { status: 'closed', errorMsg: note, lastSyncedAt: new Date() } })
  return NextResponse.json({ ok: true, status: 'closed', note })
})
