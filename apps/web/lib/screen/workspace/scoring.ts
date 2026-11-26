import Anthropic from '@anthropic-ai/sdk'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { SCORING_MODEL } from '@/lib/screen/interview/model'
import { openArray, openText } from '@/lib/screen/privacy/fields'
import { digest, type TimelineEvent } from './timeline'
import { sanitizeTask, type WorkSampleTask } from './task'
import { sanitizeRubric, DIMENSION_LABEL } from '@/lib/screen/taskbank/types'
import { isConfidence, minConfidence, type Confidence } from '@/lib/screen/session/confidence'
import { isScoredSegment } from '@/lib/screen/session/closing'

// ── Work-sample judgment scoring (Screen-scoped, server-only) ──────────────
// SEPARATE axes from the competency score — never blended into it:
//   approach        — judgment in how they tackled the task (process + design)
//   criticalThinking— edge cases, testing, noticing / fixing their own mistakes
//   defense         — how well they explained and defended decisions under follow-up
//   correctness     — deterministic: latest test results (hidden tests included)
// Every judgment cites evidence: a timeline moment (M#) or a defense quote (D#).
// Runs after the main report is saved; failure never affects the report.

// confidence (engine principle 3): min(model judgment, what was observed) — absent on older rows.
export interface AxisScore { score: number | null; rationale: string; evidence: { ref: string; note: string }[]; confidence?: Confidence; confidenceReason?: string }
export interface WorkSampleScores {
  approach: AxisScore; criticalThinking: AxisScore; defense: AxisScore
  correctness: { passed: number; total: number; score: number | null }
  // Rubric-judged (task bank): one verdict per criterion, evidence-linked.
  criteria: { id: string; dimension: string; verdict: 'strong' | 'partial' | 'weak' | 'not_evidenced'; note: string; ref: string }[]
  summary: string
  generatedAt: string
}

interface StoredEntry { speaker?: string; text?: string; segment?: string }
export interface TestRow { passed?: boolean }

function outermostJson(text: string): Record<string, unknown> | null {
  const a = text.indexOf('{'); const b = text.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  try { return JSON.parse(text.slice(a, b + 1)) } catch { return null }
}

const axis = (v: unknown): AxisScore => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const n = Number(o.score)
  return {
    score: Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null,
    rationale: typeof o.rationale === 'string' ? o.rationale.slice(0, 600) : '',
    confidence: isConfidence(o.confidence) ? o.confidence : 'medium',
    evidence: (Array.isArray(o.evidence) ? o.evidence : []).slice(0, 5).flatMap((e) => {
      const r = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>
      return typeof r.ref === 'string' && typeof r.note === 'string' ? [{ ref: r.ref.slice(0, 8), note: r.note.slice(0, 300) }] : []
    }),
  }
}

/** The candidate's explanation + follow-up exchange for the work sample (from the stored transcript). */
function defenseExchange(transcript: StoredEntry[], taskTitle: string): string[] {
  const start = transcript.findIndex((e) => e.speaker === 'ai' && typeof e.text === 'string' && e.text.includes(taskTitle))
  if (start < 0) return []
  return transcript.slice(start + 1, start + 16)
    .filter((e) => (e.speaker === 'ai' || e.speaker === 'candidate') && typeof e.text === 'string' && isScoredSegment(e.segment))
    .map((e) => `${e.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${(e.text as string).slice(0, 700)}`)
}

export async function scoreWorkSample(interviewId: string): Promise<WorkSampleScores | null> {
  const row = await prisma.interviewWorkSample.findUnique({
    where: { interviewId },
    select: { task: true, code: true, language: true, timeline: true, lastTests: true, interview: { select: { transcript: true } } },
  })
  if (!row) return null
  const task = sanitizeTask(row.task)
  if (!task) return null
  const scores = await scoreWork({
    task,
    code: openText(row.code) ?? '',
    language: row.language,
    timeline: openArray<TimelineEvent>(row.timeline),
    tests: (Array.isArray(row.lastTests) ? row.lastTests : []) as TestRow[],
    defenseLines: defenseExchange(openArray<StoredEntry>(row.interview.transcript), task.title),
  })
  if (!scores) return null
  await prisma.interviewWorkSample.update({ where: { interviewId }, data: { scores: scores as unknown as Prisma.InputJsonValue } })
  return scores
}

/** Inputs for judgment scoring — shared by the Screen work sample and Solve (async take-home). */
export interface WorkScoringInput {
  task: WorkSampleTask
  code: string
  language: string
  timeline: TimelineEvent[]
  tests: TestRow[]
  defenseLines: string[]       // "Interviewer: …" / "Candidate: …" lines
  context?: string             // extra framing (e.g. take-home policy) — appended to the prompt
}

/** Pure scoring call (no DB writes). null when there's nothing to score or the model fails. */
export async function scoreWork(input: WorkScoringInput): Promise<WorkSampleScores | null> {
  const { task, code, tests, defenseLines: defense } = input
  if (!code.trim()) return null
  const passed = tests.filter((t) => t?.passed).length
  const correctness = { passed, total: tests.length, score: tests.length ? Math.round((passed / tests.length) * 100) : null }
  const tl = digest(input.timeline)

  const rubric = sanitizeRubric(task.rubric ?? {})
  const rubricText = (rubric.criteria.length || rubric.probes.length)
    ? `\nRUBRIC CRITERIA (judge each):\n${rubric.criteria.map((c) => `[${c.id}] ${DIMENSION_LABEL[c.dimension]} (weight ${c.weight}) — strong: ${c.strong} | weak: ${c.weak}`).join('\n')}\n` +
      (rubric.probes.length ? `\nEXPECTED PROBE ANSWERS (judge the DEFENSE against these):\n${rubric.probes.map((p) => `- ${p.decision}: strong = ${p.strongAnswer}${p.weakSignals ? `; weak signals = ${p.weakSignals}` : ''}`).join('\n')}\n` : '')
    : ''

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const res = await new Anthropic({ apiKey: key }).messages.create({
    model: SCORING_MODEL,
    max_tokens: 3000,
    system:
      'You assess a candidate\'s hands-on WORK SAMPLE in a technical interview: how they worked, not just the final answer. ' +
      'Score three SEPARATE axes 0-100. Cite evidence for every claim using refs: timeline moments "M1".."Mn" or defense lines "D1".."Dn" (as numbered below). ' +
      'Only credit what is evidenced. A large paste that the candidate could not explain under follow-up lowers approach and defense. ' +
      'For each axis also give "confidence" (high|medium|low) in your own score: low when there was little to observe or the defense was thin or ambiguous. Never inflate it. ' +
      'Plain text, no emoji. Return ONLY JSON.',
    messages: [{
      role: 'user',
      content:
        `TASK: ${task.title}\n${task.prompt.slice(0, 1500)}\n` +
        (task.lookFor.length ? `STRONG APPROACH LOOKS LIKE: ${task.lookFor.join('; ')}\n` : '') +
        rubricText +
        `\nFINAL CODE (${input.language}):\n${code.slice(0, 8000)}\n` +
        `\nTESTS: ${correctness.total ? `${passed}/${correctness.total} passing (incl. hidden)` : 'never run'}\n` +
        `\nTIMELINE (how the work evolved):\n${tl.text}\n` +
        `\nDEFENSE (explanation + follow-ups):\n${defense.length ? defense.map((l, i) => `D${i + 1} ${l}`).join('\n') : '(none captured)'}\n\n` +
        (input.context ? `CONTEXT: ${input.context}\n\n` : '') +
        'Return JSON: {"approach":{"score":0,"confidence":"high|medium|low","rationale":"…","evidence":[{"ref":"M2","note":"…"}]},' +
        '"criticalThinking":{…same…},"defense":{…same…},' +
        (rubric.criteria.length ? '"criteria":[{"id":"c1","verdict":"strong|partial|weak|not_evidenced","note":"…","ref":"M2"}],' : '') +
        '"summary":"2-3 sentences for the hiring team"}',
    }],
  })
  if (res.stop_reason === 'max_tokens' || res.stop_reason === 'refusal') return null
  const j = outermostJson(res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join(''))
  if (!j) return null
  // Cap each axis's confidence by what was actually observed.
  const candLines = defense.filter((l) => l.startsWith('Candidate:')).length
  const observed = input.timeline.filter((e) => e.k !== 'snapshot').length
  const cap = (a: AxisScore, c: Confidence, why: string | null): AxisScore => {
    if (a.score === null) return { ...a, confidence: undefined }
    const conf = minConfidence(a.confidence, c)
    return { ...a, confidence: conf, ...(conf !== 'high' && why ? { confidenceReason: why } : {}) }
  }
  const workCap: [Confidence, string | null] = observed < 5 ? ['low', 'Very little of the work process was captured.'] : observed < 15 ? ['medium', 'Only part of the work process was captured.'] : ['high', null]
  const scores: WorkSampleScores = {
    approach: cap(axis(j.approach), ...workCap),
    criticalThinking: cap(axis(j.criticalThinking), tl.testRuns === 0 ? 'medium' : workCap[0], tl.testRuns === 0 ? 'The tests were never run, so testing discipline is judged from the code alone.' : workCap[1]),
    defense: cap(axis(j.defense), candLines < 2 ? 'low' : candLines < 4 ? 'medium' : 'high', candLines < 2 ? 'Too few defense answers to judge.' : candLines < 4 ? 'A short defense.' : null),
    correctness,
    criteria: rubric.criteria.flatMap((c) => {
      const got = (Array.isArray(j.criteria) ? j.criteria : []).find((x) => x && typeof x === 'object' && (x as { id?: unknown }).id === c.id) as Record<string, unknown> | undefined
      const verdict = ['strong', 'partial', 'weak', 'not_evidenced'].includes(got?.verdict as string) ? got!.verdict as 'strong' | 'partial' | 'weak' | 'not_evidenced' : 'not_evidenced'
      return [{ id: c.id, dimension: c.dimension, verdict, note: typeof got?.note === 'string' ? got.note.slice(0, 300) : '', ref: typeof got?.ref === 'string' ? got.ref.slice(0, 8) : '' }]
    }),
    summary: typeof j.summary === 'string' ? j.summary.slice(0, 800) : '',
    generatedAt: new Date().toISOString(),
  }
  return scores
}
