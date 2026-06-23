import { prisma } from '@/lib/prisma'

export type AuditAction = 'stage_move' | 'reject' | 'delete'

interface AuditInput {
  tenantId: string
  actorUserId?: string | null
  action: AuditAction
  candidateId?: string | null
  candidateName: string
  jobId?: string | null
  fromStage?: string | null
  toStage?: string | null
  reason?: string | null
}

/** Resolve a Hire user's display name for an actor-name snapshot. */
export async function resolveActorName(userId?: string | null): Promise<string | null> {
  if (!userId) return null
  const u = await prisma.hireUser.findUnique({ where: { id: userId }, select: { name: true } }).catch(() => null)
  return u?.name ?? null
}

/**
 * Append a tenant-scoped audit-log entry (who, what, when, reason). Best-effort:
 * never throws into the request path — a failed audit must not block the action.
 * Returns the resolved actor name so callers can also snapshot it elsewhere.
 */
export async function writeAudit(input: AuditInput): Promise<string | null> {
  const actorName = await resolveActorName(input.actorUserId)
  try {
    await prisma.hireAuditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId ?? null,
        actorName,
        action: input.action,
        candidateId: input.candidateId ?? null,
        candidateName: input.candidateName,
        jobId: input.jobId ?? null,
        fromStage: input.fromStage ?? null,
        toStage: input.toStage ?? null,
        reason: input.reason ?? null,
      },
    })
  } catch (e) {
    console.error('[hire/audit] writeAudit failed:', e instanceof Error ? e.message : e)
  }
  return actorName
}

// Lifecycle constants (reason presets, Rejected stage name) live in a client-safe
// module so the pipeline UI can import them without pulling in prisma.
export { REJECT_REASONS, DELETE_REASONS, REJECTED_STAGE } from '@/lib/hire/lifecycle'
