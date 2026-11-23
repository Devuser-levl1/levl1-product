import { isNonEvaluableResponse, INSUFFICIENT_EVIDENCE } from './scoring'

// ── Score confidence (Screen-scoped, isomorphic) ───────────────────────────
// ENGINE PRINCIPLE 3 (lib/screen/interview/principles.ts): honest about
// uncertainty. A GRADED extension of INSUFFICIENT_EVIDENCE:
//   none   → INSUFFICIENT_EVIDENCE (no number at all — existing behaviour)
//   low    → a number exists but is NOT reliable → "needs human review"
//   medium → usable, with a stated caveat
//   high   → well evidenced
// Final confidence = the LOWER of (a) the scoring model's own judgment of the
// evidence (thin / ambiguous / contradictory / garbled) and (b) a deterministic
// cap from measurable evidence (how many real answers, how substantial, whether
// live evaluation or speech-to-text was degraded). The model can lower
// confidence; it can never raise it past what the evidence supports.

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const
export type Confidence = (typeof CONFIDENCE_LEVELS)[number]
const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 }
export const minConfidence = (...c: (Confidence | null | undefined)[]): Confidence =>
  c.filter((x): x is Confidence => !!x).reduce<Confidence>((a, b) => (RANK[b] < RANK[a] ? b : a), 'high')
export const isConfidence = (v: unknown): v is Confidence => typeof v === 'string' && (CONFIDENCE_LEVELS as readonly string[]).includes(v)

export const CONFIDENCE_LABEL: Record<Confidence, string> = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence — needs human review' }

/** Evidence-quality signals for the whole interview. */
export interface EvidenceContext {
  sttDegraded: boolean          // speech-to-text fell back (Web Speech) or failed — transcript may be inaccurate
  typedAnswers: boolean         // the candidate typed instead of speaking (communication can't be judged)
}

export interface ResponseLike { questionType?: string; candidateResponse?: string; evaluatorNote?: string }

// Script-agnostic (no /u flag — tsconfig targets ES5): split on whitespace and
// strip only ASCII punctuation at the edges, so Devanagari etc. still count.
const words = (s: string) => s.split(/\s+/).map((w) => w.replace(/^[.,!?;:"'()[\]{}\-–—…]+|[.,!?;:"'()[\]{}\-–—…]+$/g, '')).filter((w) => w.length > 1).length
const DEGRADED_NOTE = /not evaluated live/i

export interface SectionEvidence { asked: number; evaluable: number; avgWords: number; degradedLive: number }

export function sectionEvidence(responses: ResponseLike[], section: string): SectionEvidence {
  const rs = responses.filter((r) => (r.questionType ?? '').toLowerCase() === section)
  const ev = rs.filter((r) => !isNonEvaluableResponse(r.candidateResponse))
  const avgWords = ev.length ? Math.round(ev.reduce((s, r) => s + words(r.candidateResponse ?? ''), 0) / ev.length) : 0
  return { asked: rs.length, evaluable: ev.length, avgWords, degradedLive: rs.filter((r) => DEGRADED_NOTE.test(r.evaluatorNote ?? '')).length }
}

/** What the measurable evidence can support for one section (null = no evidence → INSUFFICIENT_EVIDENCE). */
export function evidenceCap(e: SectionEvidence, ctx: EvidenceContext): { cap: Confidence | null; reasons: string[] } {
  if (!e.evaluable) return { cap: null, reasons: [e.asked ? 'No evaluable answers in this area.' : 'This area was not reached in the interview.'] }
  const reasons: string[] = []
  let cap: Confidence = 'high'
  const lower = (c: Confidence, why: string) => { if (RANK[c] < RANK[cap]) cap = c; reasons.push(why) }
  if (e.evaluable === 1) lower('medium', 'Based on a single answer.')
  if (e.avgWords < 12) lower('low', 'Answers were very short.')
  else if (e.avgWords < 30) lower('medium', 'Answers were brief.')
  if (e.evaluable === 1 && e.avgWords < 25) lower('low', 'One short answer is not enough to score reliably.')
  if (e.degradedLive && e.degradedLive * 2 >= e.asked) lower('medium', 'Some answers were not evaluated live (the AI evaluator was unavailable).')
  if (ctx.sttDegraded) lower('medium', 'Speech-to-text fell back to a less accurate mode; the transcript may contain errors.')
  return { cap, reasons }
}

export interface ScoredSection {
  score: number | null; outOf: number; status: 'SCORED' | typeof INSUFFICIENT_EVIDENCE
  confidence?: Confidence; needsReview?: boolean; confidenceReason?: string
}

/** Apply graded confidence to one section score from the model. */
export function gradeSection(raw: { score?: unknown; outOf?: unknown; confidence?: unknown; confidenceReason?: unknown } | undefined, e: SectionEvidence, ctx: EvidenceContext): ScoredSection {
  const outOf = Number(raw?.outOf) || 100
  const { cap, reasons } = evidenceCap(e, ctx)
  const score = Number(raw?.score)
  if (!cap || !Number.isFinite(score)) return { score: null, outOf, status: INSUFFICIENT_EVIDENCE }
  const model = isConfidence(raw?.confidence) ? raw!.confidence as Confidence : 'medium'   // model silent → don't assume high
  const confidence = minConfidence(model, cap)
  const modelWhy = typeof raw?.confidenceReason === 'string' ? raw.confidenceReason.trim().slice(0, 200) : ''
  const why = [RANK[model] <= RANK[cap] && modelWhy ? modelWhy : null, ...(RANK[cap] < RANK['high'] ? reasons : [])].filter(Boolean).join(' ')
  return { score: Math.max(0, Math.min(outOf, Math.round(score))), outOf, status: 'SCORED', confidence, needsReview: confidence === 'low', ...(confidence !== 'high' && why ? { confidenceReason: why.slice(0, 400) } : {}) }
}

export function communicationCap(candidateWords: number, ctx: EvidenceContext): { cap: Confidence | null; reason: string | null } {
  if (ctx.typedAnswers && candidateWords < 40) return { cap: null, reason: 'Answers were typed, so spoken communication could not be assessed.' }
  if (candidateWords < 40) return { cap: null, reason: 'Too little speech to assess communication.' }
  if (candidateWords < 120) return { cap: 'low', reason: 'Very little speech to judge communication from.' }
  if (ctx.typedAnswers) return { cap: 'low', reason: 'Some answers were typed, not spoken.' }
  if (ctx.sttDegraded) return { cap: 'medium', reason: 'Speech-to-text fell back to a less accurate mode; grammar and fluency judgments may be off.' }
  if (candidateWords < 300) return { cap: 'medium', reason: 'A limited amount of speech.' }
  return { cap: 'high', reason: null }
}

export interface OverallConfidence {
  level: Confidence | null          // null = insufficient evidence overall
  needsReview: boolean
  lowAreas: { key: string; reason: string }[]
  summary: string
}

/** Overall: the verdict can't be more certain than its core evidence. */
export function overallConfidence(sections: Record<string, ScoredSection>, modelOverall: unknown, core = 'technical'): OverallConfidence {
  const scored = Object.entries(sections).filter(([, s]) => s.status === 'SCORED' && s.confidence)
  if (!scored.length) return { level: null, needsReview: true, lowAreas: [], summary: 'Insufficient evidence to score this interview.' }
  const lowAreas = scored.filter(([, s]) => s.confidence === 'low').map(([key, s]) => ({ key, reason: s.confidenceReason ?? 'Thin or ambiguous evidence.' }))
  let level: Confidence = minConfidence(isConfidence(modelOverall) ? modelOverall : 'medium', scored.some(([, s]) => s.confidence !== 'high') ? 'medium' : 'high')
  const coreLow = sections[core]?.status === 'SCORED' && sections[core]?.confidence === 'low'
  if (coreLow || lowAreas.length * 2 > scored.length) level = 'low'   // core area low, or MORE than half the scored areas
  const summary = level === 'low'
    ? `Low confidence: ${coreLow ? 'the core technical evidence is thin or ambiguous' : `${lowAreas.length} of ${scored.length} scored areas rest on thin or ambiguous evidence`}. A person should review the evidence before relying on this score.`
    : level === 'medium' ? 'Medium confidence: usable, but some areas rest on limited evidence (see each score).' : 'High confidence: the scores are well supported by the evidence.'
  return { level, needsReview: level === 'low', lowAreas, summary }
}

/** Per-question confidence from the actual answer (not the model's excerpt). */
export function questionConfidence(answer: string | undefined, evaluatorNote: string | undefined, ctx: EvidenceContext): Confidence | null {
  if (isNonEvaluableResponse(answer)) return null
  const w = words(answer ?? '')
  if (DEGRADED_NOTE.test(evaluatorNote ?? '') || w < 12) return 'low'
  if (w < 30 || ctx.sttDegraded) return 'medium'
  return 'high'
}
