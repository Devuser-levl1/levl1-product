// ── Position logistics constraints (Screen-scoped) ─────────────────────────
// What the interviewer negotiates against in the logistics segment. Stored as
// Position.logistics (Json). Every key is optional: a missing key means "not
// specified", and the segment then RECORDS that filter instead of negotiating.
//
// PRIVACY: `comp` (the salary band) is recruiter-only. It is never passed to
// the model (see constraintsForModel) and never returned to a candidate-facing
// endpoint. The comp verdict is computed server-side in code (result.ts).

export type WorkMode = 'onsite' | 'hybrid' | 'remote'
export type Relocation = 'required' | 'supported' | 'not_required'
export type CompPeriod = 'annual' | 'monthly'

export interface CompBand { min?: number; max?: number; currency: string; period: CompPeriod }

export interface LogisticsConfig {
  location?: string            // "Bengaluru, India"
  workModes?: WorkMode[]       // modes the role ALLOWS
  relocation?: Relocation      // expectation for candidates outside `location`
  maxNoticeDays?: number       // longest acceptable notice period
  targetStartBy?: string       // YYYY-MM-DD — want them started by
  comp?: CompBand              // RECRUITER-ONLY
  workAuthRequired?: boolean   // must be authorized to work in `location`
}

export const WORK_MODES: WorkMode[] = ['onsite', 'hybrid', 'remote']
export const WORK_MODE_LABEL: Record<WorkMode, string> = { onsite: 'On-site', hybrid: 'Hybrid', remote: 'Remote' }
export const RELOCATION_LABEL: Record<Relocation, string> = {
  required: 'Must relocate to the job location',
  supported: 'Relocation supported',
  not_required: 'No relocation needed',
}

const num = (v: unknown, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), max) : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Math.min(Math.max(0, Math.round(Number(v))), max) : undefined

/** Untrusted input → clean config (unknown keys dropped, empty → omitted). */
export function sanitizeLogisticsConfig(raw: unknown): LogisticsConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const cfg: LogisticsConfig = {}
  if (typeof o.location === 'string' && o.location.trim()) cfg.location = o.location.replace(/\s+/g, ' ').trim().slice(0, 120)
  if (Array.isArray(o.workModes)) {
    const modes = WORK_MODES.filter((m) => (o.workModes as unknown[]).includes(m))
    if (modes.length) cfg.workModes = modes
  }
  if (o.relocation === 'required' || o.relocation === 'supported' || o.relocation === 'not_required') cfg.relocation = o.relocation
  const notice = num(o.maxNoticeDays, 365)
  if (notice !== undefined) cfg.maxNoticeDays = notice
  if (typeof o.targetStartBy === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.targetStartBy)) cfg.targetStartBy = o.targetStartBy
  if (o.comp && typeof o.comp === 'object') {
    const c = o.comp as Record<string, unknown>
    const min = num(c.min, 1e12), max = num(c.max, 1e12)
    if (min !== undefined || max !== undefined) {
      cfg.comp = {
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
        currency: typeof c.currency === 'string' && /^[A-Z]{3}$/.test(c.currency) ? c.currency : 'INR',
        period: c.period === 'monthly' ? 'monthly' : 'annual',
      }
      if (cfg.comp.min !== undefined && cfg.comp.max !== undefined && cfg.comp.min > cfg.comp.max) {
        ;[cfg.comp.min, cfg.comp.max] = [cfg.comp.max, cfg.comp.min]
      }
    }
  }
  if (typeof o.workAuthRequired === 'boolean') cfg.workAuthRequired = o.workAuthRequired
  return cfg
}

export function readLogisticsConfig(raw: unknown): LogisticsConfig {
  return sanitizeLogisticsConfig(raw)
}

/**
 * The ONLY view of the constraints the model ever sees: no comp band. Each
 * line says whether the filter is a real constraint (negotiate / compare) or
 * not specified (just record).
 */
export function constraintsForModel(cfg: LogisticsConfig): string {
  const loc = cfg.location ?? 'not specified'
  const modes = cfg.workModes?.length ? cfg.workModes.map((m) => WORK_MODE_LABEL[m]).join(' / ') : null
  const lines = [
    `- Job location: ${loc}`,
    modes
      ? `- Allowed work modes: ${modes} ONLY${cfg.workModes!.length < 3 ? ` (${WORK_MODES.filter((m) => !cfg.workModes!.includes(m)).map((m) => WORK_MODE_LABEL[m]).join(' / ')} is NOT available)` : ''} → NEGOTIATE if the candidate wants something else`
      : `- Work mode: not specified → just record their preference`,
    cfg.relocation ? `- Relocation: ${RELOCATION_LABEL[cfg.relocation]}` : `- Relocation: not specified → just record`,
    cfg.maxNoticeDays !== undefined || cfg.targetStartBy
      ? `- Start: the team hopes to have someone start soon (do NOT state exact internal targets; just capture their notice period and earliest start)`
      : `- Start: not specified → just record notice period and earliest start`,
    `- Compensation: ask for their expectation only. You do NOT know the budget — never state, hint at, or negotiate a number.`,
    cfg.workAuthRequired
      ? `- Work authorization: REQUIRED for ${loc === 'not specified' ? 'the country where the role is based' : loc}`
      : `- Work authorization: not specified → still ask the one neutral question and record the answer`,
  ]
  return lines.join('\n')
}

export function hasAnyConstraint(cfg: LogisticsConfig): boolean {
  return !!(cfg.location || cfg.workModes?.length || cfg.relocation || cfg.maxNoticeDays !== undefined || cfg.targetStartBy || cfg.comp || cfg.workAuthRequired !== undefined)
}

/** Neutral, narrow work-authorization question (legal + bias constraint). */
export function workAuthQuestion(cfg: LogisticsConfig): string {
  return cfg.location
    ? `Are you currently authorized to work in ${cfg.location}?`
    : `Are you currently authorized to work in the country where this role is based?`
}
