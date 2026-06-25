import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

// All audited actions across modules. Candidate lifecycle keeps its original
// short names (stage_move | reject | delete) for back-compat with earlier rows.
export type AuditAction =
  | 'stage_move' | 'reject' | 'delete' | 'candidate_create'
  | 'job_create' | 'job_update' | 'job_delete' | 'rubric_change'
  | 'deal_create' | 'deal_update' | 'deal_delete'
  | 'team_member_invite' | 'job_reassign' | 'candidate_reassign'

export type AuditTargetType = 'candidate' | 'job' | 'deal' | 'rubric' | 'team_member'

/** Resolve a Hire user's display name for an actor-name snapshot. */
export async function resolveActorName(userId?: string | null): Promise<string | null> {
  if (!userId) return null
  const u = await prisma.hireUser.findUnique({ where: { id: userId }, select: { name: true } }).catch(() => null)
  return u?.name ?? null
}

interface LogAuditInput {
  tenantId: string
  actorUserId?: string | null
  action: AuditAction
  targetType?: AuditTargetType | null
  targetId?: string | null
  targetName?: string | null
  fromStage?: string | null
  toStage?: string | null
  reason?: string | null
  meta?: Prisma.InputJsonValue
}

/**
 * Append a tenant-scoped audit-log entry (who, what, target, when, reason).
 * Best-effort: never throws into the request path — a failed audit must not
 * block the action. Returns the resolved actor name.
 */
export async function logAudit(input: LogAuditInput): Promise<string | null> {
  const actorName = await resolveActorName(input.actorUserId)
  try {
    await prisma.hireAuditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId ?? null,
        actorName,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        targetName: input.targetName ?? null,
        // Legacy candidate mirror — keeps the candidateId index useful for candidate rows.
        candidateId: input.targetType === 'candidate' ? (input.targetId ?? null) : null,
        candidateName: input.targetType === 'candidate' ? (input.targetName ?? null) : null,
        fromStage: input.fromStage ?? null,
        toStage: input.toStage ?? null,
        reason: input.reason ?? null,
        ...(input.meta !== undefined ? { meta: input.meta } : {}),
      },
    })
  } catch (e) {
    console.error('[hire/audit] logAudit failed:', e instanceof Error ? e.message : e)
  }
  return actorName
}

interface CandidateAuditInput {
  tenantId: string
  actorUserId?: string | null
  action: Extract<AuditAction, 'stage_move' | 'reject' | 'delete' | 'candidate_create'>
  candidateId?: string | null
  candidateName: string
  jobId?: string | null
  fromStage?: string | null
  toStage?: string | null
  reason?: string | null
}

/** Candidate-lifecycle convenience wrapper (back-compat with existing callers). */
export async function writeAudit(input: CandidateAuditInput): Promise<string | null> {
  return logAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: 'candidate',
    targetId: input.candidateId,
    targetName: input.candidateName,
    fromStage: input.fromStage,
    toStage: input.toStage,
    reason: input.reason,
  })
}

// Human-readable labels for the audit-log UI + CSV export.
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  candidate_create: 'Candidate created',
  stage_move: 'Stage moved',
  reject: 'Candidate rejected',
  delete: 'Candidate deleted',
  job_create: 'Job created',
  job_update: 'Job updated',
  job_delete: 'Job deleted',
  rubric_change: 'Rubric changed',
  deal_create: 'Deal created',
  deal_update: 'Deal updated',
  deal_delete: 'Deal deleted',
  team_member_invite: 'Team member invited',
  job_reassign: 'Job reassigned',
  candidate_reassign: 'Candidate reassigned',
}

// Lifecycle constants (reason presets, Rejected stage name) live in a client-safe
// module so the pipeline UI can import them without pulling in prisma.
export { REJECT_REASONS, DELETE_REASONS, REJECTED_STAGE } from '@/lib/hire/lifecycle'
