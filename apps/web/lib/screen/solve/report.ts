import Anthropic from '@anthropic-ai/sdk'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { SCORING_MODEL } from '@/lib/screen/interview/model'
import { scoreWork, type WorkSampleScores } from '@/lib/screen/workspace/scoring'
import { sanitizeTask, LANGUAGE_LABEL, isWorkspaceLanguage } from '@/lib/screen/workspace/task'
import { digest, type TimelineEvent } from '@/lib/screen/workspace/timeline'
import { openArray, openText } from '@/lib/screen/privacy/fields'
import { readSelection } from '@/lib/screen/rubrics/types'
import { reconcileRubricResults, applyTierVerdict, type RubricAssessment } from '@/lib/screen/rubrics/scoring'
import { sanitizeSolveConfig } from './config'
import type { FinalTestRow, IntegritySummary } from './evaluate'
import type { DefenseTurn } from './defense'
import type { AiExchange } from './assistant'
import { aiUsageMetrics, scoreAiFluency, checkCodeProvenance, type AiUsageMetrics, type AiFluency } from './ai-usage'

// ── Solve report (Screen-scoped, server-only) ──────────────────────────────
// Evidence-based and verdict-forward, like the Screen report:
//   • correctness  — deterministic: server-run tests (hidden included)
//   • approach / critical thinking / defense — the SAME judgment scorer as the
//     Screen work sample (lib/screen/workspace/scoring.ts scoreWork), every
//     claim evidence-linked to a timeline moment (M#) or defense line (D#)
//   • tiered rubric (must / good / add-on) — the position's rubric selection,
//     rated by the model, then the SAME deterministic tier gate as Screen
//   • integrity flags are shown for review and never reject automatically
//   • trivial / empty submission → insufficient evidence (no score, no verdict)
//   • defense required but not done → verdict capped at "maybe"

export type Recommendation = 'strong_yes' | 'yes' | 'maybe' | 'no'

export interface SolveReport {
  verdict: { recommendation: Recommendation | null; score: number | null; insufficientEvidence: boolean; headline: string; reasons: string[] }
  summary: string
  strengths: string[]
  concerns: string[]
  correctness: { passed: number; total: number; hiddenPassed: number; hiddenTotal: number } | null
  axes: Pick<WorkSampleScores, 'approach' | 'criticalThinking' | 'defense'> | null
  criteria: WorkSampleScores['criteria']
  rubric: RubricAssessment | null
  integrity: IntegritySummary | null
  defense: { required: boolean; status: string; inputMode: string | null; questions: number; degraded: boolean }
  work: { quality: string; language: string; activeMinutes: number; runs: number; testRuns: number; autoSubmitted: boolean; moments: { id: string; at: string; note: string }[] }
  screen: { score: number | null; recommendation: string | null } | null
  // AI use (separate axis): built-in assistant metrics + fluency when allowed;
  // the provenance check lands in integrity.flags when it wasn't. Absent on older reports.
  aiUse?: { policy: 'allowed' | 'not_allowed'; used: boolean; metrics: AiUsageMetrics | null; fluency: AiFluency | null; provenanceChecked: boolean } | null
  generatedAt: string
}

// aiFluency only counts when the assistant was allowed AND used (then the rest renormalise).
const WEIGHTS = { correctness: 0.4, approach: 0.2, criticalThinking: 0.15, defense: 0.25, aiFluency: 0.15 }
const RECS: Recommendation[] = ['no', 'maybe', 'yes', 'strong_yes']
const isRec = (v: unknown): v is Recommendation => typeof v === 'string' && (RECS as string[]).includes(v)
const strList = (v: unknown, n: number) => (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 300)).slice(0, n)

function outermostJson(text: string): Record<string, unknown> | null {
  const a = text.indexOf('{'); const b = text.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  try { return JSON.parse(text.slice(a, b + 1)) } catch { return null }
}

export async function generateSolveReport(id: string): Promise<SolveReport> {
  const row = await prisma.solveSubmission.findUnique({
    where: { id },
    select: {
      agencyId: true, positionId: true, task: true, config: true, language: true, code: true, timeline: true, runs: true, finalTests: true, lastTests: true,
      integrity: true, submissionQuality: true, autoSubmitted: true, defenseStatus: true, defenseTranscript: true, defenseInputMode: true, aiLog: true,
      candidate: { select: { name: true, score: true, recommendation: true, interview: { select: { status: true } } } },
      position: { select: { title: true, rubricSelection: true, aiAssistCheck: true } },
    },
  })
  if (!row) throw new Error('Submission not found')
  const task = sanitizeTask(row.task)
  if (!task) throw new Error('Task snapshot unreadable')
  const cfg = sanitizeSolveConfig(row.config)
  const code = openText(row.code) ?? ''
  const timeline = openArray<TimelineEvent>(row.timeline)
  const d = digest(timeline)
  const finalTests = (Array.isArray(row.finalTests) ? row.finalTests : null) as FinalTestRow[] | null
  let integrity = (row.integrity && typeof row.integrity === 'object' && 'flags' in (row.integrity as object) ? row.integrity : null) as IntegritySummary | null
  const turns = openArray<DefenseTurn>(row.defenseTranscript)
  const defenseLines = turns.map((t) => `${t.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text.slice(0, 700)}`)
  const quality = row.submissionQuality ?? 'ok'
  const language = isWorkspaceLanguage(row.language) ? LANGUAGE_LABEL[row.language] : row.language
  const selection = readSelection(row.position.rubricSelection)
  const screen = row.candidate.interview?.status === 'completed' ? { score: row.candidate.score ?? null, recommendation: row.candidate.recommendation ?? null } : null

  const base = {
    integrity,
    defense: {
      required: cfg.defenseRequired, status: row.defenseStatus, inputMode: row.defenseInputMode,
      questions: turns.filter((t) => t.speaker === 'ai').length, degraded: turns.some((t) => t.text.startsWith('Tell me about ') && t.speaker === 'ai'),
    },
    work: {
      quality, language, activeMinutes: Math.round(d.durationMs / 60000), runs: d.runs, testRuns: d.testRuns, autoSubmitted: row.autoSubmitted,
      moments: d.moments.map(({ id: mid, at, note }) => ({ id: mid, at, note })),
    },
    screen,
    generatedAt: new Date().toISOString(),
  }

  // Trivial / empty: honest "insufficient evidence", never a pass/fail score.
  if (quality !== 'ok') {
    return {
      ...base,
      verdict: { recommendation: null, score: null, insufficientEvidence: true, headline: quality === 'empty' ? 'No code was submitted' : 'No meaningful work beyond the starter code', reasons: ['There is not enough work to evaluate. This is not a fail: check with the candidate whether they had trouble with the link or the editor before deciding.'] },
      summary: '', strengths: [], concerns: [], correctness: null, axes: null, criteria: [], aiUse: null,
      rubric: selection.length ? { items: reconcileRubricResults(selection, [], { insufficientEvidence: true }), gate: applyTierVerdict('maybe', 0, [], { insufficientEvidence: true }).gate } : null,
    }
  }

  const tests = finalTests ?? ((Array.isArray(row.lastTests) ? row.lastTests : []) as unknown as FinalTestRow[])
  const scores = await scoreWork({
    task, code, language: row.language, timeline, tests, defenseLines,
    context: `This was an ASYNC TAKE-HOME (${cfg.durationMinutes}-minute limit). Outside AI help was ${cfg.aiPolicy === 'allowed' ? 'allowed, so judge ownership through the defense' : 'not allowed'}.` +
      (row.defenseStatus === 'completed' ? ' The defense was a separate short spoken interview after submission.' : ' The candidate did NOT complete a defense interview; score defense as null and say so.'),
  })
  if (!scores) throw new Error('Work scoring unavailable (AI) — will retry')

  // ── AI use ──
  const testsLine = tests.length ? `${tests.filter((t) => t.passed).length}/${tests.length} tests passing (hidden included)` : 'tests not run'
  const exchanges = cfg.aiPolicy === 'allowed' ? openArray<AiExchange>(row.aiLog) : []
  const aiMetrics = exchanges.length ? aiUsageMetrics(exchanges, timeline, code, task.starterCode) : null
  const fluency = aiMetrics ? await scoreAiFluency({ task, language: row.language, code, exchanges, metrics: aiMetrics, timeline, testsLine, defenseLines }) : null
  if (aiMetrics && !fluency) console.warn(JSON.stringify({ evt: 'solve_ai_fluency_missing', id }))
  let provenanceChecked = false
  if (cfg.aiPolicy === 'not_allowed' && row.position.aiAssistCheck) {
    provenanceChecked = true
    const flag = await checkCodeProvenance({ task, language: row.language, code, timeline, defenseLines })
    if (flag) integrity = { ...(integrity ?? { tabSwitches: 0, awayMs: 0, pastes: 0, largestPaste: 0, flags: [], level: cfg.integrityLevel }), flags: [...(integrity?.flags ?? []), { kind: flag.kind, note: flag.note + (flag.span ? ` Evidence: "${flag.span}"` : '') }] }
  }
  const aiUse: SolveReport['aiUse'] = { policy: cfg.aiPolicy, used: exchanges.some((x) => !x.error), metrics: aiMetrics, fluency, provenanceChecked }

  const hidden = tests.filter((t) => t.hidden)
  const correctness = tests.length ? { passed: tests.filter((t) => t.passed).length, total: tests.length, hiddenPassed: hidden.filter((t) => t.passed).length, hiddenTotal: hidden.length } : null
  const defended = row.defenseStatus === 'completed' && turns.some((t) => t.speaker === 'candidate')

  // Deterministic blend; axes without evidence drop out and the rest renormalise.
  const parts: [number, number][] = []
  if (scores.correctness.score !== null) parts.push([scores.correctness.score, WEIGHTS.correctness])
  if (scores.approach.score !== null) parts.push([scores.approach.score, WEIGHTS.approach])
  if (scores.criticalThinking.score !== null) parts.push([scores.criticalThinking.score, WEIGHTS.criticalThinking])
  if (defended && scores.defense.score !== null) parts.push([scores.defense.score, WEIGHTS.defense])
  if (fluency?.score != null) parts.push([fluency.score, WEIGHTS.aiFluency])
  const wsum = parts.reduce((s, [, w]) => s + w, 0)
  const blended = wsum ? Math.round(parts.reduce((s, [v, w]) => s + v * w, 0) / wsum) : 0

  // Verdict + tiered rubric ratings (one scoring call).
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('AI unavailable — will retry')
  const res = await new Anthropic({ apiKey: key }).messages.create({
    model: SCORING_MODEL,
    max_tokens: 2500,
    system: 'You write the hiring verdict for a candidate\'s take-home assessment from evidence already gathered. Be decisive and specific, cite the evidence, never invent. Plain text, no emoji. Return ONLY JSON.',
    messages: [{
      role: 'user',
      content:
        `ROLE: ${row.position.title}\nTASK: ${task.title}\n\n` +
        `CORRECTNESS: ${correctness ? `${correctness.passed}/${correctness.total} tests (hidden ${correctness.hiddenPassed}/${correctness.hiddenTotal})` : 'tests not run'}\n` +
        `APPROACH ${scores.approach.score ?? '—'}: ${scores.approach.rationale}\nCRITICAL THINKING ${scores.criticalThinking.score ?? '—'}: ${scores.criticalThinking.rationale}\n` +
        `DEFENSE ${defended ? `${scores.defense.score ?? '—'}: ${scores.defense.rationale}` : 'not completed'}\n` +
        `TASK RUBRIC: ${scores.criteria.map((c) => `${c.dimension}=${c.verdict}${c.note ? ` (${c.note})` : ''}`).join('; ') || 'none'}\n` +
        (cfg.aiPolicy === 'allowed'
          ? `AI FLUENCY (AI use was allowed; judge how WELL they used it, not whether): ${fluency ? `${fluency.score ?? '—'}: ${fluency.rationale}` : aiMetrics ? 'not scored' : 'did not use the assistant'}${aiMetrics ? ` — ~${Math.round(aiMetrics.aiShareOfFinal * 100)}% of final lines from AI, ${aiMetrics.verifiedAfterInsert}/${aiMetrics.inserts} inserts verified by running` : ''}\n`
          : '') +
        `ASSESSOR SUMMARY: ${scores.summary}\n` +
        `INTEGRITY FLAGS (for review only — never reject on these alone): ${integrity?.flags.map((f) => f.note).join(' ') || 'none'}\n\n` +
        `DEFENSE TRANSCRIPT:\n${defenseLines.length ? defenseLines.join('\n').slice(0, 6000) : '(none)'}\n\n` +
        (selection.length ? `POSITION RUBRICS — rate each from THIS evidence only (met | partial | not_met | not_assessed when the take-home simply doesn't touch it):\n${selection.map((s) => `[${s.rubricId}] (${s.tier}) ${s.area} — ${s.subSkill}`).join('\n')}\n\n` : '') +
        'Return JSON: {"recommendation":"strong_yes|yes|maybe|no","headline":"one sentence verdict","strengths":["…"],"concerns":["…"]' +
        (selection.length ? ',"rubric":[{"rubricId":"…","rating":"met","evidence":"…"}]' : '') + '}',
    }],
  })
  if (res.stop_reason === 'max_tokens' || res.stop_reason === 'refusal') throw new Error(`Verdict call stopped: ${res.stop_reason}`)
  const j = outermostJson(res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join(''))
  if (!j) throw new Error('Verdict call returned no JSON')

  const items = reconcileRubricResults(selection, j.rubric)
  const tier = applyTierVerdict(isRec(j.recommendation) ? j.recommendation : 'maybe', blended, items)
  let recommendation = tier.recommendation as Recommendation
  const reasons = [...tier.gate.reasons]
  if (cfg.defenseRequired && !defended && RECS.indexOf(recommendation) > RECS.indexOf('maybe')) {
    recommendation = 'maybe'
    reasons.push('The defense interview was required but not completed, so ownership of the work is unverified.')
  }
  return {
    ...base,
    verdict: { recommendation, score: tier.score, insufficientEvidence: false, headline: typeof j.headline === 'string' ? j.headline.slice(0, 300) : '', reasons },
    summary: scores.summary,
    strengths: strList(j.strengths, 5),
    concerns: strList(j.concerns, 5),
    correctness,
    axes: { approach: scores.approach, criticalThinking: scores.criticalThinking, defense: defended ? scores.defense : { score: null, rationale: 'No defense interview.', evidence: [] } },
    criteria: scores.criteria,
    rubric: selection.length ? { items, gate: tier.gate } : null,
    integrity,
    aiUse,
  }
}

const MAX_AUTO_ATTEMPTS = 3
const inflight = new Set<string>()

/** Generate + store the report. Idempotent; failures are visible (reportStatus=failed) and retried by the sweep. */
export async function runSolveReport(id: string): Promise<boolean> {
  if (inflight.has(id)) return false
  inflight.add(id)
  try {
    await prisma.solveSubmission.update({ where: { id }, data: { reportStatus: 'generating', reportAttempts: { increment: 1 }, reportUpdatedAt: new Date(), reportError: null } })
    const report = await generateSolveReport(id)
    const done = await prisma.solveSubmission.update({
      where: { id },
      data: {
        report: report as unknown as Prisma.InputJsonValue,
        score: report.verdict.score, recommendation: report.verdict.recommendation,
        status: 'completed', reportStatus: 'ready', reportUpdatedAt: new Date(),
      },
      select: { agencyId: true, positionId: true, candidate: { select: { name: true } } },
    })
    await prisma.notification.create({
      data: { agencyId: done.agencyId, type: 'solve_report_ready', title: 'Take-home evaluated', body: `${done.candidate.name}'s take-home report is ready.`, link: `/solve/report/${id}` },
    }).catch(() => {})
    console.info(JSON.stringify({ evt: 'solve_report_ready', id, rec: report.verdict.recommendation, score: report.verdict.score }))
    return true
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(JSON.stringify({ evt: 'solve_report_failed', id, err: msg.slice(0, 300) }))
    await prisma.solveSubmission.update({ where: { id }, data: { reportStatus: 'failed', reportError: msg.slice(0, 2000), reportUpdatedAt: new Date() } }).catch(() => {})
    return false
  } finally {
    inflight.delete(id)
  }
}

/** Fire-and-forget (never blocks the candidate's request). The sweep is the safety net. */
export function queueSolveReport(id: string) {
  void runSolveReport(id)
}

/** Submissions that need a report now (ready to score, none yet / failed / stuck). */
export async function findPendingSolveReports(opts: { agencyId?: string; limit?: number } = {}) {
  const stale = new Date(Date.now() - 10 * 60_000)
  const rows = await prisma.solveSubmission.findMany({
    where: {
      ...(opts.agencyId ? { agencyId: opts.agencyId } : {}),
      status: 'submitted',
      defenseStatus: { in: ['not_required', 'completed', 'expired'] },
      OR: [
        { reportStatus: null },
        { reportStatus: 'failed', reportAttempts: { lt: MAX_AUTO_ATTEMPTS } },
        { reportStatus: 'generating', reportUpdatedAt: { lt: stale } },
      ],
    },
    select: { id: true }, orderBy: { submittedAt: 'asc' }, take: opts.limit ?? 10,
  })
  return rows.map((r) => r.id)
}
