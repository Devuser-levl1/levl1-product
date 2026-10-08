// ── Must-have requirements (Screen-scoped) ─────────────────────────────────
// Recruiter-marked non-negotiables on a Position. The question generator must
// assess each one; the report rates each one met / not_met /
// insufficient_evidence, with the evidence quoted from the transcript.

export const MUST_HAVE_MAX = 8
export const MUST_HAVE_LEN = 120

export type MustHaveStatus = 'met' | 'not_met' | 'insufficient_evidence'
export interface MustHaveResult { requirement: string; status: MustHaveStatus; evidence: string }

const STATUSES = new Set<MustHaveStatus>(['met', 'not_met', 'insufficient_evidence'])

export const MUST_HAVE_LABEL: Record<MustHaveStatus, string> = {
  met: 'Met',
  not_met: 'Not met',
  insufficient_evidence: 'Insufficient evidence',
}

/** Clean an untrusted list: trimmed, de-duplicated (case-insensitive), capped. */
export function sanitizeMustHaves(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of raw) {
    if (typeof v !== 'string') continue
    const s = v.replace(/\s+/g, ' ').trim().slice(0, MUST_HAVE_LEN)
    if (!s || seen.has(s.toLowerCase())) continue
    seen.add(s.toLowerCase())
    out.push(s)
    if (out.length >= MUST_HAVE_MAX) break
  }
  return out
}

/**
 * Reconcile the model's output against the CONFIGURED list so the report always
 * has exactly one verdict per must-have — a requirement the model skipped is
 * "insufficient evidence", never silently dropped, and the model can't invent
 * extra ones. When the whole interview had no evaluable content, every
 * must-have is insufficient evidence (never "not met").
 */
export function reconcileMustHaves(configured: string[], modelOutput: unknown, opts: { insufficientEvidence?: boolean } = {}): MustHaveResult[] {
  const byKey = new Map<string, { status?: unknown; evidence?: unknown }>()
  if (Array.isArray(modelOutput)) {
    for (const r of modelOutput) {
      if (r && typeof r === 'object' && typeof (r as { requirement?: unknown }).requirement === 'string') {
        byKey.set(((r as { requirement: string }).requirement).trim().toLowerCase(), r as { status?: unknown; evidence?: unknown })
      }
    }
  }
  return configured.map((requirement) => {
    if (opts.insufficientEvidence) {
      return { requirement, status: 'insufficient_evidence', evidence: 'The interview had no evaluable content.' }
    }
    const m = byKey.get(requirement.toLowerCase())
    const status = STATUSES.has(m?.status as MustHaveStatus) ? (m!.status as MustHaveStatus) : 'insufficient_evidence'
    const evidence = typeof m?.evidence === 'string' && m.evidence.trim()
      ? m.evidence.trim().slice(0, 400)
      : status === 'insufficient_evidence' ? 'Not assessed in enough depth to judge.' : ''
    return { requirement, status, evidence }
  })
}

export function mustHaveSummary(results: MustHaveResult[] | null | undefined): string {
  if (!results?.length) return ''
  const met = results.filter((r) => r.status === 'met').length
  return `${met}/${results.length} met`
}
