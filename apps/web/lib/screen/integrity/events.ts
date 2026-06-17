// ── Integrity Layer Tier 1 — event vocabulary (Screen-scoped) ──────────────
// Shared between the browser capture client and the server store. NO raw video
// frames or images are part of this contract — only structured metadata.

export const INTEGRITY_EVENT_TYPES = [
  'gaze_away',          // face turned away beyond threshold for > N seconds
  'no_face',            // no face detected in frame for > N seconds
  'multiple_faces',     // a second person visible in frame
  'object_in_frame',    // conservative held-object/phone heuristic
  'tab_switch',         // visibilitychange → hidden
  'window_blur',        // window lost focus
  'screen_share_drop',  // an active screen-share track ended/interrupted
  'fullscreen_exit',    // candidate left fullscreen
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
}

// High-confidence events trigger the in-interview "noted for review" notice.
export const HIGH_CONFIDENCE_TYPES: ReadonlySet<IntegrityEventType> = new Set<IntegrityEventType>([
  'multiple_faces', 'object_in_frame', 'tab_switch', 'screen_share_drop',
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
  return { type: o.type, occurredAt, durationMs, confidence, detail }
}
