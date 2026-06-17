import { prisma } from '@/lib/prisma'
import { getConnector, JobForPosting } from './index'
import { decryptJson } from './crypto'

// ── Shared Build-1 distribution core ───────────────────────────────────────
// Used by both the job-detail Distribute tab and the Sourcing Hub so outbound
// posting logic lives in ONE place.

export function toJobForPosting(job: {
  id: string; title: string; description: string; department: string | null; location: string | null
  salaryMin: number | null; salaryMax: number | null; applySlug: string; client: { name: string } | null
}): JobForPosting {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  return {
    id: job.id, title: job.title, description: job.description, department: job.department, location: job.location,
    salaryMin: job.salaryMin, salaryMax: job.salaryMax, companyName: job.client?.name ?? null,
    applyUrl: `${appUrl}/hire/apply/${job.applySlug}`,
  }
}

export interface BoardPostResult { board: string; postingId?: string; status: string; externalUrl?: string | null; error?: string; payload?: string }

// Post one job to N boards. Creates a JobPosting row per board; one board
// failing never blocks the others. Tenant scoping is the caller's job (it
// passes a job it already verified belongs to the tenant).
export async function distributeJobToBoards(tenantId: string, jobId: string, boards: string[]): Promise<BoardPostResult[] | null> {
  const job = await prisma.hireJob.findFirst({ where: { id: jobId, tenantId }, include: { client: { select: { name: true } } } })
  if (!job) return null
  const jobData = toJobForPosting(job)
  const connectors = await prisma.jobBoardConnector.findMany({ where: { tenantId } })
  const connectorByBoard = new Map(connectors.map((c) => [c.board, c]))

  return Promise.all(boards.map(async (board): Promise<BoardPostResult> => {
    const connector = getConnector(board)
    if (!connector) return { board, status: 'failed', error: 'Unknown board' }
    if (connector.comingSoon) return { board, status: 'failed', error: `${connector.label} is coming soon.` }
    try {
      const tenantConn = connectorByBoard.get(board)
      const creds = tenantConn?.credentials ? decryptJson<Record<string, unknown>>(tenantConn.credentials as string) ?? undefined : undefined
      const result = await connector.post(jobData, creds)
      const posting = await prisma.jobPosting.create({
        data: { hireJobId: job.id, board, status: result.status, externalId: result.externalId ?? null, externalUrl: result.externalUrl ?? null, postedAt: result.status === 'posted' ? new Date() : null, error: result.error ?? null },
      })
      return { board, postingId: posting.id, status: result.status, externalUrl: result.externalUrl, error: result.error, payload: result.payload }
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Post failed'
      const posting = await prisma.jobPosting.create({ data: { hireJobId: job.id, board, status: 'failed', error } })
      return { board, postingId: posting.id, status: 'failed', error }
    }
  }))
}
