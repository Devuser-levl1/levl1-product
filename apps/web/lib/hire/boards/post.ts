import { prisma } from '@/lib/prisma'
import { getConnector } from './index'
import { decryptBoardSecret } from './crypto'
import type { JobForPosting } from './types'

interface JobRow {
  id: string; title: string; description: string; location: string | null
  salaryMin: number | null; salaryMax: number | null; applySlug: string | null
  mustHaveSkills: string[]; niceToHaveSkills: string[]
  client: { name: string } | null
}

export function toJobForPosting(job: JobRow): JobForPosting {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    employmentType: 'Full Time',
    skills: [...(job.mustHaveSkills ?? []), ...(job.niceToHaveSkills ?? [])].filter(Boolean),
    companyName: job.client?.name ?? null,
    applyUrl: job.applySlug ? `${base}/hire/apply/${job.applySlug}` : base,
  }
}

export interface PostOneResult { provider: string; status: 'pending' | 'posted' | 'failed'; url?: string | null; error?: string | null }

/**
 * Post (or update) ONE provider for a job, under the recruiter's OWN connection
 * (BYOB). Persists a BoardPosting row. Tenant + user scoped by the caller via
 * the passed userId/tenantId.
 */
export async function postOne(opts: { tenantId: string; userId: string; jobId: string; job: JobForPosting; provider: string; extra?: Record<string, string> }): Promise<PostOneResult> {
  const { tenantId, userId, jobId, job, provider, extra } = opts
  const connector = getConnector(provider)
  if (!connector || !connector.capabilities.canPost || !connector.postJob) {
    return { provider, status: 'failed', error: 'This board does not support posting.' }
  }
  // BYOB: must be THIS recruiter's own connected account.
  const conn = await prisma.boardConnection.findFirst({ where: { userId, tenantId, provider, status: 'connected' } })
  const cfg = decryptBoardSecret(conn?.credentials)
  if (!conn || !cfg) {
    return { provider, status: 'failed', error: 'Board not connected — connect it in Settings first.' }
  }

  const existing = await prisma.boardPosting.findUnique({ where: { jobId_provider: { jobId, provider } } })
  const result = existing?.externalRefId && connector.updateJob
    ? await connector.updateJob(cfg, existing.externalRefId, job, extra)
    : await connector.postJob(cfg, job, extra)

  await prisma.boardPosting.upsert({
    where: { jobId_provider: { jobId, provider } },
    update: { status: result.status, externalRefId: result.externalRefId ?? existing?.externalRefId ?? null, postingUrl: result.url ?? existing?.postingUrl ?? null, errorMsg: result.error ?? null, postedAt: result.status === 'posted' ? new Date() : existing?.postedAt ?? null, lastSyncedAt: new Date() },
    create: { tenantId, jobId, provider, status: result.status, externalRefId: result.externalRefId ?? null, postingUrl: result.url ?? null, errorMsg: result.error ?? null, postedAt: result.status === 'posted' ? new Date() : null, lastSyncedAt: new Date() },
  })
  await prisma.boardConnection.update({ where: { id: conn.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return { provider, status: result.status, url: result.url ?? null, error: result.error ?? null }
}
