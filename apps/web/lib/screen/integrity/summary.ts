import { IntegrityEventType, INTEGRITY_EVENT_TYPES, INTEGRITY_LABELS } from './events'

// ── Integrity summary + human-review routing (Screen-scoped) ───────────────
// Integrity is a SEPARATE axis from competency. This module never returns a
// score that feeds the candidate's assessment, and the only verdicts are
// CLEAN / FLAGGED_FOR_REVIEW — never an automatic disqualification.

export type ReviewStatus = 'CLEAN' | 'FLAGGED_FOR_REVIEW'

export interface IntegrityEventRecord {
  type: string
  occurredAt: Date | string
  durationMs?: number | null
  confidence?: number | null
  detail?: string | null
}

export interface IntegritySummary {
  totalEvents: number
  totalFlags: number             // weighted, high-confidence flag count
  countsByType: Record<string, number>
  reviewStatus: ReviewStatus
  // Evidence-linked: every flag carries its timestamp + detail so a human can
  // audit it. We NEVER surface a verdict without the underlying events.
  events: { type: string; label: string; occurredAt: string; durationMs: number | null; confidence: number; detail: string | null }[]
  threshold: number
}

// A flag "counts" toward review when it is reasonably confident. Tab/window and
// multi-person/object events are weighted more (clearer integrity signals).
const HEAVY: ReadonlySet<string> = new Set(['multiple_faces', 'object_in_frame', 'tab_switch', 'screen_share_drop'])
const MIN_CONFIDENCE = 0.6

export interface SummaryOptions {
  // Flags needed to route to human review. Configurable per deployment/role.
  flagThreshold?: number
}

export function summarizeIntegrity(events: IntegrityEventRecord[], opts: SummaryOptions = {}): IntegritySummary {
  const threshold = opts.flagThreshold ?? 3

  const countsByType: Record<string, number> = {}
  for (const t of INTEGRITY_EVENT_TYPES) countsByType[t] = 0

  let weightedFlags = 0
  const normalized = events.map((e) => {
    const type = e.type
    countsByType[type] = (countsByType[type] ?? 0) + 1
    const confidence = typeof e.confidence === 'number' ? e.confidence : 1
    if (confidence >= MIN_CONFIDENCE) weightedFlags += HEAVY.has(type) ? 2 : 1
    return {
      type,
      label: INTEGRITY_LABELS[type as IntegrityEventType] ?? type,
      occurredAt: typeof e.occurredAt === 'string' ? e.occurredAt : e.occurredAt.toISOString(),
      durationMs: e.durationMs ?? null,
      confidence,
      detail: e.detail ?? null,
    }
  })

  return {
    totalEvents: events.length,
    totalFlags: weightedFlags,
    countsByType,
    reviewStatus: weightedFlags >= threshold ? 'FLAGGED_FOR_REVIEW' : 'CLEAN',
    events: normalized.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
    threshold,
  }
}
