import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { AtsConnector, ConnectorContext, NormalizedJob, NormalizedCandidate } from './types'

// ── Levl1 Hire connector (Phase 3 — built first) ───────────────────────────
// The "customer owns both products" flow. Levl1 Hire and Interviews share one
// app + database, so once the account link is established (here: a scoped Hire
// API key from Hire's Settings → Developers, validated to a tenantId) we read
// Hire's jobs + candidates directly via Prisma — fully controlled, no HTTP hop.
// (Phase 4 SSO will formalize the account link; the same connector logic applies
// once it resolves a tenantId.)

function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// Resolve the linked Hire tenantId from the stored credentials/config.
async function resolveTenantId(ctx: ConnectorContext): Promise<string> {
  const fromConfig = typeof ctx.config.tenantId === 'string' ? ctx.config.tenantId : null
  if (fromConfig) return fromConfig
  const apiKey = typeof ctx.credentials.hireApiKey === 'string' ? ctx.credentials.hireApiKey : null
  if (!apiKey) throw new Error('Missing Hire API key')
  const key = await prisma.apiKey.findUnique({ where: { hashedKey: hashKey(apiKey) }, select: { tenantId: true, revokedAt: true } })
  if (!key || key.revokedAt) throw new Error('Invalid or revoked Hire API key')
  return key.tenantId
}

export function levl1HireConnector(ctx: ConnectorContext): AtsConnector {
  return {
    provider: 'levl1_hire',

    async validate() {
      const tenantId = await resolveTenantId(ctx)
      const tenant = await prisma.hireTenant.findUnique({ where: { id: tenantId }, select: { name: true } })
      if (!tenant) throw new Error('Linked Hire account not found')
      // Persist the resolved tenantId so later syncs skip the key lookup.
      return { config: { tenantId, tenantName: tenant.name } }
    },

    async listJobs(): Promise<NormalizedJob[]> {
      const tenantId = await resolveTenantId(ctx)
      const jobs = await prisma.hireJob.findMany({
        where: { tenantId },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      return jobs.map((j) => ({
        externalId: j.id,
        title: j.title,
        company: j.client?.name ?? null,
        department: j.department,
        location: j.location,
        description: j.description,
        status: j.status,
      }))
    },

    async listCandidates(externalJobId?: string): Promise<NormalizedCandidate[]> {
      const tenantId = await resolveTenantId(ctx)
      const candidates = await prisma.hireCandidate.findMany({
        where: { tenantId, ...(externalJobId ? { jobId: externalJobId } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      })
      return candidates.map((c) => ({
        externalId: c.id,
        externalJobId: c.jobId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        currentTitle: c.currentTitle,
        currentCompany: c.currentCompany,
        linkedIn: c.linkedinUrl,
        skills: Array.isArray(c.skills) ? (c.skills as string[]) : [],
        resumeText: c.resumeText,
      }))
    },

    async importCandidate(externalId: string): Promise<NormalizedCandidate | null> {
      const tenantId = await resolveTenantId(ctx)
      const c = await prisma.hireCandidate.findFirst({ where: { id: externalId, tenantId } })
      if (!c) return null
      return {
        externalId: c.id,
        externalJobId: c.jobId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        currentTitle: c.currentTitle,
        currentCompany: c.currentCompany,
        linkedIn: c.linkedinUrl,
        skills: Array.isArray(c.skills) ? (c.skills as string[]) : [],
        resumeText: c.resumeText,
      }
    },
  }
}
