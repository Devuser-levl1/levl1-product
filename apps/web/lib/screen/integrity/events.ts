// ── Integrity Layer Tier 1 — event vocabulary (Screen-scoped) ──────────────
// Shared between the browser capture client and the server store. NO raw video
// frames or images are part of this contract — only structured metadata.

export const INTEGRITY_EVENT_TYPES = [
  // ── Tier 1 (Build 01) — visible proctoring ──
  'gaze_away',          // face turned away beyond threshold for > N seconds
  'no_face',            // no face detected in frame for > N seconds
  'multiple_faces',     // a second person visible in frame
  'object_in_frame',    // conservative held-object/phone heuristic
  'tab_switch',         // visibilitychange → hidden
  'window_blur',        // window lost focus
  'screen_share_drop',  // an active screen-share track ended/interrupted
  'fullscreen_exit',    // candidate left fullscreen
  // ── Tier 2 (Build 02) — content-analysis moat ──
  'ai_assisted_answer', // LLM-pattern / capability-jump in an answer
  'latency_anomaly',    // off-platform-lookup latency pattern
  'paste_anomaly',      // large pre-formed block pasted into the editor
  'combined_anomaly',   // co-occurring weak signals escalated together
  // ── Anti-overlay corroborating signals (Build 02-B) ──
  'reading_gaze',       // left↔right saccade signature consistent with reading on-screen text
  'read_aloud_cadence', // flat, disfluency-free delivery consistent with reading an answer aloud
  // ── Post-interview audio diarization (Scribe v2 batch) ──
  'second_voice',       // a second/whispering speaker detected in the recording
] as const

export type IntegrityEventType = (typeof INTEGRITY_EVENT_TYPES)[number]

// What a client emits / the server persists. `confidence` 0–1; `detail` is a
// short human-readable string a reviewer can audit alongside the timestamp.
export interface IntegrityEventInput {
  type: IntegrityEventType
  occurredAt: string      // ISO timestamp
  durationMs?: number
  confidence?: number
  detail?: string
  // Structured, evidence-linked metadata (Build 02): span, latencyMs, pasteSize,
  // rationale, correlatedWith. NEVER raw video frames or clipboard contents.
  meta?: Record<string, unknown>
}

const TYPE_SET = new Set<string>(INTEGRITY_EVENT_TYPES)

// Human-readable labels (the report's Integrity panel + live notices reuse these).
export const INTEGRITY_LABELS: Record<IntegrityEventType, string> = {
  gaze_away: 'Looking away from screen',
  no_face: 'Face not visible',
  multiple_faces: 'Multiple people in frame',
  object_in_frame: 'Possible phone / object in frame',
  tab_switch: 'Switched browser tab',
  window_blur: 'Left the interview window',
  screen_share_drop: 'Screen share stopped',
  fullscreen_exit: 'Exited fullscreen',
  ai_assisted_answer: 'Answer shows AI-assistance patterns',
  latency_anomaly: 'Unusual answer-timing pattern',
  paste_anomaly: 'Large block pasted into editor',
  combined_anomaly: 'Multiple integrity signals co-occurred',
  reading_gaze: 'Eye movement consistent with reading on-screen text',
  read_aloud_cadence: 'Delivery sounds read aloud rather than spontaneous',
  second_voice: 'A second voice was heard in the recording',
}

// High-confidence events trigger the in-interview "noted for review" notice.
export const HIGH_CONFIDENCE_TYPES: ReadonlySet<IntegrityEventType> = new Set<IntegrityEventType>([
  'multiple_faces', 'object_in_frame', 'tab_switch', 'screen_share_drop',
  'ai_assisted_answer', 'paste_anomaly', 'combined_anomaly',
])

export function isIntegrityEventType(v: unknown): v is IntegrityEventType {
  return typeof v === 'string' && TYPE_SET.has(v)
}

// Defensively normalize an untrusted client payload into a clean event, or null.
export function sanitizeEvent(raw: unknown): IntegrityEventInput | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (!isIntegrityEventType(o.type)) return null
  const occurredAt = typeof o.occurredAt === 'string' && !isNaN(Date.parse(o.occurredAt)) ? o.occurredAt : new Date().toISOString()
  const durationMs = typeof o.durationMs === 'number' && o.durationMs >= 0 ? Math.round(o.durationMs) : undefined
  const confidence = typeof o.confidence === 'number' ? Math.max(0, Math.min(1, o.confidence)) : 1
  const detail = typeof o.detail === 'string' ? o.detail.slice(0, 300) : undefined
  const meta = o.meta && typeof o.meta === 'object' ? (o.meta as Record<string, unknown>) : undefined
  return { type: o.type, occurredAt, durationMs, confidence, detail, meta }
}
