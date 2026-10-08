import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { listBoards, getConnector, assistForBoard, JobForPosting } from '@/lib/jobboards'

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

  // Resolve "by whom" names for postings (tenant-scoped).
  const posterIds = Array.from(new Set(postings.map((p) => p.postedByUserId).filter(Boolean) as string[]))
  const posters = posterIds.length ? await prisma.hireUser.findMany({ where: { tenantId: ctx.tenantId, id: { in: posterIds } }, select: { id: true, name: true } }) : []
  const posterName = (id: string | null) => (id ? posters.find((u) => u.id === id)?.name ?? null : null)

  const boards = listBoards().map((b) => {
    const conn = connectorByBoard.get(b.board)
    const connector = getConnector(b.board)
    const posting = postingByBoard.get(b.board)
    return {
      ...b,
      enabled: conn ? conn.active : false,
      accountUrl: conn?.accountUrl ?? null,
      postUrl: connector?.postUrl ?? null,
      assistedLabel: `Assisted — posts under your own ${b.label} account`,
      posting: posting ? { id: posting.id, status: posting.status, externalUrl: posting.externalUrl, postedAt: posting.postedAt, postedBy: posterName(posting.postedByUserId), error: posting.error } : null,
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
    const tenantConn = connectorByBoard.get(board)
    if (!tenantConn || !tenantConn.active) return { board, status: 'failed' as const, error: `${connector.label} isn’t enabled — enable it in Job Boards settings first.` }

    try {
      // Assisted: generate the field-mapped, copy-ready post + deep link. We do
      // NOT post for the recruiter — they paste it under their own account.
      const assist = assistForBoard(board, jobData)
      // Track as manual_pending until the recruiter confirms they posted it.
      const existing = await prisma.jobPosting.findFirst({ where: { hireJobId: job.id, board }, orderBy: { createdAt: 'desc' } })
      const posting = existing && existing.status !== 'expired'
        ? await prisma.jobPosting.update({ where: { id: existing.id }, data: { status: 'manual_pending', error: null } })
        : await prisma.jobPosting.create({ data: { hireJobId: job.id, board, status: 'manual_pending', externalUrl: assist?.postUrl ?? null } })
      return { board, label: connector.label, postingId: posting.id, status: posting.status, postUrl: assist?.postUrl ?? null, formatted: assist?.formatted ?? null }
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Post failed'
      const posting = await prisma.jobPosting.create({ data: { hireJobId: job.id, board, status: 'failed', error } })
      return { board, postingId: posting.id, status: 'failed' as const, error }
    }
  }))

  return NextResponse.json({ results })
})
