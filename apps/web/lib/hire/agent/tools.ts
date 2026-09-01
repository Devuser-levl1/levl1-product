import { prisma } from '@/lib/prisma'
import { checkAllowance, incrementUsage } from '@/lib/hire/usage'
import { extractTextFromFile, extractCandidateFromResume } from '@/lib/shared/file-parsing'
import { scoreCandidateForJob } from '@/lib/hire/ai-matching'
import { logAudit } from '@/lib/hire/audit'
import { can, type Capability } from '@/lib/hire/permissions'

// ── Agent tool registry (Part A of the agent substrate) ─────────────────────
// The ONLY things an agent may do to the database. Each tool is typed,
// declares its permission + whether it's CONSEQUENTIAL (needs approval), and
// runs behind a central guardrail. Any agent workflow composes these.

/** Auth/attribution context threaded through every tool call. */
export interface AgentCtx {
  tenantId: string
  userId: string
  role: string
  /** Present only inside an APPROVED proposal execution — gates consequential tools. */
  proposalId?: string
  /** Human who approved — used for audit attribution ('Lev (approved by X)'). */
  approvedByName?: string
}

/** Thrown when a guardrail blocks a tool (missing approval, permission, usage). */
export class AgentGuardError extends Error {
  constructor(message: string, readonly code: string) { super(message) }
}

interface ToolDef<I, O> {
  name: string
  /** Consequential tools mutate user-facing state and require an approved proposal. */
  consequential: boolean
  /** Capability required to run (null = any authenticated tenant user). */
  requiredCap: Capability | null
  handler: (ctx: AgentCtx, input: I) => Promise<O>
}

function agentActor(ctx: AgentCtx): string {
  return ctx.approvedByName ? `Lev (approved by ${ctx.approvedByName})` : 'Lev'
}

// ── Tool implementations ────────────────────────────────────────────────────

export interface ParseResumeInput { contentBase64: string; filename: string; mimeType: string }
export interface ParseResumeOutput {
  resumeText: string
  fields: { name?: string; email?: string; phone?: string; currentTitle?: string; currentCompany?: string; linkedinUrl?: string; skills?: string[]; totalYears?: number | null }
}

const parseResume: ToolDef<ParseResumeInput, ParseResumeOutput> = {
  name: 'parseResume', consequential: false, requiredCap: null,
  async handler(_ctx, input) {
    const buffer = Buffer.from(input.contentBase64, 'base64')
    const text = await extractTextFromFile(buffer, input.mimeType || 'application/octet-stream', input.filename)
    if (!text || text.trim().length < 20) throw new AgentGuardError('Could not read enough text from this résumé.', 'parse_empty')
    const raw = await extractCandidateFromResume(text, input.filename) as unknown as Record<string, unknown>
    const fields: ParseResumeOutput['fields'] = {
      name: (raw.name as string) || undefined,
      email: (raw.email as string) || undefined,
      phone: (raw.phone as string) || undefined,
      currentTitle: (raw.currentTitle as string) || undefined,
      currentCompany: (raw.currentCompany as string) || undefined,
      linkedinUrl: (raw.linkedIn as string) || undefined,
      skills: Array.isArray(raw.skills) ? (raw.skills as string[]) : undefined,
      totalYears: typeof raw.totalYears === 'number' ? raw.totalYears : null,
    }
    return { resumeText: text, fields }
  },
}

export interface DedupeInput { email?: string | null; name: string }
export interface DedupeOutput { duplicate: boolean; existing?: { id: string; name: string; email: string | null } }

const dedupeCheck: ToolDef<DedupeInput, DedupeOutput> = {
  name: 'dedupeCheck', consequential: false, requiredCap: null,
  async handler(ctx, input) {
    const email = input.email?.trim().toLowerCase() || null
    const existing = await prisma.hireCandidate.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          ...(email ? [{ email }] : []),
          { name: { equals: input.name.trim(), mode: 'insensitive' as const } },
        ],
      },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: 'asc' },
    })
    return existing ? { duplicate: true, existing } : { duplicate: false }
  },
}

export interface CreateCandidateInput {
  name: string; email?: string | null; phone?: string | null; currentTitle?: string | null
  currentCompany?: string | null; linkedinUrl?: string | null; skills?: string[]; totalYears?: number | null
  resumeText?: string | null; jobId?: string | null; source?: string; stage?: string
}
export interface CreateCandidateOutput { candidateId: string }

const createCandidate: ToolDef<CreateCandidateInput, CreateCandidateOutput> = {
  name: 'createCandidate', consequential: true, requiredCap: null,
  async handler(ctx, input) {
    const allow = await checkAllowance(ctx.tenantId, 'candidate')
    if (!allow.allowed) throw new AgentGuardError(allow.message ?? 'Candidate limit reached.', allow.reason ?? 'limit')

    const candidate = await prisma.hireCandidate.create({
      data: {
        tenantId: ctx.tenantId,
        jobId: input.jobId || null,
        name: input.name.trim(),
        email: input.email ? input.email.toLowerCase() : null,
        phone: input.phone || null,
        currentTitle: input.currentTitle || null,
        currentCompany: input.currentCompany || null,
        linkedinUrl: input.linkedinUrl || null,
        totalYears: typeof input.totalYears === 'number' ? input.totalYears : null,
        ...(input.skills && input.skills.length ? { skills: input.skills } : {}),
        resumeText: input.resumeText || null,
        source: input.source || 'Résumé intake (agent)',
        currentStage: input.stage || 'Sourced',
        assigneeId: ctx.userId,
      },
    })
    await prisma.hireCandidateActivity.create({
      data: { candidateId: candidate.id, type: 'note', note: `Created by ${agentActor(ctx)} from an inbound résumé`, userId: ctx.userId },
    }).catch(() => {})
    await incrementUsage(ctx.tenantId, 'candidate')
    await logAudit({
      tenantId: ctx.tenantId, actorUserId: ctx.userId, actorName: agentActor(ctx), action: 'candidate_create',
      targetType: 'candidate', targetId: candidate.id, targetName: candidate.name,
      meta: { proposalId: ctx.proposalId, source: 'resume_intake' },
    })
    return { candidateId: candidate.id }
  },
}

export interface ScoreInput { candidateId: string; jobId: string }
export interface ScoreOutput { score: number | null; verdict: string | null }

const scoreCandidate: ToolDef<ScoreInput, ScoreOutput> = {
  name: 'scoreCandidate', consequential: false, requiredCap: null,
  async handler(ctx, input) {
    const match = await scoreCandidateForJob(ctx.tenantId, input.candidateId, input.jobId)
    return { score: match?.score ?? null, verdict: match?.verdict ?? null }
  },
}

export interface PipelineInput { candidateId: string; jobId: string }
export interface PipelineOutput { stage: string }

const addToPipeline: ToolDef<PipelineInput, PipelineOutput> = {
  name: 'addToPipeline', consequential: true, requiredCap: null,
  async handler(ctx, input) {
    const [cand, job] = await Promise.all([
      prisma.hireCandidate.findFirst({ where: { id: input.candidateId, tenantId: ctx.tenantId }, select: { id: true } }),
      prisma.hireJob.findFirst({ where: { id: input.jobId, tenantId: ctx.tenantId }, select: { id: true, stages: true } }),
    ])
    if (!cand || !job) throw new AgentGuardError('Candidate or job not found in this tenant.', 'not_found')
    const stages = Array.isArray(job.stages) ? (job.stages as string[]) : []
    const stage = stages[0] ?? 'Sourced'
    await prisma.hireCandidate.update({ where: { id: cand.id }, data: { jobId: job.id, currentStage: stage } })
    await prisma.hireCandidateActivity.create({
      data: { candidateId: cand.id, type: 'stage_change', toStage: stage, note: `Added to pipeline by ${agentActor(ctx)}`, userId: ctx.userId },
    }).catch(() => {})
    return { stage }
  },
}

export interface TalentPoolInput { candidateId: string }
export interface TalentPoolOutput { ok: true }

const addToTalentPool: ToolDef<TalentPoolInput, TalentPoolOutput> = {
  name: 'addToTalentPool', consequential: true, requiredCap: null,
  async handler(ctx, input) {
    // A candidate with no jobId already lives in the talent pool; keep it jobless
    // and record the decision.
    const cand = await prisma.hireCandidate.findFirst({ where: { id: input.candidateId, tenantId: ctx.tenantId }, select: { id: true } })
    if (!cand) throw new AgentGuardError('Candidate not found in this tenant.', 'not_found')
    await prisma.hireCandidate.update({ where: { id: cand.id }, data: { jobId: null } })
    await prisma.hireCandidateActivity.create({
      data: { candidateId: cand.id, type: 'note', note: `Added to talent pool by ${agentActor(ctx)} (no job selected)`, userId: ctx.userId },
    }).catch(() => {})
    return { ok: true }
  },
}

// Registry — the closed set of agent-invokable actions.
export const AGENT_TOOLS = { parseResume, dedupeCheck, createCandidate, scoreCandidate, addToPipeline, addToTalentPool } as const
export type AgentToolName = keyof typeof AGENT_TOOLS

/**
 * Central guardrail — every tool call goes through here so every agent inherits:
 *  - tenant scope (tools only ever touch ctx.tenantId),
 *  - permission/capability checks,
 *  - "never run a CONSEQUENTIAL tool without an approved proposal",
 *  - (usage/trial limits are enforced inside the mutating tools).
 */
export async function runTool<N extends AgentToolName>(
  name: N,
  ctx: AgentCtx,
  input: Parameters<(typeof AGENT_TOOLS)[N]['handler']>[1],
): Promise<Awaited<ReturnType<(typeof AGENT_TOOLS)[N]['handler']>>> {
  const tool = AGENT_TOOLS[name] as ToolDef<unknown, unknown>
  if (tool.consequential && !ctx.proposalId) {
    throw new AgentGuardError(`"${name}" is consequential and requires an approved proposal.`, 'needs_approval')
  }
  if (tool.requiredCap && !can(ctx.role, tool.requiredCap)) {
    throw new AgentGuardError(`Your role can't run "${name}".`, 'forbidden')
  }
  return tool.handler(ctx, input) as Promise<Awaited<ReturnType<(typeof AGENT_TOOLS)[N]['handler']>>>
}

/** Introspection for docs/tests — the declared shape of each tool. */
export const AGENT_TOOL_MANIFEST = Object.values(AGENT_TOOLS).map((t) => ({
  name: t.name, consequential: t.consequential, requiredCap: t.requiredCap,
}))
