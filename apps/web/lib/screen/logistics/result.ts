import { LogisticsConfig, WORK_MODE_LABEL, WorkMode } from './config'
import type { KnockoutQuestion, KnockoutResult, KnockoutVerdict } from '@/lib/screen/position-config'

// ── Logistics segment result + verdicts (Screen-scoped) ────────────────────
// The model only EXTRACTS what the candidate said (extraction). Every verdict
// is computed here, deterministically, against the position config — so the
// comp band is compared in code and never seen by the model.

export type Verdict = 'fit' | 'resolved' | 'gap' | 'mismatch' | 'recorded' | 'unknown'
export type CompVerdict = 'below' | 'within' | 'above' | 'recorded' | 'not_disclosed'
export type WorkAuthStatus = 'authorized' | 'needs_sponsorship' | 'not_authorized' | 'unclear'

export interface Extraction {
  location: {
    candidateLocation: string | null
    preferredMode: WorkMode | 'flexible' | null
    willingToRelocate: 'yes' | 'no' | 'conditional' | null
    agreedArrangement: string | null   // the concrete resolution reached, in one sentence
    resolved: boolean                  // did the conversation land on something the role allows?
    acceptsOfficeDays: boolean | null  // hybrid: agreed to the role's in-office days?
  }
  notice: { noticeDays: number | null; earliestStart: string | null; note: string | null }
  comp: { amount: number | null; currency: string | null; period: 'annual' | 'monthly' | null; asSaid: string | null }
  workAuth: { status: WorkAuthStatus }
  knockouts: { id: string; answer: string | null; verdict: KnockoutVerdict }[]
}

export interface LogisticsResult {
  location: { verdict: Verdict; summary: string; candidateLocation: string | null; preferredMode: string | null; agreedArrangement: string | null }
  notice: { verdict: Verdict; summary: string; noticeDays: number | null; earliestStart: string | null }
  comp: { verdict: CompVerdict; summary: string; asSaid: string | null; amount: number | null; currency: string | null; period: string | null }
  workAuth: { verdict: Verdict; summary: string; status: WorkAuthStatus }
  hardMismatch: boolean
  completed: boolean   // false when the segment was cut short (time-up / termination)
  // Recruiter knockout questions (#14) — SURFACED for review, never auto-reject.
  knockouts: KnockoutResult[]
  knockoutsNotMet: number
}

const MODE_SET = new Set(['onsite', 'hybrid', 'remote', 'flexible'])
const AUTH_SET = new Set<WorkAuthStatus>(['authorized', 'needs_sponsorship', 'not_authorized', 'unclear'])

/** Untrusted model JSON → a well-typed extraction (anything odd → null/unclear). */
export function sanitizeExtraction(raw: unknown): Extraction {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, Record<string, unknown> | undefined>
  const s = (v: unknown, n = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null)
  const l = o.location ?? {}, no = o.notice ?? {}, c = o.comp ?? {}, w = o.workAuth ?? {}
  const date = s(no.earliestStart, 10)
  return {
    location: {
      candidateLocation: s(l.candidateLocation, 120),
      preferredMode: MODE_SET.has(l.preferredMode as string) ? (l.preferredMode as Extraction['location']['preferredMode']) : null,
      willingToRelocate: l.willingToRelocate === 'yes' || l.willingToRelocate === 'no' || l.willingToRelocate === 'conditional' ? l.willingToRelocate : null,
      agreedArrangement: s(l.agreedArrangement, 300),
      resolved: l.resolved === true,
      acceptsOfficeDays: typeof l.acceptsOfficeDays === 'boolean' ? l.acceptsOfficeDays : null,
    },
    notice: { noticeDays: n(no.noticeDays), earliestStart: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null, note: s(no.note, 200) },
    comp: {
      amount: n(c.amount),
      currency: typeof c.currency === 'string' && /^[A-Z]{3}$/.test(c.currency) ? c.currency : null,
      period: c.period === 'monthly' || c.period === 'annual' ? c.period : null,
      asSaid: s(c.asSaid, 120),
    },
    // Only the four-state status is ever kept — any volunteered detail is dropped.
    workAuth: { status: AUTH_SET.has(w.status as WorkAuthStatus) ? (w.status as WorkAuthStatus) : 'unclear' },
    knockouts: Array.isArray((raw as Record<string, unknown> | null)?.knockouts)
      ? ((raw as Record<string, unknown>).knockouts as unknown[]).flatMap((k) => {
          const o = (k && typeof k === 'object' ? k : {}) as Record<string, unknown>
          if (typeof o.id !== 'string') return []
          const verdict = KO_SET.has(o.verdict as KnockoutVerdict) ? (o.verdict as KnockoutVerdict) : 'unclear'
          return [{ id: o.id, answer: s(o.answer, 200), verdict }]
        })
      : [],
  }
}

const KO_SET = new Set<KnockoutVerdict>(['met', 'not_met', 'unclear', 'not_asked'])

export function computeVerdicts(cfg: LogisticsConfig, x: Extraction, opts: { completed: boolean; knockouts?: KnockoutQuestion[] }): LogisticsResult {
  // ── Location / work mode ──
  const allowed = cfg.workModes ?? []
  const pref = x.location.preferredMode
  let locVerdict: Verdict
  let locSummary: string
  const prefLabel = pref === 'flexible' ? 'Flexible' : pref ? WORK_MODE_LABEL[pref] : null
  if (!allowed.length && !cfg.location) {
    locVerdict = pref || x.location.candidateLocation ? 'recorded' : 'unknown'
    locSummary = [x.location.candidateLocation && `Based in ${x.location.candidateLocation}`, prefLabel && `prefers ${prefLabel.toLowerCase()}`].filter(Boolean).join(', ') || 'Not discussed'
  } else if (!pref) {
    locVerdict = 'unknown'
    locSummary = 'Work-mode preference not established'
  } else if (pref === 'flexible' || allowed.length === 0 || allowed.includes(pref)) {
    locVerdict = needsRelocation(cfg, x) ? (x.location.resolved ? 'resolved' : 'mismatch') : 'fit'
    locSummary = locVerdict === 'fit' ? `${prefLabel} — matches the role` : locVerdict === 'resolved' ? `Resolved: ${x.location.agreedArrangement ?? 'arrangement agreed'}` : `Role requires relocation to ${cfg.location}; candidate unwilling — unresolved`
  } else if (x.location.resolved) {
    locVerdict = 'resolved'
    locSummary = `Wanted ${prefLabel!.toLowerCase()}; resolved: ${x.location.agreedArrangement ?? 'agreed to the role\'s arrangement'}`
  } else if (x.location.agreedArrangement && x.location.willingToRelocate !== 'no') {
    // Candidate moved toward the role but proposed terms outside the constraints
    // (e.g. remote first, then relocate) — a recruiter call, not a hard blocker.
    locVerdict = 'gap'
    locSummary = `Wanted ${prefLabel!.toLowerCase()}; proposes: ${x.location.agreedArrangement} — needs hiring-team sign-off`
  } else {
    locVerdict = 'mismatch'
    locSummary = `Requires ${prefLabel!.toLowerCase()}; role is ${allowed.map((m) => WORK_MODE_LABEL[m].toLowerCase()).join('/')}${cfg.location ? ` in ${cfg.location}` : ''} — unresolved`
  }

  // ── Notice / start ──
  let noticeVerdict: Verdict = 'recorded'
  const parts: string[] = []
  if (x.notice.noticeDays !== null) parts.push(`${x.notice.noticeDays}-day notice`)
  if (x.notice.earliestStart) parts.push(`can start ${x.notice.earliestStart}`)
  const gaps: string[] = []
  if (cfg.maxNoticeDays !== undefined && x.notice.noticeDays !== null && x.notice.noticeDays > cfg.maxNoticeDays) gaps.push(`${x.notice.noticeDays - cfg.maxNoticeDays} days over the ${cfg.maxNoticeDays}-day max`)
  if (cfg.targetStartBy && x.notice.earliestStart && x.notice.earliestStart > cfg.targetStartBy) gaps.push(`after the ${cfg.targetStartBy} target`)
  if (x.notice.noticeDays === null && !x.notice.earliestStart) noticeVerdict = 'unknown'
  else if (cfg.maxNoticeDays !== undefined || cfg.targetStartBy) noticeVerdict = gaps.length ? 'gap' : 'fit'
  const noticeSummary = noticeVerdict === 'unknown' ? 'Notice period not established'
    : `${parts.join(', ')}${gaps.length ? ` — ${gaps.join('; ')}` : noticeVerdict === 'fit' ? ' — within target' : ''}${x.notice.note ? ` (${x.notice.note})` : ''}`

  // ── Comp (band compared in code; never seen by the model) ──
  let compVerdict: CompVerdict
  let compSummary: string
  const band = cfg.comp
  const amount = normaliseAmount(x.comp.amount, x.comp.period, band?.period)
  const currencyOk = !band || !x.comp.currency || x.comp.currency === band.currency
  if (x.comp.amount === null) {
    compVerdict = 'not_disclosed'
    compSummary = 'Did not share an expectation'
  } else if (!band || !currencyOk) {
    compVerdict = 'recorded'
    compSummary = `Expects ${x.comp.asSaid ?? fmtMoney(x.comp.amount, x.comp.currency, x.comp.period)}${band && !currencyOk ? ' (different currency — compare manually)' : ''}`
  } else {
    compVerdict = band.min !== undefined && amount! < band.min ? 'below' : band.max !== undefined && amount! > band.max ? 'above' : 'within'
    compSummary = `Expects ${x.comp.asSaid ?? fmtMoney(x.comp.amount, x.comp.currency, x.comp.period)} — ${compVerdict === 'within' ? 'within band' : compVerdict === 'above' ? 'above band' : 'below band'}`
  }

  // ── Work authorization (status only) ──
  const st = x.workAuth.status
  const authVerdict: Verdict = st === 'unclear' ? 'unknown'
    : !cfg.workAuthRequired ? 'recorded'
    : st === 'authorized' ? 'fit' : 'mismatch'
  const authSummary = { authorized: 'Authorized to work in the job location', needs_sponsorship: 'Needs sponsorship', not_authorized: 'Not authorized to work in the job location', unclear: 'Not established' }[st]
    + (authVerdict === 'mismatch' ? ' — role requires authorization' : '')

  // Hybrid in-office days (#7): agreed to hybrid but not the role's office days.
  if (cfg.hybridDaysPerWeek && pref === 'hybrid' && x.location.acceptsOfficeDays === false && (locVerdict === 'fit' || locVerdict === 'unknown')) {
    locVerdict = 'gap'
    locSummary = `Wants hybrid but not ${cfg.hybridDaysPerWeek} office days/week${x.location.agreedArrangement ? ` — proposes: ${x.location.agreedArrangement}` : ''}`
  } else if (cfg.hybridDaysPerWeek && pref === 'hybrid' && locVerdict === 'fit') {
    locSummary = `Hybrid — matches the role (${cfg.hybridDaysPerWeek} office day${cfg.hybridDaysPerWeek > 1 ? 's' : ''}/week${x.location.acceptsOfficeDays ? ', confirmed' : ''})`
  }

  // Knockouts: one verdict per CONFIGURED question (never dropped or invented).
  const byId = new Map(x.knockouts.map((k) => [k.id, k]))
  const knockouts: KnockoutResult[] = (opts.knockouts ?? []).map((q) => {
    const k = byId.get(q.id)
    return { id: q.id, question: q.question, requiredAnswer: q.requiredAnswer, answer: k?.answer ?? null, verdict: k?.verdict ?? (opts.completed ? 'unclear' : 'not_asked') }
  })

  const hardMismatch = locVerdict === 'mismatch' || authVerdict === 'mismatch'
  return {
    location: { verdict: locVerdict, summary: locSummary, candidateLocation: x.location.candidateLocation, preferredMode: pref, agreedArrangement: x.location.agreedArrangement },
    notice: { verdict: noticeVerdict, summary: noticeSummary, noticeDays: x.notice.noticeDays, earliestStart: x.notice.earliestStart },
    comp: { verdict: compVerdict, summary: compSummary, asSaid: x.comp.asSaid, amount: x.comp.amount, currency: x.comp.currency, period: x.comp.period },
    workAuth: { verdict: authVerdict, summary: authSummary, status: st },
    hardMismatch,
    completed: opts.completed,
    knockouts,
    knockoutsNotMet: knockouts.filter((k) => k.verdict === 'not_met').length,
  }
}

// On-site/hybrid role in a set location + relocation required + candidate elsewhere and unwilling.
function needsRelocation(cfg: LogisticsConfig, x: Extraction): boolean {
  if (cfg.relocation !== 'required' || !cfg.location) return false
  if (x.location.preferredMode === 'remote') return false
  return x.location.willingToRelocate === 'no'
}

function normaliseAmount(amount: number | null, from: 'annual' | 'monthly' | null, to: 'annual' | 'monthly' | undefined): number | null {
  if (amount === null) return null
  if (!to || !from || from === to) return amount
  return from === 'monthly' ? amount * 12 : Math.round(amount / 12)
}

export function fmtMoney(amount: number, currency: string | null, period: string | null): string {
  const cur = currency ?? ''
  const v = cur === 'INR' && amount >= 100000 ? `${(amount / 100000).toFixed(amount % 100000 ? 1 : 0)} lakh` : amount.toLocaleString('en-US')
  return `${cur ? `${cur} ` : ''}${v}${period ? ` / ${period === 'annual' ? 'year' : 'month'}` : ''}`
}
