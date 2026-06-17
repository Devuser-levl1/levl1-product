import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { CLAUDE_MODEL } from '@/lib/ai/model'
import { matchCandidatesToJob, coerceRubric, JobForMatch, CandidateForMatch } from '@/lib/hire/ai-matching'
import { sendHireEmail } from '@/lib/hire/email'

// ── Ask Levl1 — agentic action layer ───────────────────────────────────────
// The assistant PROPOSES side-effecting actions; nothing executes until the
// user approves in the panel. Resolvers (read-only) compute the targets +
// preview; executors apply the change and log it to the activity timeline as
// "Levl1 Agent (approved by {user})". Everything is tenant-scoped.

export type AgentActionType = 'add_to_pipeline' | 'bulk_stage_move' | 'draft_outreach'

export interface ProposalItem { id: string; name: string; detail?: string; sub?: string }
export interface AgentProposal {
  actionType: AgentActionType
  title: string
  note?: string
  items: ProposalItem[]
  // Opaque payload the panel sends back to /execute on approval. Re-validated
  // (tenant ownership) server-side before anything is applied.
  payload: Record<string, unknown>
}
export type ResolveResult = { proposal: AgentProposal } | { error: string }

function toJobForMatch(j: { id: string; title: string; description: string; mustHaveSkills: string[]; niceToHaveSkills: string[]; screeningCriteria: string[]; rubric: unknown }): JobForMatch {
  return { id: j.id, title: j.title, description: j.description, mustHaveSkills: j.mustHaveSkills, niceToHaveSkills: j.niceToHaveSkills, screeningCriteria: j.screeningCriteria, rubric: coerceRubric(j.rubric) }
}

// Ensure cached HireMatch rows exist for a job (compute once if the pool was
// never ranked), then return them ordered by score.
async function ensureJobMatches(tenantId: string, jobId: string) {
  let matches = await prisma.hireMatch.findMany({ where: { tenantId, jobId }, orderBy: { score: 'desc' } })
  if (matches.length > 0) return matches
  const job = await prisma.hireJob.findFirst({ where: { id: jobId, tenantId } })
  if (!job) return []
  const pool = await prisma.hireCandidate.findMany({
    where: { tenantId, OR: [{ resumeText: { not: null } }, { skills: { not: Prisma.AnyNull } }] },
    orderBy: { createdAt: 'desc' }, take: 40,
    select: { id: true, name: true, currentTitle: true, currentCompany: true, totalYears: true, skills: true, resumeText: true },
  })
  if (pool.length === 0) return []
  const cands: CandidateForMatch[] = pool.map((c) => ({
    id: c.id, name: c.name, currentTitle: c.currentTitle, currentCompany: c.currentCompany,
    totalYears: c.totalYears, skills: Array.isArray(c.skills) ? (c.skills as string[]) : [], resumeText: c.resumeText,
  }))
  const results = await matchCandidatesToJob(toJobForMatch(job), cands)
  for (const r of results) {
    await prisma.hireMatch.upsert({
      where: { jobId_candidateId: { jobId, candidateId: r.candidateId } },
      update: { score: r.score, verdict: r.verdict, reasons: r.reasons as Prisma.InputJsonValue, matchedSkills: r.matchedSkills, missingSkills: r.missingSkills, createdAt: new Date() },
      create: { tenantId, jobId, candidateId: r.candidateId, score: r.score, verdict: r.verdict, reasons: r.reasons as Prisma.InputJsonValue, matchedSkills: r.matchedSkills, missingSkills: r.missingSkills },
    }).catch(() => {})
  }
  matches = await prisma.hireMatch.findMany({ where: { tenantId, jobId }, orderBy: { score: 'desc' } })
  return matches
}

// ── Resolvers (read-only → proposal) ───────────────────────────────────────

export async function resolveAddToPipeline(tenantId: string, jobId: string, count: number): Promise<ResolveResult> {
  const n = Math.max(1, Math.min(20, Math.round(count) || 5))
  const job = await prisma.hireJob.findFirst({ where: { id: jobId, tenantId }, select: { id: true, title: true } })
  if (!job) return { error: "I couldn't find that job in your account." }
  const matches = await ensureJobMatches(tenantId, jobId)
  if (matches.length === 0) return { error: `There are no candidates to match against ${job.title} yet — add some candidates first.` }
  const attached = new Set((await prisma.hireCandidate.findMany({ where: { tenantId, jobId }, select: { id: true } })).map((c) => c.id))
  const pick = matches.filter((m) => !attached.has(m.candidateId)).slice(0, n)
  if (pick.length === 0) return { error: `Every strong match for ${job.title} is already in the pipeline.` }
  const cands = await prisma.hireCandidate.findMany({ where: { id: { in: pick.map((p) => p.candidateId) }, tenantId }, select: { id: true, name: true, currentTitle: true } })
  const cById = new Map(cands.map((c) => [c.id, c]))
  const items: ProposalItem[] = pick.map((m) => {
    const c = cById.get(m.candidateId)
    const reasons = Array.isArray(m.reasons) ? (m.reasons as string[]) : []
    return { id: m.candidateId, name: c?.name ?? 'Candidate', detail: `Match ${m.score} · ${m.verdict}${c?.currentTitle ? ` · ${c.currentTitle}` : ''}`, sub: reasons[0] }
  })
  return { proposal: { actionType: 'add_to_pipeline', title: `Add ${items.length} candidate${items.length === 1 ? '' : 's'} to ${job.title}`, note: 'They will be added at the first pipeline stage and scored.', items, payload: { type: 'add_to_pipeline', jobId: job.id, candidateIds: pick.map((p) => p.candidateId) } } }
}

export async function resolveBulkStageMove(tenantId: string, args: { jobId?: string; minScore: number; toStage: string }): Promise<ResolveResult> {
  const minScore = Math.max(0, Math.min(100, Math.round(args.minScore)))
  const toStage = args.toStage.trim()
  if (!toStage) return { error: 'Tell me which stage to move them to.' }
  const cands = await prisma.hireCandidate.findMany({
    where: { tenantId, ...(args.jobId ? { jobId: args.jobId } : { jobId: { not: null } }) },
    select: { id: true, name: true, currentTitle: true, currentStage: true, jobId: true },
  })
  const pairs = cands.filter((c) => c.jobId).map((c) => ({ jobId: c.jobId as string, candidateId: c.id }))
  const matches = pairs.length ? await prisma.hireMatch.findMany({ where: { tenantId, OR: pairs.map((p) => ({ jobId: p.jobId, candidateId: p.candidateId })) }, select: { jobId: true, candidateId: true, score: true } }) : []
  const sById = new Map(matches.map((m) => [`${m.jobId}|${m.candidateId}`, m.score]))
  const qualifying = cands.filter((c) => { const s = c.jobId ? sById.get(`${c.jobId}|${c.id}`) : undefined; return typeof s === 'number' && s >= minScore && c.currentStage !== toStage })
  if (qualifying.length === 0) return { error: `No candidates score ${minScore}+ that aren't already in ${toStage}.` }
  const items: ProposalItem[] = qualifying.map((c) => ({ id: c.id, name: c.name, detail: `Score ${c.jobId ? sById.get(`${c.jobId}|${c.id}`) : '—'} · currently ${c.currentStage}` }))
  return { proposal: { actionType: 'bulk_stage_move', title: `Move ${items.length} candidate${items.length === 1 ? '' : 's'} to ${toStage}`, items, payload: { type: 'bulk_stage_move', candidateIds: qualifying.map((c) => c.id), toStage } } }
}

export async function resolveDraftOutreach(tenantId: string, args: { candidateIds?: string[]; jobId?: string; stage?: string }): Promise<ResolveResult> {
  let targets = args.candidateIds?.length
    ? await prisma.hireCandidate.findMany({ where: { id: { in: args.candidateIds }, tenantId }, select: candidateSel })
    : args.jobId
      ? await prisma.hireCandidate.findMany({ where: { tenantId, jobId: args.jobId, ...(args.stage ? { currentStage: args.stage } : {}) }, orderBy: { createdAt: 'desc' }, take: 5, select: candidateSel })
      : []
  targets = targets.slice(0, 5)
  if (targets.length === 0) return { error: 'Tell me which candidates to draft outreach for (by job, or after adding some to a pipeline).' }
  const job = args.jobId ? await prisma.hireJob.findFirst({ where: { id: args.jobId, tenantId }, select: { title: true, description: true } }) : targets[0].job
  const drafts = await generateOutreach(targets.map((t) => ({ id: t.id, name: t.name, title: t.currentTitle, company: t.currentCompany })), job?.title ?? 'a role', job?.description ?? '')
  const draftById = new Map(drafts.map((d) => [d.candidateId, d]))
  const items: ProposalItem[] = targets.map((t) => {
    const d = draftById.get(t.id)
    return { id: t.id, name: t.name, detail: t.email ? (d?.subject ?? 'Outreach email') : 'No email on file — will be skipped', sub: d?.body?.slice(0, 160) }
  })
  const payloadDrafts = targets.filter((t) => t.email && !t.emailOptOut).map((t) => { const d = draftById.get(t.id); return { candidateId: t.id, subject: d?.subject ?? `Opportunity: ${job?.title ?? 'a role'}`, body: d?.body ?? '' } })
  return { proposal: { actionType: 'draft_outreach', title: `Draft outreach to ${items.length} candidate${items.length === 1 ? '' : 's'}`, note: 'Review the drafts — on approval they are emailed via your Levl1 sending address.', items, payload: { type: 'draft_outreach', drafts: payloadDrafts } } }
}

const candidateSel = { id: true, name: true, currentTitle: true, currentCompany: true, email: true, emailOptOut: true, job: { select: { title: true, description: true } } } as const

async function generateOutreach(cands: { id: string; name: string; title: string | null; company: string | null }[], jobTitle: string, jobDescription: string): Promise<{ candidateId: string; subject: string; body: string }[]> {
  if (!process.env.ANTHROPIC_API_KEY) return cands.map((c) => ({ candidateId: c.id, subject: `Opportunity: ${jobTitle}`, body: `Hi ${c.name.split(' ')[0]},\n\nWe're hiring for ${jobTitle} and your background stood out. Would you be open to a quick chat?\n\nBest regards` }))
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = `Write a short, warm, personalized recruiting outreach email for EACH candidate below, for the role "${jobTitle}".
Role context: ${jobDescription.slice(0, 600) || jobTitle}

For each candidate, reference something specific (their current title/company) and keep it 4-6 sentences, friendly and professional, with a clear soft call-to-action. No placeholders like [Company].

Candidates:
${cands.map((c) => `- id:${c.id} | ${c.name}${c.title ? `, ${c.title}` : ''}${c.company ? ` at ${c.company}` : ''}`).join('\n')}

Return ONLY a JSON array (no markdown): [{ "candidateId": "id", "subject": "…", "body": "…" }]`
  try {
    const resp = await client.messages.create({ model: CLAUDE_MODEL, max_tokens: 2000, temperature: 0.6, messages: [{ role: 'user', content: prompt }] })
    const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as { candidateId: string; subject: string; body: string }[]
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error('[agent] generateOutreach failed:', e instanceof Error ? e.message : e)
    return cands.map((c) => ({ candidateId: c.id, subject: `Opportunity: ${jobTitle}`, body: `Hi ${c.name.split(' ')[0]},\n\nWe're hiring for ${jobTitle} and thought of you. Open to a quick chat?\n\nBest regards` }))
  }
}

// ── Executor (apply + log) — only called after explicit approval ───────────

function escapeHtml(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

export async function executeAgentAction(tenantId: string, userId: string, payload: Record<string, unknown>): Promise<{ ok: boolean; summary: string }> {
  const user = await prisma.hireUser.findFirst({ where: { id: userId, tenantId }, select: { name: true } })
  const tag = `Levl1 Agent (approved by ${user?.name ?? 'a teammate'})`
  const type = payload.type

  if (type === 'add_to_pipeline') {
    const jobId = String(payload.jobId ?? '')
    const ids = Array.isArray(payload.candidateIds) ? (payload.candidateIds as string[]) : []
    const job = await prisma.hireJob.findFirst({ where: { id: jobId, tenantId }, select: { id: true, title: true, stages: true } })
    if (!job) return { ok: false, summary: 'That job no longer exists.' }
    const firstStage = Array.isArray(job.stages) && job.stages.length ? String((job.stages as string[])[0]) : 'Sourced'
    let n = 0
    for (const id of ids) {
      const c = await prisma.hireCandidate.findFirst({ where: { id, tenantId }, select: { id: true, resumeText: true } })
      if (!c) continue
      await prisma.hireCandidate.update({ where: { id: c.id }, data: { jobId: job.id, currentStage: firstStage } })
      await prisma.hireCandidateActivity.create({ data: { candidateId: c.id, type: 'note', note: `${tag} — added to ${job.title} pipeline`, userId } })
      if (c.resumeText) { const { enqueue } = await import('@/lib/hire/jobs/queue'); await enqueue('hire-score-candidate', { candidateId: c.id }).catch(() => {}) }
      n++
    }
    return { ok: true, summary: `Added ${n} candidate${n === 1 ? '' : 's'} to ${job.title} at “${firstStage}”.` }
  }

  if (type === 'bulk_stage_move') {
    const ids = Array.isArray(payload.candidateIds) ? (payload.candidateIds as string[]) : []
    const toStage = String(payload.toStage ?? '')
    let n = 0
    for (const id of ids) {
      const c = await prisma.hireCandidate.findFirst({ where: { id, tenantId }, select: { id: true, currentStage: true } })
      if (!c || c.currentStage === toStage) continue
      await prisma.hireCandidateActivity.create({ data: { candidateId: c.id, type: 'stage_change', fromStage: c.currentStage, toStage, note: tag, userId } })
      await prisma.hireCandidate.update({ where: { id: c.id }, data: { currentStage: toStage } })
      n++
    }
    return { ok: true, summary: `Moved ${n} candidate${n === 1 ? '' : 's'} to “${toStage}”.` }
  }

  if (type === 'draft_outreach') {
    const drafts = Array.isArray(payload.drafts) ? (payload.drafts as { candidateId: string; subject: string; body: string }[]) : []
    let sent = 0, skipped = 0
    for (const d of drafts) {
      const c = await prisma.hireCandidate.findFirst({ where: { id: d.candidateId, tenantId }, select: { id: true, email: true, emailOptOut: true } })
      if (!c || !c.email || c.emailOptOut) { skipped++; continue }
      try {
        await sendHireEmail({ to: c.email, subject: d.subject, html: `<div style="font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e293b">${escapeHtml(d.body).replace(/\n/g, '<br/>')}</div>` })
        await prisma.hireCandidateActivity.create({ data: { candidateId: c.id, type: 'email_sent', note: `${tag} — outreach email sent`, userId } })
        sent++
      } catch { skipped++ }
    }
    return { ok: true, summary: `Sent ${sent} outreach email${sent === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} (no email / opted out)` : ''}.` }
  }

  return { ok: false, summary: 'Unknown action.' }
}
