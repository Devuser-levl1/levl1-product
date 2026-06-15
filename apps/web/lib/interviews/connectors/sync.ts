import { prisma } from '@/lib/prisma'
import { decryptJson } from '@/lib/jobboards/crypto'
import { getConnector } from './index'
import { ConnectorContext } from './types'

// ── Connector sync service (Phase 3) ───────────────────────────────────────
// Pulls jobs → Positions and candidates → Candidates for a connection,
// idempotently (dedupe by external id via AtsSyncedRecord). Provider-agnostic:
// it only speaks the normalized shapes from the connector interface.

export interface SyncSummary {
  jobs: { created: number; updated: number }
  candidates: { created: number; updated: number; skipped: number }
  errors: string[]
}

function buildContext(connection: { agencyId: string; credentials: string | null; config: unknown }): ConnectorContext {
  const credentials = connection.credentials ? (decryptJson<Record<string, unknown>>(connection.credentials) ?? {}) : {}
  const config = (connection.config && typeof connection.config === 'object' ? connection.config : {}) as Record<string, unknown>
  return { agencyId: connection.agencyId, credentials, config }
}

export async function runSync(connectionId: string): Promise<SyncSummary> {
  const connection = await prisma.atsConnection.findUnique({ where: { id: connectionId } })
  if (!connection) throw new Error('Connection not found')

  const ctx = buildContext(connection)
  const connector = getConnector(connection.provider, ctx)
  const summary: SyncSummary = { jobs: { created: 0, updated: 0 }, candidates: { created: 0, updated: 0, skipped: 0 }, errors: [] }

  try {
    // ── Jobs → Positions ──
    const jobs = await connector.listJobs()
    // external job id → internal Position id (for candidate linkage).
    const jobMap = new Map<string, string>()
    for (const j of jobs) {
      const existing = await prisma.atsSyncedRecord.findUnique({ where: { connectionId_kind_externalId: { connectionId, kind: 'job', externalId: j.externalId } } })
      if (existing) {
        await prisma.position.update({
          where: { id: existing.internalId },
          data: { title: j.title, company: j.company ?? 'Confidential', department: j.department, jdText: j.description ?? undefined },
        }).catch(() => {})
        jobMap.set(j.externalId, existing.internalId)
        summary.jobs.updated++
      } else {
        const position = await prisma.position.create({
          data: {
            title: j.title,
            company: j.company ?? 'Confidential',
            department: j.department,
            experienceLevel: 'Mid',
            jdText: j.description,
            jdSource: 'imported',
            status: 'draft',
            agencyId: connection.agencyId,
            interviewDuration: 30,
          },
        })
        await prisma.atsSyncedRecord.create({ data: { connectionId, kind: 'job', externalId: j.externalId, internalId: position.id } })
        jobMap.set(j.externalId, position.id)
        summary.jobs.created++
      }
    }

    // ── Candidates → Candidates (only those whose job was imported) ──
    const candidates = await connector.listCandidates()
    for (const c of candidates) {
      if (!c.email) { summary.candidates.skipped++; continue }
      const positionId = c.externalJobId ? jobMap.get(c.externalJobId) : undefined
      if (!positionId) { summary.candidates.skipped++; continue }

      const existing = await prisma.atsSyncedRecord.findUnique({ where: { connectionId_kind_externalId: { connectionId, kind: 'candidate', externalId: c.externalId } } })
      const data = {
        name: c.name, email: c.email.toLowerCase(), phone: c.phone,
        currentTitle: c.currentTitle, currentCompany: c.currentCompany, linkedIn: c.linkedIn,
        topSkills: c.skills, resumeText: c.resumeText, positionId,
      }
      if (existing) {
        await prisma.candidate.update({ where: { id: existing.internalId }, data }).catch(() => {})
        summary.candidates.updated++
      } else {
        const created = await prisma.candidate.create({ data: { ...data, status: 'pending' } })
        await prisma.atsSyncedRecord.create({ data: { connectionId, kind: 'candidate', externalId: c.externalId, internalId: created.id } })
        summary.candidates.created++
      }
    }

    await prisma.atsConnection.update({ where: { id: connectionId }, data: { lastSyncedAt: new Date(), status: 'connected', lastError: null } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sync failed'
    summary.errors.push(msg)
    await prisma.atsConnection.update({ where: { id: connectionId }, data: { status: 'error', lastError: msg } }).catch(() => {})
  }

  return summary
}
