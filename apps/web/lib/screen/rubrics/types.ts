// ── Rubric library: types + validation (Screen-scoped, isomorphic) ─────────
// A curated catalog of proficiency rubrics, browsable by area (role or
// technology) → sub-skill, that recruiters SELECT per position and tier as
// Must-have / Good-to-have / Add-on. Tiers drive scoring (lib/screen/rubrics/
// scoring.ts) and interview coverage (lib/screen/rubrics/coverage.ts).
//
// Every rubric follows ONE proficiency-statement template — what Ananya asks
// toward and what the report scores against:
//   "The candidate should be proficient in X, and able to Y, by following Z."
//
// Review gate (same as the task bank): draft → reviewed (reviewer note) →
// active (shown to recruiters) → retired. Only ACTIVE rubrics can be selected,
// so nothing un-reviewed is ever used in a live interview.

export const RUBRIC_STATUSES = ['draft', 'reviewed', 'active', 'retired'] as const
export type RubricStatus = (typeof RUBRIC_STATUSES)[number]

export const RUBRIC_TIERS = ['must', 'good', 'addon'] as const
export type RubricTier = (typeof RUBRIC_TIERS)[number]
export const TIER_INFO: Record<RubricTier, { label: string; short: string; effect: string }> = {
  must:  { label: 'Must-have',    short: 'Must',   effect: 'Gates the verdict: a candidate cannot be recommended while failing one.' },
  good:  { label: 'Good-to-have', short: 'Good',   effect: 'Adds to the score as a strength signal; never blocks.' },
  addon: { label: 'Add-on',       short: 'Add-on', effect: 'Assessed only if time allows; shown in the report for information.' },
}
export const isRubricTier = (v: unknown): v is RubricTier => typeof v === 'string' && (RUBRIC_TIERS as readonly string[]).includes(v)

export interface RubricProbe { question: string; strongAnswer: string; weakSignals: string }

/** Rubric content (what an author writes). */
export interface RubricContent {
  area: string          // role / technology group, e.g. "Oracle E-Business Suite", ".NET Full Stack"
  subSkill: string      // the rubric's name, e.g. "Oracle Integration Development"
  proficientIn: string  // X — specific areas / tools
  ableTo: string        // Y — design / build / troubleshoot …
  practices: string     // Z — the practices they follow
  strong: string        // what a strong answer shows
  weak: string          // what a weak answer looks like
  keywords: string[]    // terms that link the rubric to JDs + live answers (aliases)
  probes: RubricProbe[] // question angles Ananya can use
}

export const LIMITS = { area: 80, subSkill: 100, clause: 600, anchor: 600, keyword: 40, keywords: 20, probes: 6, probeText: 400 }

/** The single proficiency statement, from the template. */
export function proficiencyStatement(c: Pick<RubricContent, 'proficientIn' | 'ableTo' | 'practices'>): string {
  const x = c.proficientIn.trim().replace(/[.\s]+$/, '')
  const y = c.ableTo.trim().replace(/[.\s]+$/, '')
  const z = c.practices.trim().replace(/[.\s]+$/, '')
  return `The candidate should be proficient in ${x}, and able to ${y}, by following ${z}.`
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

export function sanitizeProbes(raw: unknown): RubricProbe[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, LIMITS.probes).map((p) => {
    const o = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>
    return { question: str(o.question, LIMITS.probeText), strongAnswer: str(o.strongAnswer, LIMITS.probeText), weakSignals: str(o.weakSignals, LIMITS.probeText) }
  }).filter((p) => p.question)
}

export function sanitizeKeywords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of raw) {
    const s = str(k, LIMITS.keyword)
    if (!s || seen.has(s.toLowerCase())) continue
    seen.add(s.toLowerCase()); out.push(s)
    if (out.length >= LIMITS.keywords) break
  }
  return out
}

export function sanitizeRubricInput(raw: unknown): { ok: true; rubric: RubricContent } | { ok: false; error: string } {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const r: RubricContent = {
    area: str(o.area, LIMITS.area), subSkill: str(o.subSkill, LIMITS.subSkill),
    proficientIn: str(o.proficientIn, LIMITS.clause), ableTo: str(o.ableTo, LIMITS.clause), practices: str(o.practices, LIMITS.clause),
    strong: str(o.strong, LIMITS.anchor), weak: str(o.weak, LIMITS.anchor),
    keywords: sanitizeKeywords(o.keywords), probes: sanitizeProbes(o.probes),
  }
  if (!r.area) return { ok: false, error: 'Add the area (role or technology), e.g. "Oracle E-Business Suite".' }
  if (!r.subSkill) return { ok: false, error: 'Add the sub-skill name, e.g. "Oracle Integration Development".' }
  if (!r.proficientIn || !r.ableTo || !r.practices) return { ok: false, error: 'Fill all three parts of the statement: proficient in…, able to…, by following….' }
  return { ok: true, rubric: r }
}

/** Ready for review: the bar a reviewer can't skip. */
export function reviewReadiness(r: RubricContent): string | null {
  if (!r.strong || !r.weak) return 'Add what a strong and a weak answer look like, so the report can score against it.'
  if (!r.keywords.length) return 'Add at least one keyword, so JDs and live answers can be matched to this rubric.'
  if (!r.probes.length) return 'Add at least one probe question Ananya can ask toward this rubric.'
  return null
}

/* ── per-position selection ───────────────────────────────────────────────── */

/** What a position stores per selected rubric: id + tier + a SNAPSHOT of the
 *  reviewed content at selection time (later library edits don't silently
 *  change a live position's assessment). */
export interface SelectedRubric {
  rubricId: string
  tier: RubricTier
  source: 'jd' | 'manual'
  area: string
  subSkill: string
  statement: string
  strong: string
  weak: string
  keywords: string[]
  probes: RubricProbe[]
}

export const MAX_SELECTED = 24

/** Client → server request shape: ids + tiers only (the server rebuilds snapshots). */
export function sanitizeSelectionRequest(raw: unknown): { rubricId: string; tier: RubricTier; source: 'jd' | 'manual' }[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: { rubricId: string; tier: RubricTier; source: 'jd' | 'manual' }[] = []
  for (const v of raw) {
    const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
    const id = typeof o.rubricId === 'string' ? o.rubricId.trim().slice(0, 40) : ''
    if (!id || seen.has(id) || !isRubricTier(o.tier)) continue
    seen.add(id)
    out.push({ rubricId: id, tier: o.tier, source: o.source === 'jd' ? 'jd' : 'manual' })
    if (out.length >= MAX_SELECTED) break
  }
  return out
}

/** Read a stored selection defensively (DB JSON). */
export function readSelection(raw: unknown): SelectedRubric[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((v) => {
    const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
    if (typeof o.rubricId !== 'string' || !isRubricTier(o.tier) || typeof o.subSkill !== 'string') return []
    return [{
      rubricId: o.rubricId, tier: o.tier, source: o.source === 'jd' ? 'jd' as const : 'manual' as const,
      area: str(o.area, LIMITS.area), subSkill: str(o.subSkill, LIMITS.subSkill), statement: str(o.statement, 2000),
      strong: str(o.strong, LIMITS.anchor), weak: str(o.weak, LIMITS.anchor),
      keywords: sanitizeKeywords(o.keywords), probes: sanitizeProbes(o.probes),
    }]
  }).slice(0, MAX_SELECTED)
}

export function snapshotOf(row: RubricContent & { id: string }, tier: RubricTier, source: 'jd' | 'manual'): SelectedRubric {
  return {
    rubricId: row.id, tier, source, area: row.area, subSkill: row.subSkill, statement: proficiencyStatement(row),
    strong: row.strong, weak: row.weak, keywords: row.keywords, probes: row.probes,
  }
}
