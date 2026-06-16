import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── AI candidate ↔ job matching (P0-3) ─────────────────────────────────────
// Explains WHY a candidate fits a job (or vice-versa) — not keyword filtering.
// Batch-friendly: many candidates are scored against one job in a few compact
// Claude calls.

export type Verdict = 'strong' | 'good' | 'partial' | 'weak'

export interface MatchResult {
  candidateId: string
  score: number
  verdict: Verdict
  reasons: string[]
  matchedSkills: string[]
  missingSkills: string[]
}

export interface JobForMatch {
  id: string
  title: string
  description: string
  mustHaveSkills: string[]
  niceToHaveSkills: string[]
  screeningCriteria: string[]
}

export interface CandidateForMatch {
  id: string
  name: string
  currentTitle: string | null
  currentCompany: string | null
  totalYears: number | null
  skills: string[]
  resumeText: string | null
}

export function verdictFor(score: number): Verdict {
  return score >= 85 ? 'strong' : score >= 70 ? 'good' : score >= 50 ? 'partial' : 'weak'
}

function compactCandidate(c: CandidateForMatch): string {
  const parts = [
    `id: ${c.id}`,
    `name: ${c.name}`,
    c.currentTitle ? `title: ${c.currentTitle}` : '',
    c.currentCompany ? `company: ${c.currentCompany}` : '',
    c.totalYears != null ? `years: ${c.totalYears}` : '',
    c.skills.length ? `skills: ${c.skills.join(', ')}` : '',
    c.resumeText ? `resume excerpt: ${c.resumeText.replace(/\s+/g, ' ').slice(0, 700)}` : '',
  ].filter(Boolean)
  return parts.join('\n')
}

function safeParseArray(raw: string): unknown[] {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  return Array.isArray(parsed) ? parsed : (Array.isArray((parsed as { matches?: unknown[] }).matches) ? (parsed as { matches: unknown[] }).matches : [])
}

const CHUNK = 8

/**
 * Rank many candidates against ONE job. Sends compact candidate summaries in
 * chunks (one Claude call each) and merges. Returns results sorted by score.
 */
export async function matchCandidatesToJob(job: JobForMatch, candidates: CandidateForMatch[]): Promise<MatchResult[]> {
  if (!process.env.ANTHROPIC_API_KEY || candidates.length === 0) return []
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const jobBlock = `JOB
Title: ${job.title}
Must-have skills: ${job.mustHaveSkills.join(', ') || '(infer from description)'}
Nice-to-have skills: ${job.niceToHaveSkills.join(', ') || '—'}
Screening criteria: ${job.screeningCriteria.join('; ') || '—'}
Description: ${job.description.slice(0, 1500)}`

  const chunks: CandidateForMatch[][] = []
  for (let i = 0; i < candidates.length; i += CHUNK) chunks.push(candidates.slice(i, i + CHUNK))

  const all: MatchResult[] = []
  await Promise.all(chunks.map(async (chunk) => {
    const prompt = `You are an expert technical recruiter evaluating how well each candidate fits a specific job. Judge on the job's must-have skills, screening criteria and the candidate's actual experience — not just keyword overlap. A candidate strong in a DIFFERENT stack (e.g. Java for a .NET role) should score LOW.

${jobBlock}

CANDIDATES
${chunk.map((c, i) => `--- Candidate ${i + 1} ---\n${compactCandidate(c)}`).join('\n\n')}

For EACH candidate return an object. Return ONLY a JSON array (no markdown):
[{
  "candidateId": "the id given",
  "score": 0-100 fit,
  "reasons": ["2-3 SPECIFIC reasons referencing their actual experience vs the job's must-haves — concrete, not generic"],
  "matchedSkills": ["job skills the candidate clearly has"],
  "missingSkills": ["job must-have skills the candidate lacks"]
}]`

    try {
      const resp = await client.messages.create({ model: CLAUDE_MODEL, max_tokens: 2400, temperature: 0.2, messages: [{ role: 'user', content: prompt }] })
      const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
      const rows = safeParseArray(text) as Array<Partial<MatchResult>>
      for (const r of rows) {
        if (!r.candidateId || !chunk.some((c) => c.id === r.candidateId)) continue
        const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)))
        all.push({
          candidateId: r.candidateId,
          score,
          verdict: verdictFor(score),
          reasons: Array.isArray(r.reasons) ? r.reasons.slice(0, 4) : [],
          matchedSkills: Array.isArray(r.matchedSkills) ? r.matchedSkills : [],
          missingSkills: Array.isArray(r.missingSkills) ? r.missingSkills : [],
        })
      }
    } catch (e) {
      console.error('[ai-matching] chunk failed:', e instanceof Error ? e.message : e)
    }
  }))

  return all.sort((a, b) => b.score - a.score)
}

export interface JobMatchResult {
  jobId: string
  title: string
  score: number
  verdict: Verdict
  reasons: string[]
  matchedSkills: string[]
  missingSkills: string[]
}

/**
 * Suggest the best-fit jobs for ONE candidate from a set of open jobs (single
 * Claude call). Used by the candidate slide-over.
 */
export async function matchJobsForCandidate(candidate: CandidateForMatch, jobs: JobForMatch[]): Promise<JobMatchResult[]> {
  if (!process.env.ANTHROPIC_API_KEY || jobs.length === 0) return []
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are an expert recruiter. Rank how well ONE candidate fits each open job, by the job's must-have skills + screening criteria vs the candidate's real experience (not keyword overlap; a wrong-stack match scores low).

CANDIDATE
${compactCandidate(candidate)}

OPEN JOBS
${jobs.map((j, i) => `--- Job ${i + 1} (id: ${j.id}) ---\nTitle: ${j.title}\nMust-have: ${j.mustHaveSkills.join(', ') || '(infer)'}\nScreening: ${j.screeningCriteria.join('; ') || '—'}\nDescription: ${j.description.slice(0, 700)}`).join('\n\n')}

Return ONLY a JSON array (no markdown):
[{ "jobId": "the id", "score": 0-100, "reasons": ["1-2 specific reasons"], "matchedSkills": ["..."], "missingSkills": ["..."] }]`

  try {
    const resp = await client.messages.create({ model: CLAUDE_MODEL, max_tokens: 2000, temperature: 0.2, messages: [{ role: 'user', content: prompt }] })
    const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const rows = safeParseArray(text) as Array<Partial<JobMatchResult>>
    const byId = new Map(jobs.map((j) => [j.id, j.title]))
    return rows
      .filter((r) => r.jobId && byId.has(r.jobId))
      .map((r) => {
        const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)))
        return {
          jobId: r.jobId!,
          title: byId.get(r.jobId!) ?? '',
          score,
          verdict: verdictFor(score),
          reasons: Array.isArray(r.reasons) ? r.reasons.slice(0, 3) : [],
          matchedSkills: Array.isArray(r.matchedSkills) ? r.matchedSkills : [],
          missingSkills: Array.isArray(r.missingSkills) ? r.missingSkills : [],
        }
      })
      .sort((a, b) => b.score - a.score)
  } catch (e) {
    console.error('[ai-matching] match-jobs failed:', e instanceof Error ? e.message : e)
    return []
  }
}

// ── Single source of truth: score ONE candidate vs ONE job → HireMatch ──────
// All candidate-vs-job scoring flows through here, so the Candidates list, job
// Top Matches, candidate popup and dashboard all read the SAME HireMatch row.

export function verdictToRecommendation(v: Verdict): 'strong_yes' | 'yes' | 'maybe' | 'no' {
  return v === 'strong' ? 'strong_yes' : v === 'good' ? 'yes' : v === 'partial' ? 'maybe' : 'no'
}

/**
 * Score a single candidate against a job and upsert the HireMatch row. Returns
 * the MatchResult (or null if nothing to score). This is the ONLY path that
 * produces a candidate-vs-job score.
 */
export async function scoreCandidateForJob(tenantId: string, candidateId: string, jobId: string): Promise<MatchResult | null> {
  const [candidate, job] = await Promise.all([
    prisma.hireCandidate.findFirst({ where: { id: candidateId, tenantId }, select: { id: true, name: true, currentTitle: true, currentCompany: true, totalYears: true, skills: true, resumeText: true } }),
    prisma.hireJob.findFirst({ where: { id: jobId, tenantId }, select: { id: true, title: true, description: true, mustHaveSkills: true, niceToHaveSkills: true, screeningCriteria: true } }),
  ])
  if (!candidate || !job) return null

  const cand: CandidateForMatch = {
    id: candidate.id, name: candidate.name, currentTitle: candidate.currentTitle, currentCompany: candidate.currentCompany,
    totalYears: candidate.totalYears, skills: Array.isArray(candidate.skills) ? (candidate.skills as string[]) : [], resumeText: candidate.resumeText,
  }
  const [result] = await matchCandidatesToJob(job, [cand])
  if (!result) return null

  await prisma.hireMatch.upsert({
    where: { jobId_candidateId: { jobId, candidateId } },
    update: { score: result.score, verdict: result.verdict, reasons: result.reasons as Prisma.InputJsonValue, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills, createdAt: new Date() },
    create: { tenantId, jobId, candidateId, score: result.score, verdict: result.verdict, reasons: result.reasons as Prisma.InputJsonValue, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills },
  })
  return result
}
