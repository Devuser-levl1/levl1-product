import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { listBoards, getConnector, JobForPosting } from '@/lib/jobboards'
import { decryptJson } from '@/lib/jobboards/crypto'

export const dynamic = 'force-dynamic'

async function loadJob(id: string, tenantId: string) {
  return prisma.hireJob.findFirst({ where: { id, tenantId }, include: { client: { select: { name: true } } } })
}

function toJobForPosting(job: NonNullable<Awaited<ReturnType<typeof loadJob>>>): JobForPosting {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    department: job.department,
    location: job.location,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    companyName: job.client?.name ?? null,
    applyUrl: `${appUrl}/hire/apply/${job.applySlug}`,
  }
}

// GET — available boards + current posting status per board for this job.
export const GET = withHireAuth(async (_req, ctx, params) => {
  const job = await loadJob(params.id, ctx.tenantId)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [connectors, postings] = await Promise.all([
    prisma.jobBoardConnector.findMany({ where: { tenantId: ctx.tenantId } }),
    prisma.jobPosting.findMany({ where: { hireJobId: job.id }, orderBy: { createdAt: 'desc' } }),
  ])
  const connectorByBoard = new Map(connectors.map((c) => [c.board, c]))
  // Latest posting per board.
  const postingByBoard = new Map<string, typeof postings[number]>()
  for (const p of postings) if (!postingByBoard.has(p.board)) postingByBoard.set(p.board, p)

  const boards = listBoards().map((b) => {
    const conn = connectorByBoard.get(b.board)
    const posting = postingByBoard.get(b.board)
    return {
      ...b,
      connected: conn ? conn.active : false,
      mode: conn?.mode ?? b.mode,
      posting: posting ? { id: posting.id, status: posting.status, externalUrl: posting.externalUrl, postedAt: posting.postedAt, error: posting.error } : null,
    }
  })
  return NextResponse.json({ boards })
})

// POST — { boards: string[] } → create JobPosting rows + invoke connectors.
// Per-board results; one board failing never blocks the others.
export const POST = withHireAuth(async (req, ctx, params) => {
  const job = await loadJob(params.id, ctx.tenantId)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const boards: string[] = Array.isArray(body.boards) ? body.boards : []
  if (boards.length === 0) return NextResponse.json({ error: 'Select at least one board' }, { status: 400 })

  const jobData = toJobForPosting(job)
  const connectors = await prisma.jobBoardConnector.findMany({ where: { tenantId: ctx.tenantId } })
  const connectorByBoard = new Map(connectors.map((c) => [c.board, c]))

  const results = await Promise.all(boards.map(async (board) => {
    const connector = getConnector(board)
    if (!connector) return { board, status: 'failed' as const, error: 'Unknown board' }
    if (connector.comingSoon) return { board, status: 'failed' as const, error: `${connector.label} is coming soon.` }

    try {
      const tenantConn = connectorByBoard.get(board)
      const creds = tenantConn?.credentials ? decryptJson<Record<string, unknown>>(tenantConn.credentials as string) ?? undefined : undefined
      const result = await connector.post(jobData, creds)

      const posting = await prisma.jobPosting.create({
        data: {
          hireJobId: job.id,
          board,
          status: result.status,
          externalId: result.externalId ?? null,
          externalUrl: result.externalUrl ?? null,
          postedAt: result.status === 'posted' ? new Date() : null,
          error: result.error ?? null,
        },
      })
      return { board, postingId: posting.id, status: result.status, externalUrl: result.externalUrl, error: result.error, payload: result.payload }
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Post failed'
      const posting = await prisma.jobPosting.create({ data: { hireJobId: job.id, board, status: 'failed', error } })
      return { board, postingId: posting.id, status: 'failed' as const, error }
    }
  }))

  return NextResponse.json({ results })
})
