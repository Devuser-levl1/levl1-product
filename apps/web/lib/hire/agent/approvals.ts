import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/hire/audit'
import type { HireAgentProposal } from '@prisma/client'
import type { AgentCtx } from './tools'

// ── Approval-gate pipeline (Part A of the agent substrate) ──────────────────
// Generic 'agent proposes → human approves/rejects → tools execute → logged'
// flow. Any agent type registers an executor; the substrate handles status
// transitions, guardrails and audit attribution — no per-agent plumbing.

export interface ProposalInput {
  tenantId: string
  type: string
  agent?: string
  title: string
  summary?: string | null
  payload: Record<string, unknown>
  options?: unknown
  sourceType?: string | null
  sourceId?: string | null
  createdByUserId?: string | null
}

/** An executor turns an APPROVED proposal + the human's chosen option into a result. */
export type ProposalExecutor = (
  ctx: AgentCtx,
  proposal: HireAgentProposal,
  chosenOption: unknown,
) => Promise<{ summary: string; result: Record<string, unknown> }>

const EXECUTORS = new Map<string, ProposalExecutor>()

/** Register the executor for a proposal `type`. Call at module load. */
export function registerExecutor(type: string, exec: ProposalExecutor): void {
  EXECUTORS.set(type, exec)
}

export function hasExecutor(type: string): boolean {
  return EXECUTORS.has(type)
}

/** Create a pending proposal. Nothing executes here — this is a suggestion only. */
export async function createProposal(input: ProposalInput): Promise<HireAgentProposal> {
  return prisma.hireAgentProposal.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      agent: input.agent ?? 'Levl1 Agent',
      status: 'pending',
      title: input.title,
      summary: input.summary ?? null,
      payload: input.payload as object,
      options: (input.options ?? undefined) as object | undefined,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      createdByUserId: input.createdByUserId ?? null,
    },
  })
}

async function loadPending(tenantId: string, id: string): Promise<HireAgentProposal | null> {
  const p = await prisma.hireAgentProposal.findFirst({ where: { id, tenantId } })
  return p
}

/**
 * Approve a proposal and run its executor. The tool chain runs ONLY here, with
 * ctx.proposalId set so consequential tools are unlocked. On success the
 * proposal is marked executed and a single 'agent_execute' audit row attributes
 * it to 'Levl1 Agent (approved by <user>)'.
 */
export async function approveProposal(
  tenantId: string,
  id: string,
  ctx: { userId: string; role: string; approvedByName: string },
  chosenOption: unknown,
): Promise<{ ok: boolean; status: string; summary?: string; result?: Record<string, unknown>; error?: string }> {
  const proposal = await loadPending(tenantId, id)
  if (!proposal) return { ok: false, status: 'not_found', error: 'Proposal not found' }
  if (proposal.status !== 'pending') return { ok: false, status: proposal.status, error: `Proposal is already ${proposal.status}` }

  const exec = EXECUTORS.get(proposal.type)
  if (!exec) return { ok: false, status: 'failed', error: `No executor registered for "${proposal.type}"` }

  await prisma.hireAgentProposal.update({ where: { id }, data: { status: 'approved', resolvedByUserId: ctx.userId, chosenOption: (chosenOption ?? undefined) as object | undefined } })

  const toolCtx: AgentCtx = { tenantId, userId: ctx.userId, role: ctx.role, proposalId: id, approvedByName: ctx.approvedByName }
  try {
    const { summary, result } = await exec(toolCtx, proposal, chosenOption)
    await prisma.hireAgentProposal.update({ where: { id }, data: { status: 'executed', result: result as object } })
    await logAudit({
      tenantId, actorUserId: ctx.userId, actorName: `Levl1 Agent (approved by ${ctx.approvedByName})`,
      action: 'agent_execute', targetType: 'agent', targetId: id, targetName: proposal.title,
      meta: { proposalId: id, type: proposal.type, summary, ...result },
    })
    return { ok: true, status: 'executed', summary, result }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Execution failed'
    await prisma.hireAgentProposal.update({ where: { id }, data: { status: 'failed', error } })
    console.error('[agent/approvals] execute failed for', id, '-', error)
    return { ok: false, status: 'failed', error }
  }
}

/** Reject a proposal — nothing executes; status becomes 'rejected'. */
export async function rejectProposal(tenantId: string, id: string, userId: string): Promise<{ ok: boolean; status: string }> {
  const proposal = await loadPending(tenantId, id)
  if (!proposal) return { ok: false, status: 'not_found' }
  if (proposal.status !== 'pending') return { ok: false, status: proposal.status }
  await prisma.hireAgentProposal.update({ where: { id }, data: { status: 'rejected', resolvedByUserId: userId } })
  return { ok: true, status: 'rejected' }
}
