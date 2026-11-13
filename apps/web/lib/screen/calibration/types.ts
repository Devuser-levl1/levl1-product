import { canonicalSkill, normTerm } from '@/lib/screen/tech-terms'
import { isRubricTier, type RubricTier } from '@/lib/screen/rubrics/types'

// ── AI draft → moderator calibration (Screen-scoped, isomorphic) ───────────
// From a position, the AI drafts rubrics (with tiers) and work-sample tasks.
// The moderator CALIBRATES: reviews each item with the AI's reasoning and
// confidence visible, edits, re-tiers, regenerates, and approves item by item.
// Nothing is used live until approved. State lives in Position.calibration;
// the content itself lives in the existing rubric library / task bank as
// drafts (source "ai"), so manual authoring and the review gates still apply.

export type CalibrationStatus = 'idle' | 'generating' | 'ready' | 'failed'
export type ItemKind = 'rubric' | 'task'
export type Decision = 'pending' | 'approved' | 'rejected'

export interface CalibrationItem {
  id: string                 // stable item id within the set
  kind: ItemKind
  refId: string              // RubricLibraryItem.id | TaskBankItem.id
  reuse: boolean             // an existing ACTIVE library rubric / bank task the AI proposes reusing
  tier: RubricTier | null    // rubrics only (moderator can change)
  proposedTier: RubricTier | null
  reasoning: string          // why the AI proposed it (and the tier / tests)
  tierReason: string
  confidence: number         // 0–1, the model's self-assessment
  uncertainty: string        // what the model said it was unsure about
  flags: string[]            // deterministic low-confidence reasons
  decision: Decision
  note: string | null        // the moderator's calibration note
  decidedBy: string | null
  decidedAt: string | null
  updatedAt: string
}

export interface CalibrationState {
  status: CalibrationStatus
  error: string | null
  model: string | null
  startedAt: string | null
  generatedAt: string | null
  jdThin: boolean
  items: CalibrationItem[]
}

export const EMPTY_STATE: CalibrationState = { status: 'idle', error: null, model: null, startedAt: null, generatedAt: null, jdThin: false, items: [] }

/** Below this self-reported confidence an item is flagged for attention. */
export const LOW_CONFIDENCE = 0.6
/** A low-confidence item can't be approved without a note at least this long. */
export const MIN_NOTE_CHARS = 15
/** A JD shorter than this gives the AI little to go on. */
export const THIN_JD_CHARS = 600

export const isLowConfidence = (i: Pick<CalibrationItem, 'confidence' | 'flags'>) => i.confidence < LOW_CONFIDENCE || i.flags.length > 0

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '')
const num01 = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : d }

export function readState(raw: unknown): CalibrationState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const status = (['idle', 'generating', 'ready', 'failed'] as const).includes(o.status as CalibrationStatus) ? (o.status as CalibrationStatus) : 'idle'
  const items = (Array.isArray(o.items) ? o.items : []).flatMap((v): CalibrationItem[] => {
    const i = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
    if (typeof i.id !== 'string' || typeof i.refId !== 'string' || (i.kind !== 'rubric' && i.kind !== 'task')) return []
    return [{
      id: i.id, kind: i.kind, refId: i.refId, reuse: i.reuse === true,
      tier: isRubricTier(i.tier) ? i.tier : null, proposedTier: isRubricTier(i.proposedTier) ? i.proposedTier : null,
      reasoning: str(i.reasoning, 2000), tierReason: str(i.tierReason, 600), confidence: num01(i.confidence, 0.5), uncertainty: str(i.uncertainty, 800),
      flags: Array.isArray(i.flags) ? i.flags.filter((f): f is string => typeof f === 'string').slice(0, 8) : [],
      decision: i.decision === 'approved' || i.decision === 'rejected' ? i.decision : 'pending',
      note: typeof i.note === 'string' ? i.note.slice(0, 2000) : null,
      decidedBy: typeof i.decidedBy === 'string' ? i.decidedBy : null, decidedAt: typeof i.decidedAt === 'string' ? i.decidedAt : null,
      updatedAt: typeof i.updatedAt === 'string' ? i.updatedAt : new Date(0).toISOString(),
    }]
  })
  return {
    status, error: typeof o.error === 'string' ? o.error : null, model: typeof o.model === 'string' ? o.model : null,
    startedAt: typeof o.startedAt === 'string' ? o.startedAt : null, generatedAt: typeof o.generatedAt === 'string' ? o.generatedAt : null,
    jdThin: o.jdThin === true, items,
  }
}

/* ── deterministic low-confidence flags ───────────────────────────────────── */

export interface PositionLike { techStack: string[]; mustHaves: string[]; goodToHave: string[]; jdText: string | null }

const mentions = (hay: string, kw: string) => {
  const k = normTerm(kw)
  if (k.length < 2) return false
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![a-z0-9.])${esc}(?![a-z0-9+#])`, 'i').test(hay)
}

/** Why a drafted rubric needs a closer look (empty = nothing found). */
export function rubricFlags(r: { subSkill: string; keywords: string[]; strong: string; weak: string; probes: unknown[]; tier: RubricTier | null }, p: PositionLike, existingActive: { subSkill: string }[]): string[] {
  const flags: string[] = []
  const jd = ` ${normTerm(p.jdText ?? '')} `
  const required = ` ${normTerm([...p.techStack, ...p.mustHaves].join(' . '))} `
  const reqCanon = new Set(p.techStack.map((s) => (canonicalSkill(s) ?? s).toLowerCase()))
  const kws = [r.subSkill, ...r.keywords]
  const inRequired = kws.some((k) => mentions(required, k) || reqCanon.has((canonicalSkill(k) ?? '').toLowerCase()))
  const inJd = kws.some((k) => mentions(jd, k))
  if (r.tier === 'must' && !inRequired) flags.push('Tiered Must-have, but none of its terms appear in the required skills or must-haves.')
  if (!inRequired && !inJd) flags.push('Inferred: its skills are not named in the JD.')
  if (!r.strong.trim() || !r.weak.trim()) flags.push('Missing strong or weak anchors.')
  if (!r.probes.length) flags.push('No probe questions with expected answers.')
  const dup = existingActive.find((e) => normTerm(e.subSkill) === normTerm(r.subSkill))
  if (dup) flags.push(`May duplicate the active rubric "${dup.subSkill}".`)
  return flags
}

/** Why a drafted task needs a closer look. */
export function taskFlags(t: { verified: boolean; testCount: number; droppedTests: number; hasReference: boolean; judge0: boolean }): string[] {
  const flags: string[] = []
  if (!t.hasReference) flags.push('No reference solution — tests could not be checked.')
  else if (!t.judge0) flags.push('Judge0 is not configured — expected outputs were not verified by running the reference.')
  else if (!t.verified) flags.push('The reference solution did not pass its own tests — expected outputs are unverified.')
  if (t.droppedTests > 0) flags.push(`${t.droppedTests} test(s) dropped because the reference solution failed them.`)
  if (t.testCount < 4) flags.push(`Only ${t.testCount} test(s) — edge cases may be uncovered.`)
  return flags
}
