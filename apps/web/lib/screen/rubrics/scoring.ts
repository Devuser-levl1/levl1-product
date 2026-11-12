import type { RubricTier, SelectedRubric } from './types'

// ── Tiered rubric scoring (Screen-scoped, isomorphic) ──────────────────────
// The report model rates each selected rubric from the transcript; this module
// reconciles that (one result per rubric — never dropped, never invented) and
// applies the TIER POLICY deterministically, after the model:
//   Must-have  not_met              → recommendation capped at "no"
//   Must-have  partial/not_assessed → capped at "maybe" (can't recommend without it)
//   Good-to-have met +3 / partial +1 → added to the score (max +10); never gates
//   Add-on                          → informational only
// The gate only ever LOWERS a verdict; it never raises one.

export const RUBRIC_RATINGS = ['met', 'partial', 'not_met', 'not_assessed'] as const
export type RubricRating = (typeof RUBRIC_RATINGS)[number]

export interface RubricResult { rubricId: string; area: string; subSkill: string; tier: RubricTier; rating: RubricRating; evidence: string }
export interface TierGate {
  failedMust: string[]; weakMust: string[]; unassessedMust: string[]
  goodBonus: number
  capped: boolean; from: string | null; to: string | null
  reasons: string[]
}
export interface RubricAssessment { items: RubricResult[]; gate: TierGate }

const RANK = ['no', 'maybe', 'yes', 'strong_yes'] as const
type Rec = (typeof RANK)[number]
const isRec = (v: unknown): v is Rec => typeof v === 'string' && (RANK as readonly string[]).includes(v)
export const GOOD_BONUS = { met: 3, partial: 1, max: 10 }

export function reconcileRubricResults(selection: SelectedRubric[], raw: unknown, opts: { insufficientEvidence?: boolean } = {}): RubricResult[] {
  const list = Array.isArray(raw) ? raw : []
  return selection.map((s) => {
    const m = list.find((x) => x && typeof x === 'object' && ((x as { rubricId?: unknown }).rubricId === s.rubricId || String((x as { subSkill?: unknown }).subSkill ?? '').trim().toLowerCase() === s.subSkill.toLowerCase())) as { rating?: unknown; evidence?: unknown } | undefined
    const rating = !opts.insufficientEvidence && m && (RUBRIC_RATINGS as readonly string[]).includes(String(m.rating)) ? (m.rating as RubricRating) : 'not_assessed'
    const evidence = opts.insufficientEvidence ? 'Not enough evidence was captured in this interview.' : typeof m?.evidence === 'string' ? m.evidence.slice(0, 400) : ''
    return { rubricId: s.rubricId, area: s.area, subSkill: s.subSkill, tier: s.tier, rating, evidence }
  })
}

export function applyTierVerdict(recommendation: unknown, score: number, items: RubricResult[], opts: { insufficientEvidence?: boolean } = {}): { recommendation: Rec; score: number; gate: TierGate } {
  const rec: Rec = isRec(recommendation) ? recommendation : 'maybe'
  const must = items.filter((i) => i.tier === 'must')
  const failedMust = must.filter((i) => i.rating === 'not_met').map((i) => i.subSkill)
  const weakMust = must.filter((i) => i.rating === 'partial').map((i) => i.subSkill)
  const unassessedMust = must.filter((i) => i.rating === 'not_assessed').map((i) => i.subSkill)

  let cap: Rec = 'strong_yes'
  const reasons: string[] = []
  if (failedMust.length) { cap = 'no'; reasons.push(`Did not meet must-have: ${failedMust.join(', ')}.`) }
  else if (weakMust.length || unassessedMust.length) {
    cap = 'maybe'
    if (weakMust.length) reasons.push(`Only partially met must-have: ${weakMust.join(', ')}.`)
    if (unassessedMust.length) reasons.push(`Must-have not assessed — follow up before deciding: ${unassessedMust.join(', ')}.`)
  }
  const finalRec: Rec = RANK.indexOf(rec) > RANK.indexOf(cap) ? cap : rec

  let goodBonus = 0
  if (!opts.insufficientEvidence) {
    for (const i of items) if (i.tier === 'good') goodBonus += i.rating === 'met' ? GOOD_BONUS.met : i.rating === 'partial' ? GOOD_BONUS.partial : 0
    goodBonus = Math.min(GOOD_BONUS.max, goodBonus)
    if (goodBonus) reasons.push(`+${goodBonus} for good-to-have strengths.`)
  }
  return {
    recommendation: finalRec,
    score: Math.max(0, Math.min(100, Math.round(score + goodBonus))),
    gate: { failedMust, weakMust, unassessedMust, goodBonus, capped: finalRec !== rec, from: finalRec !== rec ? rec : null, to: finalRec !== rec ? finalRec : null, reasons },
  }
}
