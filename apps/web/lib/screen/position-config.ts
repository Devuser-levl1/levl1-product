// ── Position setup config (Screen-scoped, Fixpack 3) ───────────────────────
// Pure + isomorphic: used by the setup UI, the position APIs (sanitizing
// untrusted input) and the generation/report prompts.

// ── Experience range (#4) ──────────────────────────────────────────────────
export const EXP_MAX_YEARS = 40

export interface ExperienceRange { min: number; max: number }

/** "3–6 years" — the display string stored in Position.experienceLevel. */
export function formatExperience(r: ExperienceRange): string {
  return r.min === r.max ? `${r.min} years` : `${r.min}–${r.max} years`
}

/** Parse "5–8 years", "5-8", "18+ years", "6 years" → range (null if unparseable). */
export function parseExperience(v: unknown): ExperienceRange | null {
  if (typeof v !== 'string') return null
  const nums = (v.match(/\d+/g) ?? []).map(Number).filter((n) => n <= EXP_MAX_YEARS)
  if (!nums.length) return null
  if (/\+/.test(v) && nums.length === 1) return { min: nums[0], max: Math.max(nums[0], Math.min(EXP_MAX_YEARS, nums[0] + 10)) }
  const [a, b = a] = nums
  return { min: Math.min(a, b), max: Math.max(a, b) }
}

/** Untrusted min/max → a valid range, or null (min > max is rejected, not swapped). */
export function sanitizeExperience(min: unknown, max: unknown): ExperienceRange | null {
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x) : typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x)) ? Math.round(Number(x)) : null)
  const a = n(min), b = n(max)
  if (a === null || b === null || a < 0 || b > EXP_MAX_YEARS || a > b) return null
  return { min: a, max: b }
}

/** Seniority from the range (replaces exact-string checks like "8–12 years"). */
export function isSeniorExperience(r: ExperienceRange | null): boolean { return !!r && r.min >= 8 }
export function isJuniorExperience(r: ExperienceRange | null): boolean { return !!r && r.max <= 3 }

// ── Question mix (#15) ─────────────────────────────────────────────────────
// concept   = basic-concept / fundamentals knowledge check (short, direct)
// technical = applied technical / project-execution depth
// scenario  = situational, judgment under realistic constraints
// behavioral/eq = conversational, about the person (no framework demanded)
export const MIX_KEYS = ['concept', 'technical', 'scenario', 'behavioral', 'eq'] as const
export type MixKey = (typeof MIX_KEYS)[number]
export type QuestionMix = Record<MixKey, number>

export const MIX_LABEL: Record<MixKey, { label: string; hint: string }> = {
  concept: { label: 'Basic concepts', hint: 'Direct fundamentals checks (~1–2 min each)' },
  technical: { label: 'Applied technical', hint: 'How they built / debugged real systems' },
  scenario: { label: 'Scenario', hint: 'Judgment in a realistic situation' },
  behavioral: { label: 'Behavioral', hint: 'Conversational — how they work with people' },
  eq: { label: 'EQ', hint: 'Self-awareness, resilience, influence' },
}

// ~14-min Q&A budget: short concept checks + one deep question per other type.
export const DEFAULT_MIX: QuestionMix = { concept: 2, technical: 1, scenario: 1, behavioral: 1, eq: 1 }
export const MIX_MAX_PER_TYPE = 4
export const MIX_MAX_TOTAL = 8

export function sanitizeMix(raw: unknown): QuestionMix {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const mix = { ...DEFAULT_MIX }
  for (const k of MIX_KEYS) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) mix[k] = Math.max(0, Math.min(MIX_MAX_PER_TYPE, Math.round(v)))
  }
  // Keep the total inside the time budget: trim from the largest buckets.
  let total = MIX_KEYS.reduce((s, k) => s + mix[k], 0)
  while (total > MIX_MAX_TOTAL) {
    const k = [...MIX_KEYS].sort((a, b) => mix[b] - mix[a])[0]
    mix[k] -= 1; total -= 1
  }
  if (total === 0) return { ...DEFAULT_MIX }
  return mix
}

export function mixTotal(m: QuestionMix): number { return MIX_KEYS.reduce((s, k) => s + m[k], 0) }

// ── JD-based concept rubric (#13) ──────────────────────────────────────────
export interface ConceptRubricItem { id: string; concept: string; strong: string; weak: string }
export const RUBRIC_MAX = 8

export function sanitizeConceptRubric(raw: unknown): ConceptRubricItem[] {
  if (!Array.isArray(raw)) return []
  const out: ConceptRubricItem[] = []
  const seen = new Set<string>()
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const concept = typeof o.concept === 'string' ? o.concept.replace(/\s+/g, ' ').trim().slice(0, 120) : ''
    if (!concept || seen.has(concept.toLowerCase())) continue
    seen.add(concept.toLowerCase())
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id.slice(0, 40) : `c${out.length + 1}`,
      concept,
      strong: typeof o.strong === 'string' ? o.strong.trim().slice(0, 400) : '',
      weak: typeof o.weak === 'string' ? o.weak.trim().slice(0, 400) : '',
    })
    if (out.length >= RUBRIC_MAX) break
  }
  return out
}

export type ConceptRating = 'strong' | 'adequate' | 'weak' | 'not_assessed'
export interface ConceptAssessment { concept: string; rating: ConceptRating; evidence: string }
const RATINGS = new Set<ConceptRating>(['strong', 'adequate', 'weak', 'not_assessed'])

/** One rating per configured concept — never dropped, never invented. */
export function reconcileConcepts(rubric: ConceptRubricItem[], modelOutput: unknown, opts: { insufficientEvidence?: boolean } = {}): ConceptAssessment[] {
  const by = new Map<string, Record<string, unknown>>()
  if (Array.isArray(modelOutput)) {
    for (const r of modelOutput) {
      if (r && typeof r === 'object' && typeof (r as { concept?: unknown }).concept === 'string') {
        by.set(((r as { concept: string }).concept).trim().toLowerCase(), r as Record<string, unknown>)
      }
    }
  }
  return rubric.map(({ concept }) => {
    if (opts.insufficientEvidence) return { concept, rating: 'not_assessed', evidence: 'The interview had no evaluable content.' }
    const m = by.get(concept.toLowerCase())
    const rating = RATINGS.has(m?.rating as ConceptRating) ? (m!.rating as ConceptRating) : 'not_assessed'
    const evidence = typeof m?.evidence === 'string' ? m.evidence.trim().slice(0, 400) : ''
    return { concept, rating, evidence: evidence || (rating === 'not_assessed' ? 'Not covered in enough depth to judge.' : '') }
  })
}

// ── Knockout questions (#14) ───────────────────────────────────────────────
// Asked verbatim at the end of the logistics segment. A disqualifying answer is
// SURFACED in the report for the recruiter — it never auto-rejects anyone.
export interface KnockoutQuestion { id: string; question: string; requiredAnswer: string }
export const KNOCKOUT_MAX = 3

export function sanitizeKnockouts(raw: unknown): KnockoutQuestion[] {
  if (!Array.isArray(raw)) return []
  const out: KnockoutQuestion[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    const question = typeof o.question === 'string' ? o.question.replace(/\s+/g, ' ').trim().slice(0, 200) : ''
    const requiredAnswer = typeof o.requiredAnswer === 'string' ? o.requiredAnswer.replace(/\s+/g, ' ').trim().slice(0, 120) : ''
    if (!question || !requiredAnswer) continue
    out.push({ id: typeof o.id === 'string' && o.id ? o.id.slice(0, 40) : `k${out.length + 1}`, question, requiredAnswer })
    if (out.length >= KNOCKOUT_MAX) break
  }
  return out
}

export type KnockoutVerdict = 'met' | 'not_met' | 'unclear' | 'not_asked'
export interface KnockoutResult { id: string; question: string; requiredAnswer: string; answer: string | null; verdict: KnockoutVerdict }

/* ── Fixpack 7 #1 — per-job approver / contact emails ─────────────────────
 * Stored on the Position (techLeadEmail, hrEmail, clientManagerEmail) — they
 * differ job to job, so they are never fixed at org onboarding. Format check
 * only: client HR / tech leads may legitimately use any provider. */
export const CONTACT_EMAIL_FIELDS = ['techLeadEmail', 'hrEmail', 'clientManagerEmail'] as const
export type ContactEmailField = (typeof CONTACT_EMAIL_FIELDS)[number]
const CONTACT_EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/

/** null when empty or valid; otherwise a user-facing message. */
export function contactEmailError(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) return null
  if (s.length > 254 || !CONTACT_EMAIL_RE.test(s)) return 'Enter a valid email address, e.g. name@company.com.'
  return null
}

const CONTACT_LABEL: Record<ContactEmailField, string> = { techLeadEmail: 'Technical lead email', hrEmail: 'HR email', clientManagerEmail: 'Hiring contact email' }

/** Normalise the contact-email fields present in `data` in place (trim +
 *  lowercase, blank → null). Returns an error message for the first invalid one. */
export function sanitizeContactEmails(data: Record<string, unknown>): string | null {
  for (const f of CONTACT_EMAIL_FIELDS) {
    if (!(f in data)) continue
    const v = data[f]
    if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) { data[f] = null; continue }
    if (typeof v !== 'string') return `${CONTACT_LABEL[f]} must be text.`
    const err = contactEmailError(v)
    if (err) return `${CONTACT_LABEL[f]}: ${err}`
    data[f] = v.trim().toLowerCase()
  }
  return null
}
