// ── Standardized Hire trial — SINGLE SOURCE OF TRUTH ────────────────────────
// Every first-time Hire pilot is identical. All limit values live here so the
// standard can be tuned GLOBALLY without a code change/redeploy: set the env
// vars below on the host and restart. Hire-only — NO interview limits.
//
//   HIRE_TRIAL_DAYS        (default 21)
//   HIRE_TRIAL_JOBS        (default 15)
//   HIRE_TRIAL_CANDIDATES  (default 750)
//   HIRE_TRIAL_SEATS       (default 5)

const posInt = (v: string | undefined, dflt: number): number => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : dflt
}

export const TRIAL_CONFIG = {
  days: posInt(process.env.HIRE_TRIAL_DAYS, 21),
  activeJobs: posInt(process.env.HIRE_TRIAL_JOBS, 15),
  candidates: posInt(process.env.HIRE_TRIAL_CANDIDATES, 750),
  recruiters: posInt(process.env.HIRE_TRIAL_SEATS, 5),
} as const

// No interview cap during the Hire trial (Hire module only).
const NO_LIMIT = Number.MAX_SAFE_INTEGER

// Shape matches PlanLimits so getLimits() can return it directly.
// `candidatesPerMonth` is the trial's TOTAL candidate cap (the trial is < 1
// month, so the monthly counter never resets inside the window).
export const TRIAL_LIMITS = {
  recruiters: TRIAL_CONFIG.recruiters,
  activeJobs: TRIAL_CONFIG.activeJobs,
  candidatesPerMonth: TRIAL_CONFIG.candidates,
  aiInterviewsPerMonth: NO_LIMIT,
  trialDays: TRIAL_CONFIG.days,
}

/** When a trial started `from` should end. */
export function trialEndDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_CONFIG.days * 86400000)
}

/** Whole days left in the trial (0 once expired). */
export function trialDaysLeft(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
}

export interface TrialGuardTenant {
  trialActive: boolean
  trialEndsAt: Date | null
  subscriptionStatus: string | null
  currentPeriodEnd: Date | null
}

/** Has the trial window elapsed (independent of the stored trialActive flag)? */
export function trialExpired(t: TrialGuardTenant, now: Date = new Date()): boolean {
  return t.trialActive && !!t.trialEndsAt && now.getTime() > new Date(t.trialEndsAt).getTime()
}

/** Does the tenant currently have a paying (or grace-period) subscription? */
export function hasActiveSubscription(t: TrialGuardTenant, now: Date = new Date()): boolean {
  if (t.subscriptionStatus === 'active') return true
  const graceOk = t.subscriptionStatus === 'past_due' && !!t.currentPeriodEnd && now.getTime() < new Date(t.currentPeriodEnd).getTime() + 3 * 86400000
  return !!graceOk
}

/**
 * Read-only = the trial has ended (or was ended) AND there is no active
 * subscription. Read-only tenants can view everything but cannot create/add —
 * their data is never deleted.
 */
export function isReadOnly(t: TrialGuardTenant, now: Date = new Date()): boolean {
  if (hasActiveSubscription(t, now)) return false
  // Still inside a live trial → not read-only.
  if (t.trialActive && t.trialEndsAt && now.getTime() <= new Date(t.trialEndsAt).getTime()) return false
  // Trial elapsed, or trial already flipped off, with no subscription → read-only.
  if (trialExpired(t, now)) return true
  if (!t.trialActive) return true
  return false
}

/** Normalise an email to its domain (lowercased). */
export function emailDomain(email: string): string | null {
  const d = email.trim().toLowerCase().split('@')[1]
  return d && d.includes('.') ? d : null
}
