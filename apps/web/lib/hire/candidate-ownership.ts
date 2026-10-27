import { prisma } from '@/lib/prisma'
import type { Prisma, PrismaClient } from '@prisma/client'

// Per-job candidate ownership (soft lock) + duplicate prevention. One place that
// every entry point (apply, email résumé, manual add, bulk/sourcing import,
// agent) funnels through, so dedupe + first-recruiter-wins ownership behave
// identically everywhere. Scope is ALWAYS a single candidate+job pairing.

type Db = PrismaClient | Prisma.TransactionClient

/** A terminal hiring decision releases the claim (no auto-release on inactivity). */
export const TERMINAL_STAGE = /^(hired|rejected|withdrawn|placed|declined)$/i
export function isTerminalStage(stage: string | null | undefined): boolean {
  return !!stage && TERMINAL_STAGE.test(stage.trim())
}

export interface Identity { email?: string | null; phone?: string | null; name?: string | null }

/**
 * Normalized identity key for the per-job unique constraint. Email is primary;
 * phone then name are the fallback (spec §1). Returns null when nothing usable
 * is present (→ row is left unconstrained, e.g. an anonymous talent-pool entry).
 */
export function dedupeKeyFor({ email, phone, name }: Identity): string | null {
  const e = (email ?? '').trim().toLowerCase()
  if (e) return `e:${e}`
  const p = (phone ?? '').replace(/[^\d]/g, '')
  if (p.length >= 6) return `p:${p}`
  const n = (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (n) return `n:${n}`
  return null
}

export type AttributionEventType =
  | 'sourced' | 'added_to_job' | 'owner_claimed' | 'owner_released'
  | 'reassigned' | 'advanced' | 'placed' | 'owner_override'

/** Append one immutable attribution event (never updated/deleted). Best-effort. */
export async function logAttribution(db: Db, e: {
  tenantId: string; candidateId: string; jobId?: string | null
  eventType: AttributionEventType; actorUserId?: string | null; fromUserId?: string | null; note?: string | null
}): Promise<void> {
  await db.candidateAttributionEvent.create({
    data: {
      tenantId: e.tenantId, candidateId: e.candidateId, jobId: e.jobId ?? null,
      eventType: e.eventType, actorUserId: e.actorUserId ?? null, fromUserId: e.fromUserId ?? null, note: e.note ?? null,
    },
  }).catch((err) => console.error('[attribution] log failed:', err instanceof Error ? err.message : err))
}

/** Notify the previous owner (email, best-effort) that their candidate was taken
 *  over / reassigned. In-app surfacing is the attribution timeline + owner badge. */
export async function notifyPreviousOwner(tenantId: string, prevOwnerId: string, actorUserId: string, candidateId: string, candidateName: string, jobId: string | null): Promise<void> {
  const [prev, actor, job] = await Promise.all([
    prisma.hireUser.findFirst({ where: { id: prevOwnerId, tenantId }, select: { email: true, name: true } }),
    prisma.hireUser.findFirst({ where: { id: actorUserId, tenantId }, select: { name: true } }),
    jobId ? prisma.hireJob.findFirst({ where: { id: jobId, tenantId }, select: { title: true } }) : Promise.resolve(null),
  ])
  if (!prev?.email) return
  const by = actor?.name ?? 'A teammate'
  const forJob = job?.title ? ` for ${job.title}` : ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  const { sendHireEmail } = await import('@/lib/hire/email')
  await sendHireEmail({
    to: prev.email,
    subject: `${candidateName} was reassigned${forJob}`,
    html: `<p><strong>${by}</strong> has taken over <strong>${candidateName}</strong>${forJob} in HirePilot.</p><p>You were the previous owner. If this wasn't expected, reach out to your manager.</p><p><a href="${appUrl}/hire/candidates">Open HirePilot →</a></p>`,
  }).catch(() => {})
}

export interface OwnerInfo { id: string; name: string | null }

/** Resolve an owner's display name (tenant-scoped). */
export async function ownerInfo(db: Db, tenantId: string, ownerRecruiterId: string | null | undefined): Promise<OwnerInfo | null> {
  if (!ownerRecruiterId) return null
  const u = await db.hireUser.findFirst({ where: { id: ownerRecruiterId, tenantId }, select: { id: true, name: true } })
  return u ? { id: u.id, name: u.name } : { id: ownerRecruiterId, name: null }
}

/**
 * Find an existing candidate already ON a specific job, matched by identity:
 * email first, then phone, then name (spec §5). Tenant- and job-scoped.
 */
export async function findCandidateOnJob(db: Db, tenantId: string, jobId: string, id: Identity) {
  const email = (id.email ?? '').trim().toLowerCase()
  const phone = (id.phone ?? '').replace(/[^\d]/g, '')
  const name = (id.name ?? '').trim()
  const base = { tenantId, jobId }
  if (email) {
    const byEmail = await db.hireCandidate.findFirst({ where: { ...base, email } })
    if (byEmail) return byEmail
  }
  if (phone.length >= 6) {
    const byPhone = await db.hireCandidate.findFirst({ where: { ...base, phone: { contains: phone.slice(-10) } } })
    if (byPhone) return byPhone
  }
  if (!email && name) {
    const byName = await db.hireCandidate.findFirst({ where: { ...base, name: { equals: name, mode: 'insensitive' } } })
    if (byName) return byName
  }
  return null
}

/** Earliest existing row for this identity ANYWHERE in the tenant (any job),
 *  used to inherit the original candidate-level sourcedBy for a new row. */
async function findSourcedInTenant(tenantId: string, id: Identity): Promise<{ sourcedByUserId: string | null; sourcedAt: Date | null } | null> {
  const email = (id.email ?? '').trim().toLowerCase()
  const phone = (id.phone ?? '').replace(/[^\d]/g, '')
  const name = (id.name ?? '').trim()
  const or: Prisma.HireCandidateWhereInput[] = []
  if (email) or.push({ email })
  else if (phone.length >= 6) or.push({ phone: { contains: phone.slice(-10) } })
  else if (name) or.push({ name: { equals: name, mode: 'insensitive' } })
  if (or.length === 0) return null
  return prisma.hireCandidate.findFirst({
    where: { tenantId, OR: or },
    orderBy: { createdAt: 'asc' },
    select: { sourcedByUserId: true, sourcedAt: true },
  })
}

export interface AddResult {
  candidate: Awaited<ReturnType<typeof prisma.hireCandidate.create>>
  /** true when a new row was created; false when an existing candidate-on-job was found. */
  created: boolean
  /** true when an existing candidate-on-this-job already existed (duplicate avoided). */
  duplicate: boolean
  /** true when the duplicate was detected by the DB unique constraint under a race. */
  raced: boolean
  owner: OwnerInfo | null
}

/**
 * Find-or-create a candidate on a job with first-recruiter-wins ownership and
 * duplicate prevention. If the candidate is already on the job → returns the
 * existing row (no duplicate). Otherwise creates it, claiming ownership for
 * `actorUserId` when given. A concurrent insert that trips the unique
 * constraint (P2002) is caught and resolved to the existing row.
 */
export async function addCandidateToJob(args: {
  tenantId: string
  jobId: string | null
  actorUserId?: string | null
  claimerName?: string | null
  data: Omit<Prisma.HireCandidateUncheckedCreateInput, 'tenantId' | 'jobId' | 'dedupeKey' | 'ownerRecruiterId' | 'claimedAt' | 'claimedBy' | 'sourcedByUserId' | 'sourcedAt' | 'addedByUserId' | 'addedAt'>
}): Promise<AddResult> {
  const { tenantId, jobId, actorUserId, claimerName, data } = args
  const identity: Identity = { email: data.email as string | null, phone: data.phone as string | null, name: data.name as string | null }
  const key = dedupeKeyFor(identity)

  // Only a candidate ON a job can be a duplicate / be owned. On a dedupe match we
  // PRESERVE the existing row untouched — sourcedBy (and owner) are never changed.
  if (jobId) {
    const existing = await findCandidateOnJob(prisma, tenantId, jobId, identity)
    if (existing) {
      return { candidate: existing, created: false, duplicate: true, raced: false, owner: await ownerInfo(prisma, tenantId, existing.ownerRecruiterId) }
    }
  }

  const now = new Date()
  const claim = jobId && actorUserId
    ? { ownerRecruiterId: actorUserId, claimedAt: now, claimedBy: claimerName ?? null }
    : {}
  // sourcedBy is CANDIDATE-LEVEL (the first person to bring this identity into the
  // tenant by ANY path). Since we store one row per candidate+job, a new row for
  // an identity already present in the tenant INHERITS the original sourcer —
  // never reset by adding the same person to another job or re-importing.
  const prior = await findSourcedInTenant(tenantId, identity)
  const isFirstInTenant = !prior
  const attribution = {
    sourcedByUserId: prior ? prior.sourcedByUserId : (actorUserId ?? null),
    sourcedAt: prior ? prior.sourcedAt : now,
    addedByUserId: jobId ? (actorUserId ?? null) : null, addedAt: jobId ? now : null,
  }

  try {
    const candidate = await prisma.hireCandidate.create({
      data: { ...data, tenantId, jobId: jobId ?? null, dedupeKey: jobId ? key : null, ...claim, ...attribution },
    })
    // 'sourced' only fires the FIRST time this identity enters the tenant.
    if (isFirstInTenant) await logAttribution(prisma, { tenantId, candidateId: candidate.id, eventType: 'sourced', actorUserId: actorUserId ?? null })
    if (jobId) {
      await logAttribution(prisma, { tenantId, candidateId: candidate.id, jobId, eventType: 'added_to_job', actorUserId: actorUserId ?? null })
      if (actorUserId) await logAttribution(prisma, { tenantId, candidateId: candidate.id, jobId, eventType: 'owner_claimed', actorUserId })
    }
    return { candidate, created: true, duplicate: false, raced: false, owner: await ownerInfo(prisma, tenantId, candidate.ownerRecruiterId) }
  } catch (e) {
    // P2002 = unique violation → a concurrent insert won the race. Resolve to the
    // existing row (its original sourcedBy/owner preserved — no second insert).
    if (e && typeof e === 'object' && (e as { code?: string }).code === 'P2002' && jobId) {
      const existing = await findCandidateOnJob(prisma, tenantId, jobId, identity)
      if (existing) return { candidate: existing, created: false, duplicate: true, raced: true, owner: await ownerInfo(prisma, tenantId, existing.ownerRecruiterId) }
    }
    throw e
  }
}
