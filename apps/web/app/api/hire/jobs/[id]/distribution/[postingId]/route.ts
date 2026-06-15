import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { getConnector } from '@/lib/jobboards'
import { decryptJson } from '@/lib/jobboards/crypto'

export const dynamic = 'force-dynamic'

async function loadPosting(postingId: string, jobId: string, tenantId: string) {
  return prisma.jobPosting.findFirst({ where: { id: postingId, hireJobId: jobId, hireJob: { tenantId } } })
}

// DELETE — expire/remove a posting. Calls the connector's expire() in API mode
// when an externalId exists, then marks the posting expired (history kept).
export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const posting = await loadPosting(params.postingId, params.id, ctx.tenantId)
  if (!posting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (posting.externalId) {
    const connector = getConnector(posting.board)
    if (connector?.expire) {
      try {
        const tc = await prisma.jobBoardConnector.findUnique({ where: { tenantId_board: { tenantId: ctx.tenantId, board: posting.board } } })
        const creds = tc?.credentials ? decryptJson<Record<string, unknown>>(tc.credentials as string) ?? undefined : undefined
        await connector.expire(posting.externalId, creds)
      } catch (e) {
        console.error('[distribution] expire failed (non-fatal):', e)
      }
    }
  }

  await prisma.jobPosting.update({ where: { id: posting.id }, data: { status: 'expired' } })
  return NextResponse.json({ success: true })
})

// PATCH — recruiter marks an assisted posting as posted (optionally with the
// live URL they got from the board).
export const PATCH = withHireAuth(async (req, ctx, params) => {
  const posting = await loadPosting(params.postingId, params.id, ctx.tenantId)
  if (!posting) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: { status?: string; externalUrl?: string; postedAt?: Date; error?: null } = {}
  if (body.status === 'posted') { data.status = 'posted'; data.postedAt = new Date(); data.error = null }
  if (typeof body.externalUrl === 'string' && body.externalUrl.trim()) data.externalUrl = body.externalUrl.trim()

  const updated = await prisma.jobPosting.update({ where: { id: posting.id }, data })
  return NextResponse.json(updated)
})
