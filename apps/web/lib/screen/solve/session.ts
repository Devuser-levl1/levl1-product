import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sanitizeTask, type WorkSampleTask } from '@/lib/screen/workspace/task'
import { sanitizeSolveConfig, type SolveConfig } from './config'

// ── Solve candidate link + lifecycle (Screen-scoped, server-only) ──────────
// The candidate has no login. The invite carries a random 32-byte token; only
// its SHA-256 is stored, so a DB read can't reconstruct a working link. Every
// candidate route resolves the submission from the token (header
// x-solve-token or the [token] path segment) — never from an id the browser
// could guess. Re-inviting rotates the token (old links stop working).

if (typeof window !== 'undefined') throw new Error('lib/screen/solve/session is server-only')

export const newToken = () => crypto.randomBytes(32).toString('base64url')
export const hashToken = (t: string) => crypto.createHash('sha256').update(`solve:${t}`).digest('hex')
const validShape = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{40,64}$/.test(t)

export const DEFENSE_MAX_MINUTES = 15

export const SUBMISSION_SELECT = {
  id: true, agencyId: true, positionId: true, candidateId: true, isDemo: true, status: true,
  task: true, config: true, invitedAt: true, expiresAt: true, startedAt: true, deadlineAt: true, submittedAt: true, autoSubmitted: true,
  language: true, consentGiven: true, consentAt: true, submissionQuality: true,
  defenseStatus: true, defenseDeadlineAt: true, defenseStartedAt: true, defenseCompletedAt: true,
  reportStatus: true,
  candidate: { select: { name: true, email: true } },
  position: { select: { title: true, company: true, voiceAccent: true, agency: { select: { name: true, senderName: true } } } },
} as const

export interface LoadedSubmission {
  id: string; agencyId: string; positionId: string; candidateId: string; isDemo: boolean; status: string
  task: WorkSampleTask; config: SolveConfig
  invitedAt: Date; expiresAt: Date; startedAt: Date | null; deadlineAt: Date | null; submittedAt: Date | null; autoSubmitted: boolean
  language: string; consentGiven: boolean; consentAt: Date | null; submissionQuality: string | null
  defenseStatus: string; defenseDeadlineAt: Date | null; defenseStartedAt: Date | null; defenseCompletedAt: Date | null
  reportStatus: string | null
  candidateName: string; positionTitle: string; company: string; orgName: string; voiceAccent: string | null
}

/** Resolve a submission from a candidate token, applying time-based transitions first. */
export async function loadByToken(token: unknown): Promise<LoadedSubmission | null> {
  if (!validShape(token)) return null
  const row = await prisma.solveSubmission.findUnique({ where: { tokenHash: hashToken(token) }, select: SUBMISSION_SELECT })
  if (!row) return null
  const task = sanitizeTask(row.task)
  if (!task) return null
  const s: LoadedSubmission = {
    id: row.id, agencyId: row.agencyId, positionId: row.positionId, candidateId: row.candidateId, isDemo: row.isDemo, status: row.status,
    task, config: sanitizeSolveConfig(row.config),
    invitedAt: row.invitedAt, expiresAt: row.expiresAt, startedAt: row.startedAt, deadlineAt: row.deadlineAt, submittedAt: row.submittedAt, autoSubmitted: row.autoSubmitted,
    language: row.language, consentGiven: row.consentGiven, consentAt: row.consentAt, submissionQuality: row.submissionQuality,
    defenseStatus: row.defenseStatus, defenseDeadlineAt: row.defenseDeadlineAt, defenseStartedAt: row.defenseStartedAt, defenseCompletedAt: row.defenseCompletedAt,
    reportStatus: row.reportStatus,
    candidateName: row.candidate.name, positionTitle: row.position.title, company: row.position.company,
    // Demo take-homes belong to the internal demo agency — show the product, not its internal name.
    orgName: row.isDemo ? 'Levl1' : (row.position.agency?.senderName || row.position.agency?.name || row.position.company),
    voiceAccent: row.position.voiceAccent,
  }
  return applyTimeTransitions(s)
}

/**
 * Lazy, idempotent time transitions (also run by the sweep):
 *   invited past expiresAt            → expired
 *   started past deadlineAt           → auto-submitted with the last autosave
 *   defense pending past its deadline → expired (the report notes it)
 */
export async function applyTimeTransitions<T extends Pick<LoadedSubmission, 'id' | 'status' | 'expiresAt' | 'deadlineAt' | 'defenseStatus' | 'defenseDeadlineAt' | 'defenseStartedAt'>>(s: T): Promise<T> {
  const now = Date.now()
  if (s.status === 'invited' && s.expiresAt.getTime() < now) {
    await prisma.solveSubmission.updateMany({ where: { id: s.id, status: 'invited' }, data: { status: 'expired' } })
    return { ...s, status: 'expired' }
  }
  if (s.status === 'started' && s.deadlineAt && s.deadlineAt.getTime() < now) {
    const { finalizeSubmission } = await import('./evaluate')
    await finalizeSubmission(s.id, { auto: true })
    const fresh = await prisma.solveSubmission.findUnique({ where: { id: s.id }, select: { status: true, defenseStatus: true, defenseDeadlineAt: true } })
    return { ...s, ...(fresh ?? {}) }
  }
  // An in-progress defense that was abandoned (tab closed) also times out.
  const defenseOverdue = (s.defenseStatus === 'pending' && s.defenseDeadlineAt && s.defenseDeadlineAt.getTime() < now)
    || (s.defenseStatus === 'in_progress' && s.defenseStartedAt && now - s.defenseStartedAt.getTime() > 3 * DEFENSE_MAX_MINUTES * 60_000)
  if (defenseOverdue) {
    const closed = s.defenseStatus === 'in_progress' ? 'completed' : 'expired'
    await prisma.solveSubmission.updateMany({ where: { id: s.id, defenseStatus: s.defenseStatus }, data: { defenseStatus: closed, ...(closed === 'completed' ? { defenseCompletedAt: new Date() } : {}) } })
    const { queueSolveReport } = await import('./report')
    queueSolveReport(s.id)
    return { ...s, defenseStatus: closed }
  }
  return s
}

/** The workspace accepts saves / runs only while the take-home is in progress. */
export const isWorking = (s: Pick<LoadedSubmission, 'status' | 'deadlineAt'>) =>
  s.status === 'started' && (!s.deadlineAt || s.deadlineAt.getTime() > Date.now())

export const MAX_CODE_CHARS = 64_000
// A take-home is longer than an interview task — more runs allowed.
export const SOLVE_MAX_EXECUTIONS = Math.max(20, Number(process.env.SOLVE_MAX_EXECUTIONS) || 150)
