import { isWorkspaceLanguage, type WorkspaceLanguage } from '@/lib/screen/workspace/task'

// ── Solve config (Screen-scoped, isomorphic) ───────────────────────────────
// Per-position settings for the async take-home (Stage 2). Stored on
// SolveAssignment.config and SNAPSHOT onto each SolveSubmission at invite time,
// so editing the position never changes a take-home a candidate already has.

export const DEFENSE_TIMING = ['immediate', 'flexible'] as const
export type DefenseTiming = (typeof DEFENSE_TIMING)[number]
export const INTEGRITY_LEVELS = ['light', 'standard', 'strict'] as const
export type IntegrityLevel = (typeof INTEGRITY_LEVELS)[number]
export const AI_POLICIES = ['not_allowed', 'allowed'] as const
export type AiPolicy = (typeof AI_POLICIES)[number]

export interface SolveConfig {
  windowDays: number            // the invite link is valid (to START) for this many days
  durationMinutes: number       // working time once started (the clock keeps running if they leave)
  languages: WorkspaceLanguage[] // [] = every language the task supports
  defenseRequired: boolean      // the defend-your-submission interview
  defenseTiming: DefenseTiming  // immediate = right after submit · flexible = within defenseWindowHours
  defenseWindowHours: number
  defenseQuestions: number      // follow-ups after "walk me through it" (the brain may stop earlier)
  aiPolicy: AiPolicy            // whether outside AI help is allowed (the defense still applies)
  integrityLevel: IntegrityLevel
}

export const DEFAULT_SOLVE_CONFIG: SolveConfig = {
  windowDays: 5,
  durationMinutes: 90,
  languages: [],
  defenseRequired: true,
  defenseTiming: 'flexible',
  defenseWindowHours: 72,
  defenseQuestions: 4,
  aiPolicy: 'not_allowed',
  integrityLevel: 'standard',
}

export const LIMITS = {
  windowDays: { min: 1, max: 21 },
  durationMinutes: { min: 20, max: 240 },
  defenseWindowHours: { min: 1, max: 168 },
  defenseQuestions: { min: 2, max: 6 },
}

const clampInt = (v: unknown, d: number, r: { min: number; max: number }) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(r.max, Math.max(r.min, n)) : d
}
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : d)

export function sanitizeSolveConfig(raw: unknown): SolveConfig {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_SOLVE_CONFIG
  const integrityLevel = oneOf(o.integrityLevel, INTEGRITY_LEVELS, d.integrityLevel)
  return {
    windowDays: clampInt(o.windowDays, d.windowDays, LIMITS.windowDays),
    durationMinutes: clampInt(o.durationMinutes, d.durationMinutes, LIMITS.durationMinutes),
    languages: Array.from(new Set((Array.isArray(o.languages) ? o.languages : []).filter(isWorkspaceLanguage))),
    // Strict integrity always requires the defense — it's the un-fakeable part.
    defenseRequired: integrityLevel === 'strict' ? true : typeof o.defenseRequired === 'boolean' ? o.defenseRequired : d.defenseRequired,
    defenseTiming: oneOf(o.defenseTiming, DEFENSE_TIMING, d.defenseTiming),
    defenseWindowHours: clampInt(o.defenseWindowHours, d.defenseWindowHours, LIMITS.defenseWindowHours),
    defenseQuestions: clampInt(o.defenseQuestions, d.defenseQuestions, LIMITS.defenseQuestions),
    aiPolicy: oneOf(o.aiPolicy, AI_POLICIES, d.aiPolicy),
    integrityLevel,
  }
}

/** Languages the candidate may use: the task's languages ∩ the configured subset (never empty). */
export function allowedLanguages(taskLanguages: WorkspaceLanguage[], cfg: SolveConfig): WorkspaceLanguage[] {
  if (!cfg.languages.length) return taskLanguages
  const both = taskLanguages.filter((l) => cfg.languages.includes(l))
  return both.length ? both : taskLanguages
}

export const INTEGRITY_INFO: Record<IntegrityLevel, string> = {
  light: 'Work timeline only (edits, runs, pastes).',
  standard: 'Work timeline plus tab-away tracking; large pastes are flagged for review.',
  strict: 'Everything in standard, any paste over 200 characters is flagged, and the defense interview is always required.',
}

export const SOLVE_STATUS_LABEL: Record<string, string> = {
  invited: 'Invited', started: 'In progress', submitted: 'Submitted', completed: 'Evaluated', expired: 'Expired',
}
export const DEFENSE_STATUS_LABEL: Record<string, string> = {
  not_required: 'Not required', pending: 'Defense pending', in_progress: 'Defending', completed: 'Defended', expired: 'Defense missed',
}
