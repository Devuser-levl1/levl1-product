import { prisma } from '@/lib/prisma'
import { matchJobsForCandidate, type CandidateForMatch, type JobForMatch } from '@/lib/hire/ai-matching'
import { registerExecutor, createProposal, type ProposalExecutor } from './approvals'
import { runTool, type AgentCtx } from './tools'

// ── Résumé-intake workflow (Part B — first consumer of the substrate) ────────
// Builds an approval proposal for an inbound résumé (parse + best-fit jobs),
// and — only on approval — runs the tool chain via the substrate.

const TYPE = 'resume_intake'

interface ChosenOption { kind: 'job' | 'talent_pool'; jobId?: string }

// Options carry BOTH a generic display (label/sublabel — so the approval card
// stays agent-agnostic) AND the executor payload (kind/jobId).
interface JobOption { kind: 'job'; jobId: string; label: string; sublabel?: string }
interface PoolOption { kind: 'talent_pool'; label: string; sublabel?: string }
type CardOption = JobOption | PoolOption

/**
 * Suggestion phase (read-only): parse the résumé, match it to open jobs, check
 * for a likely duplicate, and persist a pending proposal rendered as an approval
 * card. No candidate is created here — that waits for human approval.
 * Returns the proposal id (or null if the résumé couldn't be read).
 */
export async function buildResumeProposal(opts: {
  tenantId: string
  attachmentId: string
  messageId: string
  fromName: string | null
  fromAddr: string
  assigneeUserId?: string | null
}): Promise<string | null> {
  const att = await prisma.mailboxAttachment.findFirst({ where: { id: opts.attachmentId, tenantId: opts.tenantId } })
  if (!att) return null

  // A neutral ctx for the read-only suggestion tools (no proposalId → consequential tools stay locked).
  const suggestCtx: AgentCtx = { tenantId: opts.tenantId, userId: opts.assigneeUserId ?? '', role: 'ADMIN' }

  let parsed
  try {
    parsed = await runTool('parseResume', suggestCtx, { contentBase64: att.contentBase64, filename: att.filename, mimeType: att.mimeType })
  } catch (e) {
    console.warn('[resume-intake] parse failed for attachment', att.id, '-', e instanceof Error ? e.message : e)
    return null
  }
  const f = parsed.fields
  const candidateName = f.name || opts.fromName || opts.fromAddr.split('@')[0]

  // Dedupe (read-only) — flag a likely duplicate BEFORE anything is created.
  const dedupe = await runTool('dedupeCheck', suggestCtx, { email: f.email ?? null, name: candidateName })

  // Best-fit open jobs.
  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: opts.tenantId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' }, take: 20,
    select: { id: true, title: true, description: true, mustHaveSkills: true, niceToHaveSkills: true, screeningCriteria: true },
  })
  const candidateForMatch: CandidateForMatch = {
    id: 'inbound', name: candidateName, currentTitle: f.currentTitle ?? null, currentCompany: f.currentCompany ?? null,
    totalYears: f.totalYears ?? null, skills: f.skills ?? [], resumeText: parsed.resumeText,
  }
  const jobsForMatch: JobForMatch[] = jobs.map((j) => ({ id: j.id, title: j.title, description: j.description, mustHaveSkills: j.mustHaveSkills, niceToHaveSkills: j.niceToHaveSkills, screeningCriteria: j.screeningCriteria }))
  const matches = jobs.length ? await matchJobsForCandidate(candidateForMatch, jobsForMatch).catch(() => []) : []
  const top = matches.sort((a, b) => b.score - a.score).slice(0, 3)

  const options: CardOption[] = [
    ...top.map((m): JobOption => ({ kind: 'job', jobId: m.jobId, label: `${m.title} — ${m.score}%`, sublabel: m.reasons?.[0] ?? '' })),
    { kind: 'talent_pool', label: 'Add to talent pool', sublabel: 'No job selected' },
  ]

  const fitLine = top.length ? top.map((m) => `${m.title} ${m.score}%`).join(', ') : 'no strong job match'
  const proposal = await createProposal({
    tenantId: opts.tenantId,
    type: TYPE,
    title: `Résumé from ${opts.fromName || opts.fromAddr}${candidateName && candidateName !== (opts.fromName || opts.fromAddr) ? ` — ${candidateName}` : ''}`,
    summary: `Best fit: ${fitLine}. Add to which?${dedupe.duplicate ? ` ⚠ Likely duplicate of an existing candidate (${dedupe.existing?.name}).` : ''}`,
    payload: {
      attachmentId: att.id,
      messageId: opts.messageId,
      filename: att.filename,
      from: { name: opts.fromName, addr: opts.fromAddr },
      parsedFields: f,
      duplicateOf: dedupe.duplicate ? dedupe.existing : null,
    },
    options,
    sourceType: 'mailbox_message',
    sourceId: opts.messageId,
    createdByUserId: opts.assigneeUserId ?? null,
  })
  return proposal.id
}

/**
 * Execution phase (on approval): re-run the full tool chain via the substrate —
 * parseResume → dedupeCheck → createCandidate (or reuse the duplicate) →
 * scoreCandidate → addToPipeline / addToTalentPool. Consequential tools only run
 * because ctx.proposalId is set (approved).
 */
const executor: ProposalExecutor = async (ctx, proposal, chosenOptionRaw) => {
  const payload = proposal.payload as {
    attachmentId: string; from: { name: string | null; addr: string }; filename: string
  }
  const chosen = (chosenOptionRaw ?? {}) as ChosenOption
  if (chosen.kind !== 'job' && chosen.kind !== 'talent_pool') throw new Error('Choose a job or the talent pool to approve.')

  const att = await prisma.mailboxAttachment.findFirst({ where: { id: payload.attachmentId, tenantId: ctx.tenantId } })
  if (!att) throw new Error('The résumé attachment is no longer available.')

  // 1) parse (fresh, authoritative)
  const parsed = await runTool('parseResume', ctx, { contentBase64: att.contentBase64, filename: att.filename, mimeType: att.mimeType })
  const f = parsed.fields
  const name = f.name || payload.from.name || payload.from.addr.split('@')[0]

  // 2) dedupe BEFORE creating
  const dedupe = await runTool('dedupeCheck', ctx, { email: f.email ?? null, name })

  let candidateId: string
  let duplicate = false
  if (dedupe.duplicate && dedupe.existing) {
    candidateId = dedupe.existing.id
    duplicate = true
  } else {
    // 3) create
    const created = await runTool('createCandidate', ctx, {
      name, email: f.email ?? null, phone: f.phone ?? null, currentTitle: f.currentTitle ?? null,
      currentCompany: f.currentCompany ?? null, linkedinUrl: f.linkedinUrl ?? null, skills: f.skills ?? [],
      totalYears: f.totalYears ?? null, resumeText: parsed.resumeText,
      jobId: chosen.kind === 'job' ? chosen.jobId : null, source: 'Résumé intake (agent)',
    })
    candidateId = created.candidateId
  }

  // 4/5) score + pipeline, or talent pool
  const result: Record<string, unknown> = { candidateId, duplicate }
  if (chosen.kind === 'job' && chosen.jobId) {
    const score = await runTool('scoreCandidate', ctx, { candidateId, jobId: chosen.jobId })
    const pipe = await runTool('addToPipeline', ctx, { candidateId, jobId: chosen.jobId })
    result.jobId = chosen.jobId; result.score = score.score; result.stage = pipe.stage
  } else {
    await runTool('addToTalentPool', ctx, { candidateId })
    result.talentPool = true
  }

  const who = duplicate ? `matched existing candidate` : `created candidate`
  const where = chosen.kind === 'job' ? `and added to the pipeline (${result.stage}${result.score != null ? `, ${result.score}%` : ''})` : 'and added to the talent pool'
  return { summary: `Résumé intake: ${who} ${where}.`, result }
}

registerExecutor(TYPE, executor)
