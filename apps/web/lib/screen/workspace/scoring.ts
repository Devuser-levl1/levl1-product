import Anthropic from '@anthropic-ai/sdk'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { SCORING_MODEL } from '@/lib/screen/interview/model'
import { openArray, openText } from '@/lib/screen/privacy/fields'
import { digest, type TimelineEvent } from './timeline'
import { sanitizeTask } from './task'
import { sanitizeRubric, DIMENSION_LABEL } from '@/lib/screen/taskbank/types'

// ── Work-sample judgment scoring (Screen-scoped, server-only) ──────────────
// SEPARATE axes from the competency score — never blended into it:
//   approach        — judgment in how they tackled the task (process + design)
//   criticalThinking— edge cases, testing, noticing / fixing their own mistakes
//   defense         — how well they explained and defended decisions under follow-up
//   correctness     — deterministic: latest test results (hidden tests included)
// Every judgment cites evidence: a timeline moment (M#) or a defense quote (D#).
// Runs after the main report is saved; failure never affects the report.

export interface AxisScore { score: number | null; rationale: string; evidence: { ref: string; note: string }[] }
export interface WorkSampleScores {
  approach: AxisScore; criticalThinking: AxisScore; defense: AxisScore
  correctness: { passed: number; total: number; score: number | null }
  // Rubric-judged (task bank): one verdict per criterion, evidence-linked.
  criteria: { id: string; dimension: string; verdict: 'strong' | 'partial' | 'weak' | 'not_evidenced'; note: string; ref: string }[]
  summary: string
  generatedAt: string
}

interface StoredEntry { speaker?: string; text?: string; segment?: string }
interface TestRow { passed?: boolean }

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
    .filter((e) => (e.speaker === 'ai' || e.speaker === 'candidate') && typeof e.text === 'string' && e.segment !== 'logistics')
    .map((e) => `${e.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${(e.text as string).slice(0, 700)}`)
}

export async function scoreWorkSample(interviewId: string): Promise<WorkSampleScores | null> {
  const row = await prisma.interviewWorkSample.findUnique({
    where: { interviewId },
    select: { task: true, code: true, language: true, timeline: true, lastTests: true, interview: { select: { transcript: true } } },
  })
  if (!row) return null
  const task = sanitizeTask(row.task)
  const code = openText(row.code) ?? ''
  if (!task || !code.trim()) return null

  const tests = (Array.isArray(row.lastTests) ? row.lastTests : []) as TestRow[]
  const passed = tests.filter((t) => t?.passed).length
  const correctness = { passed, total: tests.length, score: tests.length ? Math.round((passed / tests.length) * 100) : null }
  const tl = digest(openArray<TimelineEvent>(row.timeline))
  const defense = defenseExchange(openArray<StoredEntry>(row.interview.transcript), task.title)

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
      'Plain text, no emoji. Return ONLY JSON.',
    messages: [{
      role: 'user',
      content:
        `TASK: ${task.title}\n${task.prompt.slice(0, 1500)}\n` +
        (task.lookFor.length ? `STRONG APPROACH LOOKS LIKE: ${task.lookFor.join('; ')}\n` : '') +
        rubricText +
        `\nFINAL CODE (${row.language}):\n${code.slice(0, 8000)}\n` +
        `\nTESTS: ${correctness.total ? `${passed}/${correctness.total} passing (incl. hidden)` : 'never run'}\n` +
        `\nTIMELINE (how the work evolved):\n${tl.text}\n` +
        `\nDEFENSE (explanation + follow-ups):\n${defense.length ? defense.map((l, i) => `D${i + 1} ${l}`).join('\n') : '(none captured)'}\n\n` +
        'Return JSON: {"approach":{"score":0,"rationale":"…","evidence":[{"ref":"M2","note":"…"}]},' +
        '"criticalThinking":{…same…},"defense":{…same…},' +
        (rubric.criteria.length ? '"criteria":[{"id":"c1","verdict":"strong|partial|weak|not_evidenced","note":"…","ref":"M2"}],' : '') +
        '"summary":"2-3 sentences for the hiring team"}',
    }],
  })
  if (res.stop_reason === 'max_tokens' || res.stop_reason === 'refusal') return null
  const j = outermostJson(res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join(''))
  if (!j) return null
  const scores: WorkSampleScores = {
    approach: axis(j.approach), criticalThinking: axis(j.criticalThinking), defense: axis(j.defense),
    correctness,
    criteria: rubric.criteria.flatMap((c) => {
      const got = (Array.isArray(j.criteria) ? j.criteria : []).find((x) => x && typeof x === 'object' && (x as { id?: unknown }).id === c.id) as Record<string, unknown> | undefined
      const verdict = ['strong', 'partial', 'weak', 'not_evidenced'].includes(got?.verdict as string) ? got!.verdict as 'strong' | 'partial' | 'weak' | 'not_evidenced' : 'not_evidenced'
      return [{ id: c.id, dimension: c.dimension, verdict, note: typeof got?.note === 'string' ? got.note.slice(0, 300) : '', ref: typeof got?.ref === 'string' ? got.ref.slice(0, 8) : '' }]
    }),
    summary: typeof j.summary === 'string' ? j.summary.slice(0, 800) : '',
    generatedAt: new Date().toISOString(),
  }
  await prisma.interviewWorkSample.update({ where: { interviewId }, data: { scores: scores as unknown as Prisma.InputJsonValue } })
  return scores
}
