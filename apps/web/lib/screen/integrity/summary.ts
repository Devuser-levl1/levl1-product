import { IntegrityEventType, INTEGRITY_EVENT_TYPES, INTEGRITY_LABELS } from './events'

// ── Integrity summary + human-review routing (Screen-scoped, Build 01 + 02) ─
// Integrity is a SEPARATE axis from competency. This module never returns a
// score that feeds the candidate's assessment, and the only verdicts are
// CLEAN / FLAGGED_FOR_REVIEW — never an automatic disqualification.
//
// Build 02 folds the content-moat signals (AI-assist, latency, paste) into the
// same weighted model and adds a CO-OCCURRENCE escalation: isolated weak
// signals don't flag, but signals from different families landing close
// together do, with a combined, evidence-linked rationale.

export type ReviewStatus = 'CLEAN' | 'FLAGGED_FOR_REVIEW'

export interface IntegrityEventRecord {
  type: string
  occurredAt: Date | string
  durationMs?: number | null
  confidence?: number | null
  detail?: string | null
  meta?: unknown
}

export interface NormalizedEvent {
  type: string; label: string; occurredAt: string
  durationMs: number | null; confidence: number; detail: string | null; meta: unknown
}

export interface IntegritySummary {
  totalEvents: number
  totalFlags: number
  countsByType: Record<string, number>
  reviewStatus: ReviewStatus
  events: NormalizedEvent[]
  threshold: number
  // Co-occurring multi-family signal, when present (the high-confidence combined finding).
  combined: { detected: boolean; rationale: string | null; at: string | null }
}

// Signal weight when reasonably confident. Heavy = clearer integrity signals.
const HEAVY: ReadonlySet<string> = new Set([
  'multiple_faces', 'object_in_frame', 'tab_switch', 'screen_share_drop',
  'ai_assisted_answer', 'paste_anomaly', 'combined_anomaly', 'second_voice',
])
const MIN_CONFIDENCE = 0.6

// Families — co-occurrence ACROSS families is what escalates (not repeats of one).
const FAMILY: Record<string, 'camera' | 'focus' | 'content' | 'audio'> = {
  gaze_away: 'camera', no_face: 'camera', multiple_faces: 'camera', object_in_frame: 'camera',
  reading_gaze: 'camera',  // corroborating CV signal (anti-overlay)
  tab_switch: 'focus', window_blur: 'focus', screen_share_drop: 'focus', fullscreen_exit: 'focus',
  ai_assisted_answer: 'content', latency_anomaly: 'content', paste_anomaly: 'content', combined_anomaly: 'content',
  read_aloud_cadence: 'content',  // corroborating delivery signal (anti-overlay)
  second_voice: 'audio',
}
const CO_WINDOW_MS = 90_000

export interface SummaryOptions { flagThreshold?: number }

export function summarizeIntegrity(events: IntegrityEventRecord[], opts: SummaryOptions = {}): IntegritySummary {
  const threshold = opts.flagThreshold ?? 3

  const countsByType: Record<string, number> = {}
  for (const t of INTEGRITY_EVENT_TYPES) countsByType[t] = 0

  let weightedFlags = 0
  const normalized: NormalizedEvent[] = events.map((e) => {
    countsByType[e.type] = (countsByType[e.type] ?? 0) + 1
    const confidence = typeof e.confidence === 'number' ? e.confidence : 1
    if (confidence >= MIN_CONFIDENCE) weightedFlags += HEAVY.has(e.type) ? 2 : 1
    return {
      type: e.type,
      label: INTEGRITY_LABELS[e.type as IntegrityEventType] ?? e.type,
      occurredAt: typeof e.occurredAt === 'string' ? e.occurredAt : e.occurredAt.toISOString(),
      durationMs: e.durationMs ?? null,
      confidence,
      detail: e.detail ?? null,
      meta: e.meta ?? null,
    }
  }).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))

  // Co-occurrence: a sliding window containing confident signals from ≥2
  // different families is a stronger combined signal than any one alone.
  const combined = detectCoOccurrence(normalized)
  if (combined.detected) weightedFlags += 2

  return {
    totalEvents: events.length,
    totalFlags: weightedFlags,
    countsByType,
    reviewStatus: weightedFlags >= threshold ? 'FLAGGED_FOR_REVIEW' : 'CLEAN',
    events: normalized,
    threshold,
    combined,
  }
}

function detectCoOccurrence(events: NormalizedEvent[]): { detected: boolean; rationale: string | null; at: string | null } {
  const confident = events.filter((e) => e.confidence >= MIN_CONFIDENCE)
  for (let i = 0; i < confident.length; i++) {
    const start = Date.parse(confident[i].occurredAt)
    const window = confident.filter((e) => { const t = Date.parse(e.occurredAt); return t >= start && t - start <= CO_WINDOW_MS })
    const families = new Set(window.map((e) => FAMILY[e.type]).filter(Boolean))
    if (families.size >= 2) {
      const parts = window.map((e) => `${e.label} (${e.occurredAt.slice(11, 19)})`)
      return {
        detected: true,
        at: confident[i].occurredAt,
        rationale: `Multiple integrity signals from different categories co-occurred within ${CO_WINDOW_MS / 1000}s: ${parts.join('; ')}. Co-occurrence raises the combined likelihood and routes this session to human review.`,
      }
    }
  }
  return { detected: false, rationale: null, at: null }
}
